function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function fetchSpaBookings(token: string) {
  const res = await fetch("/api/spa-bookings", { headers: authHeaders(token) });
  return res.json() as Promise<{ success: boolean; bookings?: any[]; error?: string }>;
}

export async function patchSpaBookingStatus(
  token: string,
  id: string | number,
  body: { status: string; preferred_date?: string; preferred_time?: string }
) {
  const res = await fetch(`/api/spa-bookings/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ success: boolean; booking?: any; error?: string }>;
}
