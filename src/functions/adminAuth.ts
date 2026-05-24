import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const cfEnv = () => env as unknown as {
  remeritona_bookings: D1Database;
  ADMIN_PASSWORD: string;
  MAILERSEND_API_KEY: string;
};

const LOYALTY_TIER_MULTIPLIER: Record<number, number> = { 1: 1, 2: 1.5, 3: 2, 4: 2.5, 5: 3 };

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
  .inputValidator((data: { username: string; password: string; fullName: string; role: 'front-desk' | 'accountant' | 'manager' | 'admin' }) => data)
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

    // Store session in admin_sessions table (same table as adminLogin)
    // Wrap in try/catch in case of foreign key constraint issues
    try {
      await db.prepare(
        `INSERT INTO admin_sessions (token, hotel_id, staff_id, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), ?)`
      ).bind(token, 'remeritona', staff.id, expiresAt).run();
    } catch {
      // If INSERT fails (e.g., foreign key constraint), store with staff_username instead
      await db.prepare(
        `INSERT INTO admin_sessions (token, hotel_id, staff_id, staff_username, created_at, expires_at) VALUES (?, ?, ?, ?, datetime('now'), ?)`
      ).bind(token, 'remeritona', staff.id, staff.username, expiresAt).run();
    }

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

    // Hierarchy rule: Manager can only see front-desk and accountant, Admin can see all
    if (data.userRole === "manager") {
      query += ` AND role IN ('front-desk', 'accountant')`;
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
    // Fetch staff info from staff_users table using staff_id or staff_username from session
    let staff = null;
    if (session.staff_id) {
      staff = await db.prepare(
        `SELECT id, username, full_name, role FROM staff_users WHERE id = ? LIMIT 1`
      ).bind(session.staff_id).first() as any;
    }
    // If staff_id lookup fails, try staff_username fallback
    if (!staff && session.staff_username) {
      staff = await db.prepare(
        `SELECT id, username, full_name, role FROM staff_users WHERE username = ? LIMIT 1`
      ).bind(session.staff_username).first() as any;
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
    const [checkIns, checkOuts, allBookings, roomStatuses, revenueResult] = await Promise.all([
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_in = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' AND check_out = ? AND status != 'cancelled' ORDER BY created_at DESC`).bind(today).all(),
      db.prepare(`SELECT * FROM bookings WHERE hotel_id = 'remeritona' ORDER BY created_at DESC LIMIT 100`).all(),
      db.prepare(`SELECT * FROM room_status WHERE hotel_id = 'remeritona' ORDER BY CAST(room_number AS INTEGER) ASC`).all(),
      db.prepare(`SELECT SUM(total) as revenue FROM bookings WHERE hotel_id = 'remeritona' AND status IN ('confirmed','checked_in','checked_out') AND created_at >= date('now', 'start of month')`).first(),
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
  .inputValidator((data: { token: string; roomNumber: string; status: string; updatedBy: string; force?: boolean }) => data)
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
    const ROOM_TIER_MAP: Record<string, { tier: number; roomType: string }> = {
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
  classic: 23,
  superior: 38,
  executive: 18,        // 15 executive + 3 executive-twin
  "business-suites": 11,
  "executive-suites": 4,
};

const ROOM_TYPE_KEY_ALIASES: Record<string, string> = {
  standard: "classic",
  deluxe: "superior",
  "executive-suite": "executive",
  "executive-twin": "executive",
  "presidential-deluxe": "business-suites",
  "presidential-executive": "executive-suites",
  "business-suite": "business-suites",
};

function normalizeRoomTypeKey(raw: string): string {
  const key = raw.toLowerCase().trim().replace(/\s+/g, "-");
  return ROOM_TYPE_KEY_ALIASES[key] ?? key;
}

export const checkRoomAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { checkIn: string; checkOut: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    if (!data.checkIn || !data.checkOut || data.checkOut <= data.checkIn) {
      return { success: false, error: "Invalid date range" };
    }

    const bookedRows = await db.prepare(`
      SELECT COALESCE(NULLIF(room_type_key, ''), room_slug) AS type_key,
             COALESCE(SUM(num_rooms), 0) AS booked
      FROM bookings
      WHERE status IN ('confirmed', 'checked_in')
        AND NOT (date(check_out) <= date(?) OR date(check_in) >= date(?))
      GROUP BY type_key
    `).bind(data.checkIn, data.checkOut).all();

    const bookedByType: Record<string, number> = {};
    for (const row of bookedRows.results as Array<{ type_key: string; booked: number }>) {
      const key = normalizeRoomTypeKey(row.type_key ?? "");
      if (!key) continue;
      bookedByType[key] = (bookedByType[key] ?? 0) + Number(row.booked ?? 0);
    }

    const availability: Record<string, {
      total: number;
      booked: number;
      available: number;
      fullyBooked: boolean;
    }> = {};

    for (const [typeKey, total] of Object.entries(ROOM_TYPE_CAPACITIES)) {
      const booked = bookedByType[typeKey] ?? 0;
      const available = Math.max(0, total - booked);
      availability[typeKey] = {
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