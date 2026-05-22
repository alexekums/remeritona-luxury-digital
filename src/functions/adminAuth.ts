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
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE room_number = ? AND status = 'checked_in' LIMIT 1`
    ).bind(data.roomNumber).first() as any;

    return { success: true, booking: booking ?? null };
  });

export const updateRoomStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; roomNumber: string; status: string; updatedBy: string; force?: boolean }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

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
  }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    await ensureGuestPortalAccessTable(db);
    await ensureGuestsBookingRoomIndex(db);

    // 1. Get original booking to detect early check-in and continuation check-ins
    const originalBooking = await db.prepare(
      `SELECT * FROM bookings WHERE reference = ? LIMIT 1`
    ).bind(data.reference).first() as any;
    const wasAlreadyCheckedIn = originalBooking?.status === "checked_in";

    const isEarlyCheckIn = originalBooking && data.checkIn < (originalBooking.check_in ?? "").split("T")[0];

    // 2. Update booking: status, check_in (backdated if early), room_number, early_checkin flag
    await db.prepare(
      `UPDATE bookings SET status = 'checked_in', check_in = ?, room_number = ?, early_checkin = ? WHERE reference = ?`
    ).bind(data.checkIn, data.roomNumber, isEarlyCheckIn ? 1 : 0, data.reference).run();

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
  .inputValidator((data: { token: string; reference: string; roomSlug: string; roomNumber?: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

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

    // Update booking status
    await db.prepare(
      `UPDATE bookings SET status = 'checked_out' WHERE reference = ?`
    ).bind(data.reference).run();

    // Free the room — vacant_dirty for housekeeping
    if (roomNumber) {
      await db.prepare(
        `UPDATE room_status SET status = 'vacant_dirty', updated_at = datetime('now') WHERE room_number = ? AND hotel_id = 'remeritona'`
      ).bind(roomNumber).run();
    }

    return { success: true, roomNumber };
  });

// ── Availability check for booking engine ──────────────────────────────────
// Total rooms per type (from actual hotel layout)
const ROOM_TYPE_TOTALS: Record<string, number> = {
  classic: 23,
  superior: 38,
  executive: 18,        // 15 executive + 3 executive-twin
  'business-suites': 11,
  'executive-suites': 4,
};

export const checkRoomAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: { roomType: string; checkIn: string; checkOut: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Normalise room type key (booking.tsx uses display names)
    const typeKey = data.roomType.toLowerCase()
      .replace(/\s+/g, '-')
      .replace('executive-suite', 'executive-suites')
      .replace('business-suite', 'business-suites');

    const total = ROOM_TYPE_TOTALS[typeKey] ?? 0;

    // Count bookings that overlap with requested dates and are active
    const result = await db.prepare(`
      SELECT COALESCE(SUM(num_rooms), 0) as booked
      FROM bookings
      WHERE hotel_id = 'remeritona'
        AND room_type_key = ?
        AND status IN ('confirmed', 'checked_in')
        AND check_in < ?
        AND check_out > ?
    `).bind(typeKey, data.checkOut, data.checkIn).first() as any;

    const booked = result?.booked ?? 0;
    const available = Math.max(0, total - booked);

    return {
      success: true,
      roomType: data.roomType,
      typeKey,
      total,
      booked,
      available,
      fullyBooked: available === 0,
    };
  });