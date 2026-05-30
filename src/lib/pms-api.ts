export async function getDb(): Promise<D1Database | null> {
  try {
    const { env } = await import("cloudflare:workers");
    return (env as unknown as { 
      remeritona_bookings: D1Database 
    }).remeritona_bookings ?? null;
  } catch {
    return null;
  }
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

export const ROOM_ORDER_STATUSES = ["pending", "accepted", "preparing", "delivered", "archived"] as const;
export const GUEST_REQUEST_STATUSES = ["pending", "accepted", "in_progress", "completed", "archived"] as const;

export async function getTableColumnNames(db: D1Database, table: string): Promise<string[]> {
  const result = await db.prepare(`SELECT name FROM pragma_table_info(?)`).bind(table).all();
  return (result.results ?? []).map((row) => String((row as { name: string }).name));
}

export function tableHasColumn(columns: string[], name: string): boolean {
  return columns.includes(name);
}
