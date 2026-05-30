// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { ensureMenuSeeded } from "@/lib/menu-seed";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/menu-items")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          await ensureMenuSeeded(db);

          const category = new URL(request.url).searchParams.get("category");
          const query = category
            ? `SELECT * FROM menu_items WHERE hotel_id = 'remeritona' AND category = ? ORDER BY category ASC, name ASC`
            : `SELECT * FROM menu_items WHERE hotel_id = 'remeritona' ORDER BY category ASC, name ASC`;
          const result = category
            ? await db.prepare(query).bind(category).all()
            : await db.prepare(query).all();

          return jsonResponse({ success: true, items: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },

      POST: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const body = (await request.json()) as {
            name?: string;
            description?: string;
            price?: number;
            category?: string;
            duration_mins?: number;
            image_url?: string;
          };

          if (!body.name || body.price == null || !body.category) {
            return jsonResponse({ success: false, error: "name, price, and category are required" }, 400);
          }

          const id = crypto.randomUUID();
          await db.prepare(
            `INSERT INTO menu_items
          (id, hotel_id, name, description, price, category, available, duration_mins, image_url, created_at)
         VALUES (?, 'remeritona', ?, ?, ?, ?, 1, COALESCE(?, 0), ?, datetime('now'))`
          ).bind(
            id,
            body.name,
            body.description ?? "",
            body.price,
            body.category,
            body.duration_mins ?? 0,
            body.image_url ?? null
          ).run();

          const row = await db.prepare(`SELECT * FROM menu_items WHERE id = ?`).bind(id).first();
          return jsonResponse({ success: true, item: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
