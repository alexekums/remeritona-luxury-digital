import { formatNaira } from "@/data/rooms";

export const SPA_TIME_SLOTS = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
  "05:00 PM", "06:00 PM",
];

const SPA_STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  completed: 2,
  cancelled: 3,
};

export function sortSpaBookings(bookings: any[]): any[] {
  return [...bookings].sort((a, b) => {
    const sa = SPA_STATUS_ORDER[a.status] ?? 99;
    const sb = SPA_STATUS_ORDER[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    const dateCmp = String(a.preferred_date).localeCompare(String(b.preferred_date));
    if (dateCmp !== 0) return dateCmp;
    return String(a.preferred_time).localeCompare(String(b.preferred_time));
  });
}

export function getSpaBorderColor(status: string): string {
  switch (status) {
    case "pending": return "#c9a96e";
    case "confirmed": return "#22c55e";
    case "completed": return "#888";
    case "cancelled": return "#ef4444";
    default: return "#888";
  }
}

export function getSpaBadgeColor(status: string): string {
  return getSpaBorderColor(status);
}

export function formatSpaDateTime(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const datePart = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    return `${datePart} · ${timeStr}`;
  } catch {
    return `${dateStr} · ${timeStr}`;
  }
}

export function lookupSpaPrice(serviceName: string, menuItems: any[]): string {
  const match = menuItems.find(
    (m) => m.category === "Spa" && m.name === serviceName
  );
  if (!match?.price) return "See spa desk";
  return formatNaira(match.price);
}
