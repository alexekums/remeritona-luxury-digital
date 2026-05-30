function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchOrdersAndRequests(
  token: string,
  params?: { status?: string; type?: string; room?: string }
): Promise<{ success: boolean; items?: any[]; results?: any[]; error?: string }> {
  const res = await fetch("/api/orders-and-requests", {
    headers: {
      ...authHeaders(token),
      "X-Admin-Token": token,
    },
  });
  const data = await res.json();
  let items: any[] = data.results ?? data.items ?? [];

  if (params?.status) {
    items = items.filter((i) => i.status === params.status);
  }
  if (params?.type === "dining") {
    items = items.filter((i) => i.type === "dining");
  } else if (params?.type === "service") {
    items = items.filter((i) => i.type === "service");
  }
  if (params?.room) {
    items = items.filter((i) => String(i.room_number) === String(params.room));
  }

  return { ...data, success: res.ok, items, results: items };
}

export async function patchItemStatus(
  token: string,
  id: number | string,
  type: "dining" | "service",
  status: string
): Promise<{ success: boolean; item?: any; error?: string }> {
  const path =
    type === "dining"
      ? `/api/room-orders/${id}/status`
      : `/api/guest-requests/${id}/status`;
  const res = await fetch(path, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export function playNotificationPing() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio not available
  }
}
