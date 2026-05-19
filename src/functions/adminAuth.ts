import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const cfEnv = () => env as unknown as {
  remeritona_bookings: D1Database;
  ADMIN_PASSWORD: string;
};

export interface AdminStats {
  todayCheckIns: any[];
  todayCheckOuts: any[];
  allBookings: any[];
  roomStatuses: any[];
  monthlyRevenue: number;
  totalBookings: number;
  occupiedRooms: number;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; hotelId: string }) => data)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const staff = await db.prepare(
      `SELECT * FROM staff WHERE pin = ? AND hotel_id = ? AND role = 'manager' LIMIT 1`
    ).bind(data.pin, data.hotelId).first() as any;

    if (!staff) return { success: false, error: "Invalid PIN" };

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    await db.prepare(
      `INSERT INTO admin_sessions (token, hotel_id, staff_id, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), ?)`
    ).bind(token, data.hotelId, staff.id, expiresAt).run();

    await db.prepare(
      `UPDATE staff SET last_login = datetime('now') WHERE id = ?`
    ).bind(staff.id).run();

    return { success: true, token, name: staff.name, role: staff.role };
  });

export const verifySession = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { valid: false };
    return { valid: true, hotelId: session.hotel_id };
  });

export const getDashboardStats = createServerFn({ method: "POST" })
  // @ts-ignore
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    const today = new Date().toISOString().split("T")[0];

    const [checkIns, checkOuts, allBookings, roomStatuses, revenueResult] = await Promise.all([
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_in = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_out = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' ORDER BY created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT * FROM room_status WHERE hotel_id = 'remeritona' ORDER BY room_name ASC`).all(),
      db.prepare(`SELECT SUM(total) as revenue FROM bookings WHERE hotel_id = 'remeritona' AND status = 'confirmed' AND created_at >= date('now', 'start of month')`).first(),
    ]);

    return {
      success: true,
      todayCheckIns: checkIns.results,
      todayCheckOuts: checkOuts.results,
      allBookings: allBookings.results,
      roomStatuses: roomStatuses.results,
      monthlyRevenue: (revenueResult as any)?.revenue ?? 0,
    };
  });

export const updateRoomStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; roomSlug: string; status: string; updatedBy: string }) => data)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE room_status SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE room_slug = ? AND hotel_id = 'remeritona'`
    ).bind(data.status, data.updatedBy, data.roomSlug).run();

    return { success: true };
  });

export const checkInGuest = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reference: string; roomSlug: string }) => data)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE bookings SET status = 'checked_in' WHERE reference = ?`
    ).bind(data.reference).run();

    await db.prepare(
      `UPDATE room_status SET status = 'occupied', updated_at = datetime('now') WHERE room_slug = ? AND hotel_id = 'remeritona'`
    ).bind(data.roomSlug).run();

    return { success: true };
  });

export const checkOutGuest = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reference: string; roomSlug: string }) => data)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE bookings SET status = 'checked_out' WHERE reference = ?`
    ).bind(data.reference).run();

    await db.prepare(
      `UPDATE room_status SET status = 'vacant_dirty', updated_at = datetime('now') WHERE room_slug = ? AND hotel_id = 'remeritona'`
    ).bind(data.roomSlug).run();

    return { success: true };
  });