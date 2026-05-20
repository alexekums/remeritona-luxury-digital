import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const cfEnv = () => env as unknown as {
  remeritona_bookings: D1Database;
  ADMIN_PASSWORD: string;
  MAILERSEND_API_KEY: string;
};

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string; hotelId: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const staff = await db.prepare(
      `SELECT * FROM staff WHERE pin = ? AND hotel_id = ? LIMIT 1`
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
  .handler(async ({ data }): Promise<any> => {
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
      db.prepare(`SELECT * FROM room_status WHERE hotel_id = 'remeritona' ORDER BY room_number ASC`).all(),
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
  .inputValidator((data: { token: string; roomNumber: string; status: string; updatedBy: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };
    await db.prepare(
      `UPDATE room_status SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE room_number = ? AND hotel_id = 'remeritona'`
    ).bind(data.status, data.updatedBy, data.roomNumber).run();
    return { success: true };
  });

export const checkInGuest = createServerFn({ method: "POST" })
  .inputValidator((data: {
    token: string;
    reference: string;
    roomSlug: string;
    roomNumber: string;
    guestName: string;
    guestEmail: string;
    checkIn: string;
    checkOut: string;
  }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    // 1. Update booking status
    await db.prepare(
      `UPDATE bookings SET status = 'checked_in' WHERE reference = ?`
    ).bind(data.reference).run();

    // 2. Update room number status to occupied
    await db.prepare(
      `UPDATE room_status SET status = 'occupied', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
    ).bind(data.roomNumber).run();

    // 3. Auto-detect tier from room number
    const roomNum = parseInt(data.roomNumber);
    let tier = 1;
    let roomType = "classic";
    if (roomNum >= 413) { tier = 5; roomType = "executive-suites"; }
    else if (roomNum >= 401) { tier = 4; roomType = "business-suites"; }
    else if (roomNum >= 301) { tier = 3; roomType = "executive"; }
    else if (roomNum >= 201) { tier = 2; roomType = "superior"; }

    // 4. Create or update guest portal access
    const existing = await db.prepare(
      `SELECT id FROM guests WHERE booking_ref = ? LIMIT 1`
    ).bind(data.reference).first() as any;

    if (!existing) {
      await db.prepare(
        `INSERT INTO guests (booking_ref, room_number, room_type, full_name, guest_email, check_in, check_out, tier, hotel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'remeritona')`
      ).bind(data.reference, data.roomNumber, roomType, data.guestName, data.guestEmail, data.checkIn, data.checkOut, tier).run();
    } else {
      await db.prepare(
        `UPDATE guests SET room_number = ?, room_type = ?, tier = ? WHERE booking_ref = ?`
      ).bind(data.roomNumber, roomType, tier, data.reference).run();
    }

    // 5. Send welcome email
    const apiKey = cfEnv().MAILERSEND_API_KEY;
    if (apiKey && data.guestEmail) {
      const portalUrl = "https://remeritona-guest-portal.remeritona.workers.dev";
      const roomTypeLabel = roomType.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
      const welcomeHtml = [
        '<div style="background:#0a0a0a;color:#e8e0d0;font-family:Georgia,serif;padding:40px;max-width:600px;margin:0 auto;">',
        '<h1 style="color:#c9a96e;font-size:24px;font-weight:400;letter-spacing:4px;text-align:center;">REMERITONA</h1>',
        '<p style="color:#888;text-align:center;font-size:12px;letter-spacing:2px;">HOTEL & SUITES</p>',
        '<hr style="border-color:#2a2a2a;margin:24px 0;" />',
        '<h2 style="font-size:20px;font-weight:400;">Welcome, ' + data.guestName.split(" ")[0] + '!</h2>',
        '<p style="color:#aaa;line-height:1.7;">Your room is ready. Access your personal guest portal for room service, dining, spa bookings, and more.</p>',
        '<div style="background:#141414;border:1px solid #2a2a2a;padding:24px;margin:24px 0;border-radius:8px;">',
        '<p style="margin:0 0 8px;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Your Room</p>',
        '<p style="margin:0;font-size:28px;color:#c9a96e;">Room ' + data.roomNumber + '</p>',
        '<p style="margin:8px 0 0;color:#888;font-size:13px;">' + roomTypeLabel + '</p>',
        '</div>',
        '<div style="background:#141414;border:1px solid #2a2a2a;padding:24px;margin:24px 0;border-radius:8px;">',
        '<p style="margin:0 0 16px;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Portal Login Details</p>',
        '<p style="margin:0 0 8px;font-size:13px;color:#aaa;">Room Number: <span style="color:#c9a96e;font-weight:bold;">' + data.roomNumber + '</span></p>',
        '<p style="margin:0;font-size:13px;color:#aaa;">Booking Reference: <span style="color:#c9a96e;font-weight:bold;">' + data.reference + '</span></p>',
        '</div>',
        '<a href="' + portalUrl + '" style="display:block;background:#c9a96e;color:#0a0a0a;text-align:center;padding:14px;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;text-decoration:none;margin:24px 0;">Access Your Room Portal</a>',
        '<p style="color:#555;font-size:12px;text-align:center;">Check-in: ' + data.checkIn + ' &nbsp;·&nbsp; Check-out: ' + data.checkOut + '</p>',
        '</div>',
      ].join("");

      try {
        await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({
            from: { email: "booking@test-zxk54v85kdxljy6v.mlsender.net", name: "Remeritona Hotel" },
            to: [{ email: data.guestEmail, name: data.guestName }],
            subject: "Welcome to Remeritona — Room " + data.roomNumber + " is Ready",
            html: welcomeHtml,
          }),
        });
      } catch (e) {
        console.error("Welcome email failed:", e);
      }
    }

    return { success: true, tier, roomType };
  });

export const checkOutGuest = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reference: string; roomSlug: string; roomNumber?: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE bookings SET status = 'checked_out' WHERE reference = ?`
    ).bind(data.reference).run();

    if (data.roomNumber) {
      await db.prepare(
        `UPDATE room_status SET status = 'vacant_dirty', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(data.roomNumber).run();
    } else {
      await db.prepare(
        `UPDATE room_status SET status = 'vacant_dirty', updated_at = datetime('now') WHERE room_slug = ? AND hotel_id = 'remeritona'`
      ).bind(data.roomSlug).run();
    }

    return { success: true };
  });