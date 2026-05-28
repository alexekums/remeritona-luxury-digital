export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function formatOrderItemsSummary(items: unknown): string {
  if (!items) return "Room service order";
  let parsed = items;
  if (typeof items === "string") {
    try {
      parsed = JSON.parse(items);
    } catch {
      return items;
    }
  }
  if (Array.isArray(parsed)) {
    return parsed
      .map((i: Record<string, unknown>) => {
        const name = i.name ?? i.item ?? "Item";
        const qty = i.qty ?? i.quantity ?? 1;
        return `${name} x${qty}`;
      })
      .join(", ");
  }
  return String(items);
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "pending":
      return "#eab308";
    case "accepted":
      return "#3b82f6";
    case "preparing":
    case "in_progress":
      return "#f97316";
    case "delivered":
    case "completed":
    case "done":
      return "#22c55e";
    default:
      return "#888";
  }
}

export function getCardBorderColor(status: string): string {
  switch (status) {
    case "pending":
      return "#c9a96e";
    case "accepted":
      return "#3b82f6";
    case "preparing":
    case "in_progress":
      return "#f59e0b";
    case "delivered":
    case "completed":
    case "done":
      return "#22c55e";
    default:
      return "#888";
  }
}

const ORDER_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  delivered: 3,
  done: 4,
};

const REQUEST_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  completed: 3,
  done: 4,
};

export function sortByStatusPriority(
  items: any[],
  statusOrder: Record<string, number>
): any[] {
  return [...items].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function sortOrders(items: any[]) {
  return sortByStatusPriority(items, ORDER_STATUS_ORDER);
}

export function sortRequests(items: any[]) {
  return sortByStatusPriority(items, REQUEST_STATUS_ORDER);
}

export function getNextRoomOrderStatus(status: string): string | null {
  const flow: Record<string, string> = {
    pending: "accepted",
    accepted: "preparing",
    preparing: "delivered",
  };
  return flow[status] ?? null;
}

export function getNextGuestRequestStatus(status: string): string | null {
  const flow: Record<string, string> = {
    pending: "accepted",
    accepted: "in_progress",
    in_progress: "completed",
  };
  return flow[status] ?? null;
}

export function getRoomOrderActionLabel(status: string): string | null {
  const labels: Record<string, string> = {
    pending: "Accept Order",
    accepted: "Start Preparing",
    preparing: "Mark Delivered",
  };
  return labels[status] ?? null;
}

export function getGuestRequestActionLabel(status: string): string | null {
  const labels: Record<string, string> = {
    pending: "Accept Request",
    accepted: "Mark In Progress",
    in_progress: "Mark Completed",
  };
  return labels[status] ?? null;
}

export function getRequestSummary(req: any): string {
  const type = req.request_type ?? "Service";
  const notes = req.notes ?? req.details ?? req.description ?? "";
  return notes ? `${type} — ${notes}` : type;
}
