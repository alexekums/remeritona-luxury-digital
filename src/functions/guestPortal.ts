import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { ensureMenuSeeded } from "@/lib/menu-seed";

const db = () => (env as any).remeritona_bookings as D1Database;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPromise = Promise<any>;

// ===== AUTH =====
export const guestLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { roomNumber: string; bookingRef: string }) => d)
  .handler(async ({ data }): AnyPromise => {
    const guest = await db().prepare(
      `SELECT * FROM guests WHERE room_number = ? AND booking_ref = ? AND hotel_id = 'remeritona' LIMIT 1`
    ).bind(data.roomNumber, data.bookingRef.toUpperCase()).first() as any;
    if (!guest) return { success: false, error: "Room number or booking reference not found" };
    return { success: true, guest };
  });

export const getGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const guest = await db().prepare(
      `SELECT * FROM guests WHERE id = ? LIMIT 1`
    ).bind(data.guestId).first() as any;
    if (!guest) return { success: false, error: "Guest not found" };
    return { success: true, guest };
  });

// ===== SERVICE REQUESTS =====
export const createServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; requestType: string; notes?: string; category?: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `INSERT INTO service_requests (guest_id, room_number, request_type, notes, category, hotel_id) VALUES (?, ?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId, data.roomNumber, data.requestType, data.notes ?? null, data.category ?? null).run();
    return { success: true };
  });

export const listMyRequests = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const result = await db().prepare(
      `SELECT * FROM service_requests WHERE guest_id = ? ORDER BY created_at DESC`
    ).bind(data.guestId).all();
    return result.results ?? [];
  });

export const updateServiceRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `UPDATE service_requests SET status = ? WHERE id = ?`
    ).bind(data.status, data.id).run();
    return { success: true };
  });

// ===== FOOD ORDERS =====
export const placeFoodOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; items: Array<{ name: string; price: number; quantity: number }>; totalAmount: number; specialInstructions?: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `INSERT INTO food_orders (guest_id, room_number, items, total_amount, special_instructions, hotel_id) VALUES (?, ?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId, data.roomNumber, JSON.stringify(data.items), data.totalAmount, data.specialInstructions ?? null).run();
    await awardPoints(data.guestId, data.totalAmount);
    return { success: true };
  });

export const listFoodOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const result = await db().prepare(
      `SELECT * FROM food_orders WHERE guest_id = ? ORDER BY created_at DESC`
    ).bind(data.guestId).all();
    return result.results ?? [];
  });

export const updateFoodOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; status: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `UPDATE food_orders SET status = ? WHERE id = ?`
    ).bind(data.status, data.id).run();
    return { success: true };
  });

// ===== MENU =====
export const getMenu = createServerFn({ method: "POST" })
  .inputValidator((d: { category?: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await ensureMenuSeeded(db());
    if (data.category) {
      const result = await db().prepare(
        `SELECT * FROM menu_items
         WHERE hotel_id = 'remeritona' AND category != 'Spa' AND available = 1 AND category = ?
         ORDER BY name ASC`
      ).bind(data.category).all();
      return result.results ?? [];
    }
    const result = await db().prepare(
      `SELECT * FROM menu_items
       WHERE hotel_id = 'remeritona' AND category != 'Spa' AND available = 1
       ORDER BY category ASC, name ASC`
    ).all();
    return result.results ?? [];
  });

export const getSpaServices = createServerFn({ method: "POST" })
  .inputValidator(() => ({}))
    .handler(async (): AnyPromise => {
    await ensureMenuSeeded(db());
    const result = await db().prepare(
      `SELECT * FROM menu_items
       WHERE hotel_id = 'remeritona' AND category = 'Spa' AND available = 1
       ORDER BY name ASC`
    ).all();
    return result.results ?? [];
  });

// ===== SPA =====
export const createSpaBooking = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; serviceName: string; preferredDate: string; preferredTime: string; notes?: string; price?: number }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `INSERT INTO spa_bookings (guest_id, room_number, service_name, preferred_date, preferred_time, notes, hotel_id) VALUES (?, ?, ?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId, data.roomNumber, data.serviceName, data.preferredDate, data.preferredTime, data.notes ?? null).run();
    if (data.price && data.price > 0) await awardPoints(data.guestId, data.price);
    return { success: true };
  });

export const listSpaBookings = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const result = await db().prepare(
      `SELECT * FROM spa_bookings WHERE guest_id = ? ORDER BY created_at DESC`
    ).bind(data.guestId).all();
    return result.results ?? [];
  });

// ===== DND =====
export const setDnd = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; active: boolean }) => d)
    .handler(async ({ data }): AnyPromise => {
    const existing = await db().prepare(
      `SELECT id FROM dnd_requests WHERE guest_id = ? LIMIT 1`
    ).bind(data.guestId).first() as any;
    if (existing) {
      await db().prepare(
        `UPDATE dnd_requests SET active = ?, updated_at = datetime('now') WHERE guest_id = ?`
      ).bind(data.active ? 1 : 0, data.guestId).run();
    } else {
      await db().prepare(
        `INSERT INTO dnd_requests (guest_id, room_number, active, hotel_id) VALUES (?, ?, ?, 'remeritona')`
      ).bind(data.guestId, data.roomNumber, data.active ? 1 : 0).run();
    }
    return { success: true };
  });

export const getDnd = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const row = await db().prepare(
      `SELECT active FROM dnd_requests WHERE guest_id = ? LIMIT 1`
    ).bind(data.guestId).first() as any;
    return { active: row?.active === 1 };
  });

// ===== MESSAGES =====
export const sendMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; sender: "guest" | "staff"; message: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `INSERT INTO messages (guest_id, room_number, sender, message, hotel_id) VALUES (?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId, data.roomNumber, data.sender, data.message).run();
    return { success: true };
  });

export const listMessages = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const result = await db().prepare(
      `SELECT * FROM messages WHERE guest_id = ? ORDER BY created_at ASC`
    ).bind(data.guestId).all();
    return result.results ?? [];
  });

// ===== INVOICES =====
export const getInvoices = createServerFn({ method: "POST" })
  .inputValidator((d: { roomNumber: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const result = await db().prepare(
      `SELECT * FROM invoices WHERE room_number = ? AND hotel_id = 'remeritona' ORDER BY created_at DESC`
    ).bind(data.roomNumber).all();
    return result.results ?? [];
  });

export const createInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId?: string; roomNumber: string; description: string; subtotal: number; tax?: number; total: number }) => d)
    .handler(async ({ data }): AnyPromise => {
    await db().prepare(
      `INSERT INTO invoices (guest_id, room_number, description, subtotal, tax, total, hotel_id) VALUES (?, ?, ?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId ?? null, data.roomNumber, data.description, data.subtotal, data.tax ?? 0, data.total).run();
    return { success: true };
  });

// ===== LOYALTY =====
export const getLoyalty = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const g = await db().prepare(
      `SELECT loyalty_points, tier FROM guests WHERE id = ? LIMIT 1`
    ).bind(data.guestId).first() as any;
    return { points: g?.loyalty_points ?? 0, tier: g?.tier ?? 1 };
  });

export const redeemReward = createServerFn({ method: "POST" })
  .inputValidator((d: { guestId: string; roomNumber: string; rewardId: string; rewardName: string; pointsCost: number }) => d)
    .handler(async ({ data }): AnyPromise => {
    const g = await db().prepare(
      `SELECT loyalty_points FROM guests WHERE id = ? LIMIT 1`
    ).bind(data.guestId).first() as any;
    const balance = g?.loyalty_points ?? 0;
    if (balance < data.pointsCost) return { success: false, error: "Not enough points" };
    await db().prepare(
      `UPDATE guests SET loyalty_points = ? WHERE id = ?`
    ).bind(balance - data.pointsCost, data.guestId).run();
    await db().prepare(
      `INSERT INTO loyalty_redemptions (guest_id, room_number, reward_name, points_cost, hotel_id) VALUES (?, ?, ?, ?, 'remeritona')`
    ).bind(data.guestId, data.roomNumber, data.rewardName, data.pointsCost).run();
    return { success: true, remaining: balance - data.pointsCost };
  });

// ===== ADMIN: Get all requests =====
export const adminGetServiceRequests = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; status?: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const session = await db().prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };
    const query = data.status && data.status !== "all"
      ? `SELECT sr.*, g.full_name as guest_name FROM service_requests sr LEFT JOIN guests g ON sr.guest_id = g.id WHERE sr.hotel_id = 'remeritona' AND sr.status = ? ORDER BY sr.created_at DESC`
      : `SELECT sr.*, g.full_name as guest_name FROM service_requests sr LEFT JOIN guests g ON sr.guest_id = g.id WHERE sr.hotel_id = 'remeritona' ORDER BY sr.created_at DESC`;
    const result = data.status && data.status !== "all"
      ? await db().prepare(query).bind(data.status).all()
      : await db().prepare(query).all();
    return { success: true, requests: result.results ?? [] };
  });

export const adminGetFoodOrders = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; status?: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const session = await db().prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };
    const result = await db().prepare(
      `SELECT fo.*, g.full_name as guest_name FROM food_orders fo LEFT JOIN guests g ON fo.guest_id = g.id WHERE fo.hotel_id = 'remeritona' ORDER BY fo.created_at DESC LIMIT 50`
    ).all();
    return { success: true, orders: result.results ?? [] };
  });

export const adminGetDndRooms = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const session = await db().prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };
    const result = await db().prepare(
      `SELECT dnd.*, g.full_name as guest_name FROM dnd_requests dnd LEFT JOIN guests g ON dnd.guest_id = g.id WHERE dnd.hotel_id = 'remeritona' AND dnd.active = 1`
    ).all();
    return { success: true, dndRooms: result.results ?? [] };
  });

// ===== ADMIN: Create guest portal access =====
export const adminCreateGuest = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; bookingRef: string; roomNumber: string; roomType: string; fullName: string; guestEmail: string; checkIn: string; checkOut: string }) => d)
    .handler(async ({ data }): AnyPromise => {
    const session = await db().prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };
    const existing = await db().prepare(
      `SELECT id FROM guests WHERE booking_ref = ? LIMIT 1`
    ).bind(data.bookingRef.toUpperCase()).first() as any;
    if (existing) return { success: false, error: "Guest portal already exists for this booking" };
    await db().prepare(
      `INSERT INTO guests (booking_ref, room_number, room_type, full_name, guest_email, check_in, check_out, hotel_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'remeritona')`
    ).bind(data.bookingRef.toUpperCase(), data.roomNumber, data.roomType, data.fullName, data.guestEmail, data.checkIn, data.checkOut).run();
    return { success: true };
  });

// ===== HELPERS =====
const TIER_MULTIPLIER: Record<number, number> = { 1: 1, 2: 1.5, 3: 2 };

async function awardPoints(guestId: string, nairaSpent: number) {
  const g = await db().prepare(
    `SELECT tier, loyalty_points FROM guests WHERE id = ? LIMIT 1`
  ).bind(guestId).first() as any;
  if (!g) return;
  const mult = TIER_MULTIPLIER[g.tier] ?? 1;
  const earned = Math.floor((nairaSpent / 1000) * mult);
  if (earned <= 0) return;
  await db().prepare(
    `UPDATE guests SET loyalty_points = loyalty_points + ? WHERE id = ?`
  ).bind(earned, guestId).run();
}