import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const cfEnv = () => env as unknown as {
  remeritona_bookings: D1Database;
  ADMIN_PASSWORD: string;
  MAILERSEND_API_KEY: string;
};

const LOYALTY_TIER_MULTIPLIER: Record<number, number> = { 1: 1, 2: 1.5, 3: 2, 4: 2.5, 5: 3 };

export const ROOM_TIER_MAP: Record<string, { tier: number; roomType: string }> = {
  // Classic → Tier 1
  '102': { tier: 1, roomType: 'classic' }, '104': { tier: 1, roomType: 'classic' },
  '105': { tier: 1, roomType: 'classic' }, '107': { tier: 1, roomType: 'classic' },
  '108': { tier: 1, roomType: 'classic' }, '111': { tier: 1, roomType: 'classic' },
  '113': { tier: 1, roomType: 'classic' }, '117': { tier: 1, roomType: 'classic' },
  '118': { tier: 1, roomType: 'classic' }, '119': { tier: 1, roomType: 'classic' },
  '121': { tier: 1, roomType: 'classic' }, '204': { tier: 1, roomType: 'classic' },
  '207': { tier: 1, roomType: 'classic' }, '208': { tier: 1, roomType: 'classic' },
  '209': { tier: 1, roomType: 'classic' }, '213': { tier: 1, roomType: 'classic' },
  '217': { tier: 1, roomType: 'classic' }, '219': { tier: 1, roomType: 'classic' },
  '221': { tier: 1, roomType: 'classic' }, '308': { tier: 1, roomType: 'classic' },
  '309': { tier: 1, roomType: 'classic' }, '310': { tier: 1, roomType: 'classic' },
  '402': { tier: 1, roomType: 'classic' },
  // Superior → Tier 2
  '101': { tier: 2, roomType: 'superior' }, '103': { tier: 2, roomType: 'superior' },
  '109': { tier: 2, roomType: 'superior' }, '115': { tier: 2, roomType: 'superior' },
  '120': { tier: 2, roomType: 'superior' }, '122': { tier: 2, roomType: 'superior' },
  '123': { tier: 2, roomType: 'superior' }, '124': { tier: 2, roomType: 'superior' },
  '202': { tier: 2, roomType: 'superior' }, '203': { tier: 2, roomType: 'superior' },
  '205': { tier: 2, roomType: 'superior' }, '206': { tier: 2, roomType: 'superior' },
  '211': { tier: 2, roomType: 'superior' }, '215': { tier: 2, roomType: 'superior' },
  '218': { tier: 2, roomType: 'superior' }, '220': { tier: 2, roomType: 'superior' },
  '222': { tier: 2, roomType: 'superior' }, '223': { tier: 2, roomType: 'superior' },
  '224': { tier: 2, roomType: 'superior' }, '225': { tier: 2, roomType: 'superior' },
  '226': { tier: 2, roomType: 'superior' }, '261': { tier: 2, roomType: 'superior' },
  '301': { tier: 2, roomType: 'superior' }, '302': { tier: 2, roomType: 'superior' },
  '303': { tier: 2, roomType: 'superior' }, '305': { tier: 2, roomType: 'superior' },
  '306': { tier: 2, roomType: 'superior' }, '311': { tier: 2, roomType: 'superior' },
  '312': { tier: 2, roomType: 'superior' }, '315': { tier: 2, roomType: 'superior' },
  '317': { tier: 2, roomType: 'superior' }, '319': { tier: 2, roomType: 'superior' },
  '321': { tier: 2, roomType: 'superior' }, '322': { tier: 2, roomType: 'superior' },
  '323': { tier: 2, roomType: 'superior' }, '324': { tier: 2, roomType: 'superior' },
  '325': { tier: 2, roomType: 'superior' }, '326': { tier: 2, roomType: 'superior' },
  '401': { tier: 2, roomType: 'superior' }, '403': { tier: 2, roomType: 'superior' },
  // Executive → Tier 3
  '106': { tier: 3, roomType: 'executive' }, '110': { tier: 3, roomType: 'executive' },
  '112': { tier: 3, roomType: 'executive' }, '114': { tier: 3, roomType: 'executive' },
  '116': { tier: 3, roomType: 'executive' }, '210': { tier: 3, roomType: 'executive' },
  '212': { tier: 3, roomType: 'executive' }, '214': { tier: 3, roomType: 'executive' },
  '216': { tier: 3, roomType: 'executive' }, '304': { tier: 3, roomType: 'executive' },
  '314': { tier: 3, roomType: 'executive' }, '316': { tier: 3, roomType: 'executive' },
  '318': { tier: 3, roomType: 'executive' }, '327': { tier: 3, roomType: 'executive' },
  '328': { tier: 3, roomType: 'executive' },
  // Executive/Twin → Tier 3
  '405': { tier: 3, roomType: 'executive' }, '417': { tier: 3, roomType: 'executive' },
  '418': { tier: 3, roomType: 'executive' },
  // Business Suites → Tier 4
  '307': { tier: 4, roomType: 'business-suites' }, '313': { tier: 4, roomType: 'business-suites' },
  '320': { tier: 4, roomType: 'business-suites' }, '407': { tier: 4, roomType: 'business-suites' },
  '408': { tier: 4, roomType: 'business-suites' }, '409': { tier: 4, roomType: 'business-suites' },
  '411': { tier: 4, roomType: 'business-suites' }, '412': { tier: 4, roomType: 'business-suites' },
  '413': { tier: 4, roomType: 'business-suites' }, '415': { tier: 4, roomType: 'business-suites' },
  '416': { tier: 4, roomType: 'business-suites' },
  // Executive Suites → Tier 5
  '404': { tier: 5, roomType: 'executive-suites' }, '406': { tier: 5, roomType: 'executive-suites' },
  '410': { tier: 5, roomType: 'executive-suites' }, '414': { tier: 5, roomType: 'executive-suites' },
};

export function getRoomType(roomNumber: any, roomName?: string): string | null {
  const roomKey = String(roomNumber ?? "").trim();

  // 1. Explicit Executive Suites rooms (Floor 4 premium rooms)
  if (["404", "406", "410", "414"].includes(roomKey)) {
    return "executive-suites";
  }

  // 2. Explicit Business Suites rooms (Floor 3-4 premium rooms)
  if (["307", "313", "320", "407", "408", "409", "411", "412", "413", "415", "416"].includes(roomKey)) {
    return "business-suites";
  }

  // 3. Comprehensive lookup in ROOM_TIER_MAP (covers all other rooms)
  const info = ROOM_TIER_MAP[roomKey];
  if (info) {
    // Ensure the roomType matches our exact keys
    const normalizedType = info.roomType;
    if (["classic", "superior", "executive", "business-suites", "executive-suites"].includes(normalizedType)) {
      return normalizedType;
    }
  }

  // 4. Fallback to room name parsing (last resort)
  const name = String(roomName ?? "").toLowerCase().trim();
  if (name?.includes("executive suite") || name?.includes("executive-suite")) {
    return "executive-suites";
  }
  if (name?.includes("business suite") || name?.includes("business-suite")) {
    return "business-suites";
  }
  if (name?.includes("executive")) {
    return "executive";
  }
  if (name?.includes("superior")) {
    return "superior";
  }
  if (name?.includes("classic")) {
    return "classic";
  }

  return null;
}

async function ensureGuestPortalAccessTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS guest_portal_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id TEXT NOT NULL DEFAULT 'remeritona',
      booking_ref TEXT NOT NULL,
      room_number TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}

async function ensureGuestsBookingRoomIndex(db: D1Database) {
  await db.prepare(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_booking_room ON guests(booking_ref, room_number)`
  ).run();
}

async function replaceGuestRow(
  db: D1Database,
  row: {
    bookingRef: string;
    roomNumber: string;
    fullName: string;
    roomType: string;
    tier: number;
    checkIn: string;
    checkOut: string;
    loyaltyPoints?: number;
  }
) {
  await db.prepare(`
    INSERT OR REPLACE INTO guests (
      hotel_id, room_number, booking_ref, full_name, room_type, tier,
      loyalty_points, check_in, check_out, pin
    ) VALUES ('remeritona', ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).bind(
    row.roomNumber,
    row.bookingRef,
    row.fullName,
    row.roomType,
    row.tier,
    row.loyaltyPoints ?? 0,
    row.checkIn,
    row.checkOut
  ).run();
}

async function upsertGuestPortalAccess(
  db: D1Database,
  bookingRef: string,
  roomNumber: string,
  token: string
) {
  const existing = await db.prepare(
    `SELECT id FROM guest_portal_access WHERE booking_ref = ? AND room_number = ? LIMIT 1`
  ).bind(bookingRef, roomNumber).first() as any;

  if (existing) {
    await db.prepare(
      `UPDATE guest_portal_access SET token = ? WHERE booking_ref = ? AND room_number = ?`
    ).bind(token, bookingRef, roomNumber).run();
  } else {
    await db.prepare(
      `INSERT INTO guest_portal_access (hotel_id, booking_ref, room_number, token) VALUES ('remeritona', ?, ?, ?)`
    ).bind(bookingRef, roomNumber, token).run();
  }
}

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

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export const registerStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string; fullName: string; role: 'front-desk' | 'accountant' | 'manager' | 'admin' | 'kitchen' | 'housekeeping' | 'spa' }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Check if username already exists
    const existing = await db.prepare(
      `SELECT id FROM staff_users WHERE username = ? LIMIT 1`
    ).bind(data.username).first() as any;
    if (existing) return { success: false, error: "Username already exists" };

    // Hash the password
    const passwordHash = await hashPassword(data.password);

    // Insert new staff user with is_approved = 1 (auto-approved)
    await db.prepare(
      `INSERT INTO staff_users (username, password_hash, full_name, role, is_approved, created_at) VALUES (?, ?, ?, ?, 1, datetime('now'))`
    ).bind(data.username, passwordHash, data.fullName, data.role).run();

    return { success: true };
  });

export const loginStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Find staff user by username
    const staff = await db.prepare(
      `SELECT * FROM staff_users WHERE username = ? LIMIT 1`
    ).bind(data.username).first() as any;
    if (!staff) return { success: false, error: "Invalid credentials" };

    // Verify password
    const passwordHash = await hashPassword(data.password);
    if (passwordHash !== staff.password_hash) {
      return { success: false, error: "Invalid credentials" };
    }

    // Check if account is approved
    if (staff.is_approved !== 1) {
      return { success: false, error: "Your account is awaiting manager approval" };
    }

    // Create session token (store in database for validation)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

    // Store session in admin_sessions table with NULL staff_id to bypass foreign key constraint
    await db.prepare(
      `INSERT INTO admin_sessions (token, hotel_id, staff_id, staff_username, created_at, expires_at) VALUES (?, 'remeritona', NULL, ?, datetime('now'), ?)`
    ).bind(token, staff.username, expiresAt).run();

    // Update last login timestamp
    await db.prepare(
      `UPDATE staff SET last_login = datetime('now') WHERE id = ?`
    ).bind(staff.id).run();

    // Return session object directly to frontend
    return {
      success: true,
      token,
      session: {
        id: staff.id,
        username: staff.username,
        fullName: staff.full_name,
        role: staff.role,
        expiresAt
      }
    };
  });

export const getPendingStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; userRole: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Get pending staff with hierarchy filtering
    let query = `SELECT id, username, full_name, role, created_at FROM staff_users WHERE is_approved = 0`;
    const params: any[] = [];

    // Hierarchy rule: Manager can only see front-desk, accountant, kitchen, housekeeping, spa, Admin can see all
    if (data.userRole === "manager") {
      query += ` AND role IN ('front-desk', 'accountant', 'kitchen', 'housekeeping', 'spa')`;
    }

    query += ` ORDER BY created_at DESC`;

    const pending = await db.prepare(query).bind(...params).all();

    return { success: true, pending: pending.results ?? [] };
  });

export const approveStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; staffId: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Approve staff member
    await db.prepare(
      `UPDATE staff_users SET is_approved = 1 WHERE id = ?`
    ).bind(data.staffId).run();

    return { success: true };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    const db = cfEnv().remeritona_bookings;
    const hashed = await hashPassword(data.newPassword);
    await db.prepare(
      `UPDATE staff_users SET password_hash = ? WHERE username = ?`
    ).bind(hashed, data.username).run();
    return { ok: true, hash: hashed };
  });

export const getStaffList = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };
    const staff = await db.prepare(
      `SELECT id, full_name, username, role, created_at FROM staff_users WHERE is_approved = 1 ORDER BY created_at DESC`
    ).all();
    return { success: true, staff: staff.results ?? [] };
  });

export const getStaffActivity = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; staffName: string; date: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };
    const activities = await db.prepare(
      `SELECT reference, guest_name, room_number, checked_in_by, checked_out_by, created_at 
       FROM bookings 
       WHERE (checked_in_by = ? OR checked_out_by = ?) AND DATE(created_at) = ?
       ORDER BY created_at ASC`
    ).bind(data.staffName, data.staffName, data.date).all();

    const activityList = (activities.results ?? []).map((a: any) => ({
      type: a.checked_in_by === data.staffName ? "check-in" : "check-out",
      guest_name: a.guest_name,
      room_number: a.room_number,
      reference: a.reference,
      timestamp: a.created_at,
    }));

    const firstAction = activityList[0]?.timestamp || null;
    const lastAction = activityList[activityList.length - 1]?.timestamp || null;
    const totalCount = activityList.length;

    return {
      success: true,
      activities: activityList,
      firstAction,
      lastAction,
      totalCount,
    };
  });

async function validateToken(token: string, db: any): Promise<{ type: "admin" | "staff"; staff?: any } | null> {
  // Try admin_sessions table (both old PIN-based system and new staff login)
  const session = await db.prepare(
    `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
  ).bind(token).first() as any;
  if (session) {
    // Fetch staff info from staff_users table - check staff_username first, then staff_id fallback
    let staff = null;
    if (session.staff_username) {
      staff = await db.prepare(
        `SELECT id, username, full_name, role FROM staff_users WHERE username = ? LIMIT 1`
      ).bind(session.staff_username).first() as any;
    }
    // If staff_username lookup fails, try staff_id fallback
    if (!staff && session.staff_id) {
      staff = await db.prepare(
        `SELECT id, username, full_name, role FROM staff_users WHERE id = ? LIMIT 1`
      ).bind(session.staff_id).first() as any;
    }
    if (!staff) return null;
    return { type: "staff", staff };
  }

  // If not found in admin_sessions, token is invalid
  return null;
}

export const verifySession = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { valid: false };
    return { valid: true, type: auth.type, staff: auth.staff };
  });

export const getDashboardStats = createServerFn({ method: "POST" })
  // @ts-ignore
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };
    const today = new Date().toISOString().split("T")[0];
    const [checkIns, checkOuts, allBookings, roomStatuses, revenueResult, returningGuests, pendingRequests, pendingOrders, missedArrivals, recentRoomActivity] = await Promise.all([
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_in = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_out = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' ORDER BY created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT * FROM room_status WHERE hotel_id = 'remeritona' ORDER BY CAST(room_number AS INTEGER) ASC`).all(),
      db.prepare(`SELECT SUM(total) as revenue FROM bookings WHERE hotel_id = 'remeritona' AND status IN ('confirmed','checked_in','checked_out') AND created_at >= date('now', 'start of month')`).first(),
      db.prepare(`SELECT guest_email, guest_name, COUNT(*) as visit_count, SUM(total) as total_spent, MAX(created_at) as last_visit FROM bookings WHERE hotel_id = 'remeritona' AND status != 'cancelled' GROUP BY guest_email HAVING visit_count > 1 ORDER BY visit_count DESC LIMIT 20`).all(),
      db.prepare(`SELECT * FROM guest_requests WHERE status = 'pending' AND hotel_id = 'remeritona' ORDER BY created_at DESC`).all(),
      db.prepare(`SELECT * FROM room_orders WHERE status = 'pending' AND hotel_id = 'remeritona' ORDER BY created_at DESC`).all(),
      db.prepare(`
        SELECT * FROM bookings
        WHERE hotel_id = 'remeritona'
          AND status = 'confirmed'
          AND date(check_in) < date(?)
        ORDER BY check_in ASC
        LIMIT 50
      `).bind(today).all(),
      db.prepare(`
        SELECT room_number, room_name, status, updated_at, updated_by
        FROM room_status
        WHERE hotel_id = 'remeritona' AND updated_at IS NOT NULL
        ORDER BY datetime(updated_at) DESC
        LIMIT 25
      `).all(),
    ]);
    return {
      success: true,
      todayCheckIns: checkIns.results,
      todayCheckOuts: checkOuts.results,
      allBookings: allBookings.results,
      roomStatuses: roomStatuses.results,
      monthlyRevenue: (revenueResult as any)?.revenue ?? 0,
      returningGuests: returningGuests.results ?? [],
      pendingRequests: pendingRequests.results ?? [],
      pendingOrders: pendingOrders.results ?? [],
      missedArrivals: missedArrivals.results ?? [],
      recentRoomActivity: recentRoomActivity.results ?? [],
    };
  });

export const getActiveBookingForRoom = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; roomNumber: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE room_number = ? AND status = 'checked_in' LIMIT 1`
    ).bind(data.roomNumber).first() as any;

    return { success: true, booking: booking ?? null };
  });

export const updateRoomStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; roomNumber: string; status: string; updatedBy: string; force?: boolean; reserved_for?: string; reserved_until?: string; reserved_ref?: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    // Block changing occupied room to vacant/dirty without going through checkout
    if (!data.force && (data.status === 'vacant_clean' || data.status === 'vacant_dirty')) {
      const current = await db.prepare(
        `SELECT status FROM room_status WHERE room_number = ? AND hotel_id = 'remeritona' LIMIT 1`
      ).bind(data.roomNumber).first() as any;
      if (current?.status === 'occupied') {
        return { success: false, error: 'OCCUPIED_PROTECTION', message: 'This room has a guest checked in. Use Check Out to free the room.' };
      }
    }

    // Build update query based on provided fields
    if (data.status === 'reserved' && data.reserved_for && data.reserved_until) {
      await db.prepare(
        `UPDATE room_status SET status = ?, updated_at = datetime('now'), updated_by = ?, reserved_for = ?, reserved_until = ?, reserved_ref = ? WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(data.status, data.updatedBy, data.reserved_for, data.reserved_until, data.reserved_ref || null, data.roomNumber).run();
    } else if (data.status !== 'reserved') {
      // Clear reservation fields when changing to non-reserved status
      await db.prepare(
        `UPDATE room_status SET status = ?, updated_at = datetime('now'), updated_by = ?, reserved_for = NULL, reserved_until = NULL, reserved_ref = NULL WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(data.status, data.updatedBy, data.roomNumber).run();
    } else {
      await db.prepare(
        `UPDATE room_status SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(data.status, data.updatedBy, data.roomNumber).run();
    }
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
    additionalRooms?: string[];
    checkedInBy?: string;
  }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    await ensureGuestPortalAccessTable(db);
    await ensureGuestsBookingRoomIndex(db);

    // 1. Get original booking to detect early check-in and continuation check-ins
    const originalBooking = await db.prepare(
      `SELECT * FROM bookings WHERE reference = ? LIMIT 1`
    ).bind(data.reference).first() as any;
    const wasAlreadyCheckedIn = originalBooking?.status === "checked_in";

    const isEarlyCheckIn = originalBooking && data.checkIn < (originalBooking.check_in ?? "").split("T")[0];

    // 2. Update booking: status, check_in (backdated if early), room_number, early_checkin flag, checked_in_by
    await db.prepare(
      `UPDATE bookings SET status = 'checked_in', check_in = ?, room_number = ?, early_checkin = ?, checked_in_by = ? WHERE reference = ?`
    ).bind(data.checkIn, data.roomNumber, isEarlyCheckIn ? 1 : 0, data.checkedInBy ?? "", data.reference).run();

    // 3. Update room status to occupied
    await db.prepare(
      `UPDATE room_status SET status = 'occupied', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
    ).bind(data.roomNumber).run();

    // 4. Auto-detect tier from actual room number (explicit lookup map)
    const tierInfo = ROOM_TIER_MAP[data.roomNumber] ?? { tier: 1, roomType: 'classic' };
    const tier = tierInfo.tier;
    const roomType = tierInfo.roomType;
    const fullName = originalBooking?.guest_name ?? data.guestName ?? "";
    const effectiveCheckInDate = (data.checkIn ?? "").split("T")[0];
    const checkOutDate = (data.checkOut ?? originalBooking?.check_out ?? "").split("T")[0];

    // 5. Primary guest row + portal access (room number + booking ref login)
    await replaceGuestRow(db, {
      bookingRef: data.reference,
      roomNumber: data.roomNumber,
      fullName,
      roomType,
      tier,
      checkIn: effectiveCheckInDate,
      checkOut: checkOutDate,
      loyaltyPoints: 0,
    });

    const primaryPortalToken = `${data.reference}:${data.roomNumber}`;
    await upsertGuestPortalAccess(db, data.reference, data.roomNumber, primaryPortalToken);

    // Loyalty points — once per booking on first check-in call only
    let loyaltyAwarded = false;
    let loyaltyPoints = 0;
    const shouldAwardLoyalty = !wasAlreadyCheckedIn && !data.additionalRooms?.length;
    if (shouldAwardLoyalty) {
      const primaryGuest = await db.prepare(
        `SELECT id, tier FROM guests WHERE booking_ref = ? AND room_number = ? LIMIT 1`
      ).bind(data.reference, data.roomNumber).first() as any;
      const bookingTotal = Number(originalBooking?.total ?? 0);
      const mult = LOYALTY_TIER_MULTIPLIER[primaryGuest?.tier ?? tier] ?? 1;
      loyaltyPoints = Math.floor((bookingTotal / 1000) * mult);
      if (primaryGuest && loyaltyPoints > 0) {
        await db.prepare(
          `UPDATE guests SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?`
        ).bind(loyaltyPoints, primaryGuest.id).run();
        loyaltyAwarded = true;
      }
    }

    // 6. Additional rooms for multi-room bookings
    if (data.additionalRooms?.length) {
      const nameParts = fullName.trim().split(" ");
      const surname = nameParts[nameParts.length - 1] ?? "";
      const otherNames = nameParts.slice(0, -1).join(" ");
      const tariff = originalBooking?.total
        ? `₦${Number(originalBooking.total).toLocaleString()}`
        : "";
      const guestEmail = data.guestEmail || (originalBooking?.guest_email ?? "");
      const guestPhone = originalBooking?.guest_phone ?? "";

      for (const roomNum of data.additionalRooms) {
        await db.prepare(
          `UPDATE room_status SET status = 'occupied', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
        ).bind(roomNum).run();

        const extraTier = ROOM_TIER_MAP[roomNum] ?? { tier: 1, roomType: "classic" };
        await replaceGuestRow(db, {
          bookingRef: data.reference,
          roomNumber: roomNum,
          fullName,
          roomType: extraTier.roomType,
          tier: extraTier.tier,
          checkIn: effectiveCheckInDate,
          checkOut: checkOutDate,
          loyaltyPoints: 0,
        });

        await upsertGuestPortalAccess(db, data.reference, roomNum, crypto.randomUUID());

        const existingReg = await db.prepare(
          `SELECT id FROM guest_registrations WHERE booking_ref = ? AND room_number = ? LIMIT 1`
        ).bind(data.reference, roomNum).first() as any;

        if (!existingReg) {
          await db.prepare(`
            INSERT INTO guest_registrations (
              hotel_id, booking_ref, room_number, room_type, tariff, arrival, departure,
              surname, other_names, residential_address, state, company_address, occupation,
              email, address, purpose, tel, nationality, passport_no, date_issued,
              visa_permit_no, next_of_kin, next_of_kin_phone, car_reg, receptionist,
              billing_instruction, signature_obtained
            ) VALUES ('remeritona',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)
          `).bind(
            data.reference, roomNum, extraTier.roomType, tariff, effectiveCheckInDate, checkOutDate,
            surname, otherNames, "", "", "", "", guestEmail, "", "Leisure", guestPhone,
            "Nigerian", "", "", "", "", "", "", "",
            "Room Only"
          ).run();
        }
      }
    }

    // 7. Send welcome email (first check-in only)
    const apiKey = cfEnv().MAILERSEND_API_KEY;
    if (!wasAlreadyCheckedIn && apiKey && data.guestEmail) {
      const portalUrl = "https://remeritona-guest-portal.remeritona.workers.dev";
      const roomTypeLabel = roomType.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
      const earlyNote = isEarlyCheckIn ? '<p style="color:#f59e0b;font-size:12px;text-align:center;margin:0;">Early check-in — original date adjusted</p>' : '';
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
        earlyNote,
        '<a href="' + portalUrl + '" style="display:block;background:#c9a96e;color:#0a0a0a;text-align:center;padding:14px;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:bold;text-decoration:none;margin:24px 0;">Access Your Room Portal</a>',
        '<p style="color:#555;font-size:12px;text-align:center;">Check-in: ' + data.checkIn + ' &nbsp;·&nbsp; Check-out: ' + data.checkOut + '</p>',
        '</div>',
      ].join("");

      try {
        await fetch("https://api.mailersend.com/v1/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({
            from: { email: "booking@remeritonahotel.com", name: "Remeritona Hotel" },
            to: [{ email: data.guestEmail, name: data.guestName }],
            subject: "Welcome to Remeritona — Room " + data.roomNumber + " is Ready",
            html: welcomeHtml,
          }),
        });
      } catch (e) {
        console.error("Welcome email failed:", e);
      }
    }

    return { success: true, tier, roomType, loyaltyAwarded, loyaltyPoints };
  });

export const checkOutGuest = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reference: string; roomSlug: string; roomNumber?: string; checkedOutBy?: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    // Look up room_number from bookings first (stored at check-in), then guests table as fallback
    let roomNumber = data.roomNumber;
    if (!roomNumber) {
      const booking = await db.prepare(
        `SELECT room_number FROM bookings WHERE reference = ? LIMIT 1`
      ).bind(data.reference).first() as any;
      roomNumber = booking?.room_number;
    }
    if (!roomNumber) {
      const guest = await db.prepare(
        `SELECT room_number FROM guests WHERE booking_ref = ? LIMIT 1`
      ).bind(data.reference).first() as any;
      roomNumber = guest?.room_number;
    }

    // Update booking status and checked_out_by
    await db.prepare(
      `UPDATE bookings SET status = 'checked_out', checked_out_by = ? WHERE reference = ?`
    ).bind(data.checkedOutBy ?? "", data.reference).run();

    // Free the room — vacant_dirty for housekeeping
    if (roomNumber) {
      await db.prepare(
        `UPDATE room_status SET status = 'vacant_dirty', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(roomNumber).run();
    }

    return { success: true, roomNumber };
  });

// ── Capacity-based availability for guest booking engine ───────────────────
const ROOM_TYPE_CAPACITIES: Record<string, number> = {
  "classic": 23,
  "superior": 38,
  "executive": 18,        // 15 executive + 3 executive-twin
  "business-suites": 11,
  "executive-suites": 4,
};

const ROOM_TYPE_KEY_ALIASES: Record<string, string> = {
  "standard": "classic",
  "deluxe": "superior",
  "executive-suite": "executive-suites",
  "executive-suites": "executive-suites",
  "executive-twin": "executive",
  "presidential-deluxe": "business-suites",
  "presidential-executive": "executive-suites",
  "business-suite": "business-suites",
};

function normalizeRoomTypeKey(raw: string): string {
  const str = String(raw ?? "").toLowerCase().trim();

  // Exact matches for frontend slugs
  if (str === "classic") return "classic";
  if (str === "superior") return "superior";
  if (str === "executive") return "executive";
  if (str === "business-suites") return "business-suites";
  if (str === "executive-suites") return "executive-suites";

  // Alias mappings
  if (str?.includes("presidential-executive")) return "executive-suites";
  if (str?.includes("presidential-deluxe")) return "business-suites";
  if (str?.includes("executive-suite") || str?.includes("executive suite")) return "executive-suites";
  if (str?.includes("business-suite") || str?.includes("business suite")) return "business-suites";
  if (str?.includes("executive twin") || str?.includes("executive-twin")) return "executive";
  if (str?.includes("executive")) return "executive";
  if (str?.includes("superior")) return "superior";
  if (str?.includes("classic")) return "classic";

  // Fallback alias lookup with hyphen normalization
  const key = str?.replace(/\s+/g, "-") ?? "";
  return ROOM_TYPE_KEY_ALIASES[key] ?? key;
}

export const checkRoomAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { checkIn: string; checkOut: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    try {
      const db = cfEnv().remeritona_bookings;

      if (!data.checkIn || !data.checkOut || data.checkOut <= data.checkIn) {
        return { success: false, error: "Invalid date range" };
      }

      // 1. Count physical inventory directly from room_status rows, grouped by type.
      const activeRoomsResult = await db.prepare(`
        SELECT room_number, room_slug, room_name, status
        FROM room_status
        WHERE hotel_id = 'remeritona'
      `).all();

      const roomsList = activeRoomsResult.results ?? [];

      const physicalInventoryByType: Record<string, number> = {
        "classic": 0,
        "superior": 0,
        "executive": 0,
        "business-suites": 0,
        "executive-suites": 0,
      };

      const maintenanceByType: Record<string, number> = {
        "classic": 0,
        "superior": 0,
        "executive": 0,
        "business-suites": 0,
        "executive-suites": 0,
      };

      const todayStr = new Date().toISOString().split("T")[0];
      const coversToday = data.checkIn <= todayStr && data.checkOut > todayStr;

      for (const room of roomsList as any) {
        const roomType = getRoomType(room?.room_number, room?.room_name);
        if (!roomType) continue;

        const normalized = normalizeRoomTypeKey(roomType);
        if (!(normalized in physicalInventoryByType)) continue;

        physicalInventoryByType[normalized]++;

        const currentStatus = room?.status ? String(room.status).trim().toLowerCase() : "";
        if (coversToday && currentStatus.includes("maintain")) {
          maintenanceByType[normalized]++;
        }
      }

      // Safety net: if room_status table is completely empty/unseeded, fallback to standard capacities
      const totalCountedRooms = Object.values(physicalInventoryByType).reduce((a, b) => a + b, 0);
      if (totalCountedRooms === 0) {
        for (const [typeKey, cap] of Object.entries(ROOM_TYPE_CAPACITIES)) {
          physicalInventoryByType[typeKey] = cap;
        }
      }

      // Sellable pool = physical rows minus maintenance (maintenance is permanently un-bookable if covers today)
      const sellableInventoryByType: Record<string, number> = {};
      for (const typeKey of Object.keys(physicalInventoryByType)) {
        sellableInventoryByType[typeKey] = Math.max(
          0,
          (physicalInventoryByType[typeKey] ?? 0) - (maintenanceByType[typeKey] ?? 0)
        );
      }

      // 2. Count overlapping reservations from bookings only (avoids double-counting occupied room_status rows)
      const bookedByType: Record<string, number> = {
        "classic": 0,
        "superior": 0,
        "executive": 0,
        "business-suites": 0,
        "executive-suites": 0,
      };

      const overlappingBookingsResult = await db.prepare(`
        SELECT COALESCE(NULLIF(room_type_key, ''), room_slug) AS type_key, room_number, num_rooms
        FROM bookings
        WHERE status IN ('confirmed', 'checked_in', 'scheduled')
          AND NOT (date(check_out) <= date(?) OR date(check_in) >= date(?))
      `).bind(data.checkIn, data.checkOut).all();

      const bookedList = overlappingBookingsResult.results ?? [];

      const getRoomTypeFromRow = (row: any): string | null => {
        const rawKey = row?.type_key || "";
        const normalized = normalizeRoomTypeKey(rawKey);
        if (normalized in bookedByType) {
          return normalized;
        }
        let roomNum = row?.room_number || "";
        if (!roomNum && rawKey?.startsWith("room-")) {
          roomNum = rawKey?.substring(5) ?? "";
        }
        if (roomNum) {
          const roomType = getRoomType(roomNum);
          return roomType ? normalizeRoomTypeKey(roomType) : null;
        }
        return null;
      };

      for (const booking of bookedList as any) {
        const typeKey = getRoomTypeFromRow(booking);
        if (typeKey && typeKey in bookedByType) {
          bookedByType[typeKey] += Number(booking.num_rooms ?? 1);
        }
      }

      // 3. Available = sellable inventory (post-maintenance) minus date-range bookings and manual blocks
      const availability: Record<string, {
        total: number;
        booked: number;
        available: number;
        fullyBooked: boolean;
        maintenanceBlocked?: number;
        physicalTotal?: number;
      }> = {};

      const bookedRoomNumbers = new Set<string>();
      for (const booking of bookedList as any) {
        if (booking.room_number) {
          bookedRoomNumbers.add(String(booking.room_number).trim());
        }
      }

      for (const typeKey of ["classic", "superior", "executive", "business-suites", "executive-suites"] as const) {
        const physicalTotal = physicalInventoryByType[typeKey] ?? 0;
        const maintenanceBlocked = maintenanceByType[typeKey] ?? 0;
        const total = sellableInventoryByType[typeKey] ?? 0;
        const booked = bookedByType[typeKey] ?? 0;
        let available = Math.max(0, total - booked);

        if (coversToday) {
          let manualDeductions = 0;
          for (const room of roomsList as any) {
            const roomType = getRoomType(room?.room_number, room?.room_name);
            if (!roomType) continue;
            const normalized = normalizeRoomTypeKey(roomType);
            if (normalized !== typeKey) continue;

            const status = room?.status ? String(room.status).trim().toLowerCase() : "";
            if (status === "occupied" || status === "reserved" || status.includes("maintain")) {
              const isBooked = room.room_number && bookedRoomNumbers.has(String(room.room_number).trim());
              if (!isBooked) {
                // If it is maintenance, it is already deducted via maintenanceBlocked (which reduced total, thus reducing available).
                if (status === "occupied" || status === "reserved") {
                  manualDeductions++;
                }
              }
            }
          }
          available = Math.max(0, available - manualDeductions);
        }

        availability[typeKey] = {
          physicalTotal,
          maintenanceBlocked,
          total,
          booked,
          available,
          fullyBooked: available === 0,
        };
      }

      return {
        success: true,
        checkIn: data.checkIn,
        availability,
      };
    } catch (error) {
      // Catch-all fallback: return maximum physical capacities if any operation fails
      console.error("checkRoomAvailability error, falling back to max capacities:", error);
      const fallbackAvailability: Record<string, {
        total: number;
        booked: number;
        available: number;
        fullyBooked: boolean;
      }> = {};

      for (const typeKey of ["classic", "superior", "executive", "business-suites", "executive-suites"] as const) {
        const total = ROOM_TYPE_CAPACITIES[typeKey] ?? 0;
        fallbackAvailability[typeKey] = {
          total,
          booked: 0,
          available: total,
          fullyBooked: false,
        };
      }

      return {
        success: true,
        checkIn: data.checkIn,
        availability: fallbackAvailability,
      };
    }
  });

export const getRevenueReport = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; dateFrom: string; dateTo: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    const bookings = await db.prepare(
      `SELECT reference, guest_name, room_name, check_in, check_out, total, gateway, status, created_at
       FROM bookings
       WHERE DATE(created_at) BETWEEN ? AND ? AND status != 'cancelled'
       ORDER BY created_at DESC`
    ).bind(data.dateFrom, data.dateTo).all();

    const bookingList = bookings.results ?? [];

    const totalRevenue = bookingList.reduce((sum: number, b: any) => sum + (b.total || 0), 0);
    const totalBookings = bookingList.length;

    // Group by room type
    const byRoomType: Record<string, { count: number; revenue: number }> = {};
    bookingList.forEach((b: any) => {
      const roomType = b.room_name || "Unknown";
      if (!byRoomType[roomType]) {
        byRoomType[roomType] = { count: 0, revenue: 0 };
      }
      byRoomType[roomType].count++;
      byRoomType[roomType].revenue += b.total || 0;
    });

    const byRoomTypeArray = Object.entries(byRoomType).map(([roomType, data]) => ({
      roomType,
      count: data.count,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue * 100).toFixed(1) : "0.0",
    }));

    // Group by payment method
    const byPaymentMethod: Record<string, { count: number; revenue: number }> = {};
    bookingList.forEach((b: any) => {
      const method = b.gateway || "Unknown";
      if (!byPaymentMethod[method]) {
        byPaymentMethod[method] = { count: 0, revenue: 0 };
      }
      byPaymentMethod[method].count++;
      byPaymentMethod[method].revenue += b.total || 0;
    });

    const byPaymentMethodArray = Object.entries(byPaymentMethod).map(([method, data]) => ({
      method,
      count: data.count,
      revenue: data.revenue,
    }));

    // Calculate nights for each booking
    const bookingsWithNights = bookingList.map((b: any) => {
      const checkIn = new Date(b.check_in);
      const checkOut = new Date(b.check_out);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...b,
        nights,
      };
    });

    return {
      success: true,
      totalRevenue,
      totalBookings,
      avgPerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0,
      byRoomType: byRoomTypeArray,
      byPaymentMethod: byPaymentMethodArray,
      bookings: bookingsWithNights,
    };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; staffId: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    // Check that caller is admin or manager
    if (auth.staff.role !== "admin" && auth.staff.role !== "manager") {
      return { success: false, error: "Only admins and managers can delete staff" };
    }

    // Get the staff member to delete
    const staffToDelete = await db.prepare(
      `SELECT id, role FROM staff_users WHERE id = ? LIMIT 1`
    ).bind(data.staffId).first() as any;
    if (!staffToDelete) {
      return { success: false, error: "Staff member not found" };
    }

    // Check that a manager cannot delete an admin or another manager
    if (auth.staff.role === "manager") {
      if (staffToDelete.role === "admin" || staffToDelete.role === "manager") {
        return { success: false, error: "Managers cannot delete admins or other managers" };
      }
    }

    // Delete the staff member
    await db.prepare(
      `DELETE FROM staff_users WHERE id = ?`
    ).bind(data.staffId).run();

    return { success: true };
  });

// ── Room Rate Management ─────────────────────────────────────────────────────
export const getRoomRates = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    const rates = await db.prepare(
      `SELECT * FROM room_rates ORDER BY room_type`
    ).all();

    // Default rates if table is empty
    const defaultRates = [
      { room_type: "Classic", price_per_night: 35000 },
      { room_type: "Superior", price_per_night: 50000 },
      { room_type: "Executive", price_per_night: 65000 },
      { room_type: "Executive Twin", price_per_night: 70000 },
      { room_type: "Business Suite", price_per_night: 85000 },
      { room_type: "Executive Suite", price_per_night: 120000 },
    ];

    const existingRates = rates.results ?? [];
    if (existingRates.length === 0) {
      return { success: true, rates: defaultRates };
    }

    return { success: true, rates: existingRates };
  });

export const updateRoomRate = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; roomType: string; price: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    // Only admin and manager can edit rates
    if (auth.staff.role !== "admin" && auth.staff.role !== "manager") {
      return { success: false, error: "Only admins and managers can edit rates" };
    }

    await db.prepare(
      `INSERT INTO room_rates (room_type, price_per_night, updated_at, updated_by)
       VALUES (?, ?, datetime('now'), ?)
       ON CONFLICT(room_type) DO UPDATE SET
       price_per_night = ?, updated_at = datetime('now'), updated_by = ?`
    ).bind(data.roomType, data.price, auth.staff.full_name, data.price, auth.staff.full_name).run();

    return { success: true };
  });

// ── Occupancy Forecast ───────────────────────────────────────────────────────
export const getOccupancyForecast = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; days: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    const forecast = [];
    const totalRooms = 96;

    for (let i = 0; i < data.days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const booked = await db.prepare(
        `SELECT COUNT(DISTINCT room_number) as count
         FROM bookings
         WHERE hotel_id = 'remeritona'
         AND status IN ('confirmed', 'checked_in')
         AND check_in <= ? AND check_out > ?`
      ).bind(dateStr, dateStr).first() as any;

      const bookedRooms = booked?.count ?? 0;
      const occupancyPercent = (bookedRooms / totalRooms) * 100;

      forecast.push({
        date: dateStr,
        bookedRooms,
        totalRooms,
        occupancyPercent: Math.round(occupancyPercent * 10) / 10,
      });
    }

    return { success: true, forecast };
  });

// ── Guest Requests and Room Orders ──────────────────────────────────────────
export const markRequestDone = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; requestId: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE guest_requests SET status = 'done' WHERE id = ?`
    ).bind(data.requestId).run();

    return { success: true };
  });

export const markOrderDone = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; orderId: number }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    await db.prepare(
      `UPDATE room_orders SET status = 'done' WHERE id = ?`
    ).bind(data.orderId).run();

    return { success: true };
  });

export const updateBookingDates = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; newCheckIn: string; newCheckOut: string; requestedBy: 'staff' | 'guest' }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // 1. Fetch the booking row using the reference code
    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE reference = ? LIMIT 1`
    ).bind(data.reference).first() as any;

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 2. Verify the status is 'confirmed' or 'scheduled'
    if (booking.status !== 'confirmed' && booking.status !== 'scheduled') {
      return { success: false, error: "Cannot modify dates for bookings that are already checked out or cancelled" };
    }

    // Validate date range
    if (!data.newCheckIn || !data.newCheckOut || data.newCheckOut <= data.newCheckIn) {
      return { success: false, error: "Invalid date range" };
    }

    // 3. Run availability checks for the booking's room type over the new range
    const availabilityResult = await checkRoomAvailability({ data: { checkIn: data.newCheckIn, checkOut: data.newCheckOut } });
    
    if (!availabilityResult.success) {
      return { success: false, error: "Failed to check availability" };
    }

    // Determine the room type key from the booking
    const roomTypeKey = booking.room_type_key || booking.room_slug || '';
    const normalizedTypeKey = normalizeRoomTypeKey(roomTypeKey);
    
    // Check if the room type has availability
    const availability = availabilityResult.availability;
    if (!availability || !availability[normalizedTypeKey]) {
      return { success: false, error: "Unable to determine room type availability" };
    }

    const typeAvailability = availability[normalizedTypeKey];
    if (typeAvailability.available <= 0) {
      return { success: false, error: "Selected dates are fully booked" };
    }

    // 4. Update the check_in and check_out columns in the bookings table
    await db.prepare(
      `UPDATE bookings SET check_in = ?, check_out = ? WHERE reference = ?`
    ).bind(data.newCheckIn, data.newCheckOut, data.reference).run();

    return { success: true, reference: data.reference, newCheckIn: data.newCheckIn, newCheckOut: data.newCheckOut };
  });

export const markBookingNoShow = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; reference: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const auth = await validateToken(data.token, db);
    if (!auth) return { success: false, error: "Unauthorized" };

    const booking = await db.prepare(
      `SELECT reference, status FROM bookings WHERE reference = ? AND hotel_id = 'remeritona' LIMIT 1`
    ).bind(data.reference).first() as any;

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.status !== "confirmed") {
      return { success: false, error: "Only confirmed bookings can be marked as no-show" };
    }

    await db.prepare(
      `UPDATE bookings SET status = 'cancelled', cancelled_at = datetime('now') WHERE reference = ?`
    ).bind(data.reference).run();

    return { success: true, reference: data.reference };
  });