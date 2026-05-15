import { createServerFn } from "@tanstack/react-start";
interface BookingData {
  reference: string;
  createdAt: string;
  guest: { name: string; email: string; phone: string; notes: string };
  roomSlug: string;
  roomName: string;
  roomPrice: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  numRooms: number;
  guests: number;
  addons: Array<{ id: string; label: string; price: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  gateway: string;
  paymentMode: string;
  status: string;
}

export const saveBookingToDb = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const data = ctx.data as unknown as BookingData;
    const env = (globalThis as any)[Symbol.for("cloudflare:env")] || (globalThis as any).env;
    const db = env?.remeritona_bookings;

    if (!db) {
      console.error("D1 database not available");
      return { success: false, error: "Database not available" };
    }

    try {
      await db.prepare(`
        INSERT INTO bookings (
          reference, created_at, guest_name, guest_email, guest_phone, guest_notes,
          room_slug, room_name, room_price, check_in, check_out, nights, num_rooms,
          guests, addons, subtotal, discount, tax, total, gateway, payment_mode, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        data.reference,
        data.createdAt,
        data.guest.name,
        data.guest.email,
        data.guest.phone,
        data.guest.notes || "",
        data.roomSlug,
        data.roomName,
        data.roomPrice,
        data.checkIn,
        data.checkOut,
        data.nights,
        data.numRooms,
        data.guests,
        JSON.stringify(data.addons),
        data.subtotal,
        data.discount,
        data.tax,
        data.total,
        data.gateway,
        data.paymentMode,
        data.status
      ).run();

      return { success: true };
    } catch (error) {
      console.error("Failed to save booking to D1:", error);
      return { success: false, error: String(error) };
    }
  });