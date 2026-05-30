// Demo-only booking storage in localStorage. In production this would be a DB.

export type StoredBooking = {
  reference: string;
  createdAt: string; // ISO
  guest: { name: string; email: string; phone: string; notes: string };
  roomSlug: string;
  roomName: string;
  roomPrice: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  nights: number;
  numRooms: number;
  guests: number;
  addons: Array<{ id: string; label: string; price: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  gateway: "paystack" | "flutterwave";
  paymentMode: "pay_now" | "save_card";
  // For save_card flow
  tokenizationFee?: number;
  authorizationCode?: string | null;
  pendingBalance?: number;
  scheduledChargeAt?: string; // ISO — 24h before check-in
  amountCharged: number; // money actually paid so far
  status: "confirmed" | "cancelled" | "scheduled" | "checked_in" | "checked_out";
  cancellation?: {
    cancelledAt: string;
    refundPercent: 0 | 50 | 100;
    refundAmount: number;
  };
};

const KEY = "remeritona.bookings.v1";

export function loadBookings(): StoredBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredBooking[]) : [];
  } catch {
    return [];
  }
}

export function saveBooking(b: StoredBooking) {
  if (typeof window === "undefined") return;
  const all = loadBookings();
  const idx = all.findIndex((x) => x.reference === b.reference);
  if (idx >= 0) all[idx] = b;
  else all.push(b);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function findBooking(reference: string, email: string): StoredBooking | undefined {
  const ref = reference.trim().toUpperCase();
  const em = email.trim().toLowerCase();
  return loadBookings().find(
    (b) => b.reference.toUpperCase() === ref && b.guest.email.toLowerCase() === em,
  );
}

// Refund tier based on hours remaining until check-in.
export function refundPolicy(checkIn: string): { percent: 0 | 50 | 100; label: string } {
  const ms = new Date(checkIn).getTime() - Date.now();
  const hours = ms / 3_600_000;
  if (hours > 48) return { percent: 100, label: "Cancellation more than 48 hours before check-in — full refund." };
  if (hours > 24) return { percent: 50, label: "Cancellation 24–48 hours before check-in — 50% refund." };
  return { percent: 0, label: "Cancellation less than 24 hours before check-in — no refund." };
}

export function hoursUntilCheckIn(checkIn: string) {
  return (new Date(checkIn).getTime() - Date.now()) / 3_600_000;
}
