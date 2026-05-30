// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/menu-items/$id")({
  server: {
    handlers: {
      PATCH: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string };
      }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const body = (await request.json()) as {
            price?: number;
            name?: string;
            description?: string;
            available?: boolean;
            category?: string;
            image_url?: string | null;
          };

          const availableVal = body.available === undefined ? null : body.available ? 1 : 0;

          await db.prepare(
            `UPDATE menu_items
         SET price = COALESCE(?, price),
             name = COALESCE(?, name),
             description = COALESCE(?, description),
             available = COALESCE(?, available),
             category = COALESCE(?, category),
             image_url = COALESCE(?, image_url)
         WHERE id = ? AND hotel_id = 'remeritona'`
          ).bind(
            body.price ?? null,
            body.name ?? null,
            body.description ?? null,
            availableVal,
            body.category ?? null,
            body.image_url ?? null,
            params.id
          ).run();

          const row = await db.prepare(`SELECT * FROM menu_items WHERE id = ?`).bind(params.id).first();
          if (!row) return jsonResponse({ success: false, error: "Item not found" }, 404);

          return jsonResponse({ success: true, item: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },

      DELETE: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string };
      }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          await db.prepare(`DELETE FROM menu_items WHERE id = ? AND hotel_id = 'remeritona'`).bind(params.id).run();
          return jsonResponse({ success: true });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
