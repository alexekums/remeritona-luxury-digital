export function getDb(context: { cloudflare?: { env?: Record<string, unknown> } }): D1Database | null {
  const db = context?.cloudflare?.env?.remeritona_bookings;
  return (db as D1Database) ?? null;
}

export async function validateAdminToken(db: D1Database, token: string | null): Promise<boolean> {
  if (!token) return false;
  const row = await db.prepare(
    `SELECT token FROM admin_sessions WHERE token = ? LIMIT 1`
  ).bind(token).first();
  return !!row;
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const header = request.headers.get("X-Admin-Token");
  if (header) return header;
  try {
    const url = new URL(request.url);
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const ROOM_ORDER_STATUSES = ["pending", "accepted", "preparing", "delivered"] as const;
export const GUEST_REQUEST_STATUSES = ["pending", "accepted", "in_progress", "completed"] as const;
