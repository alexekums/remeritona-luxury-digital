// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, validateAdminToken, jsonResponse } from "@/lib/pms-api";

// @ts-ignore
export const Route = createFileRoute("/api/settings")({
  server: {
    handlers: {
      PATCH: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const updates = (await request.json()) as Record<string, string | number>;
          const keys = Object.keys(updates);
          
          if (keys.length === 0) {
            return jsonResponse({ success: true, message: "No updates provided" });
          }

          const stmt = db.prepare("UPDATE system_settings SET value = ? WHERE key = ?");
          const batchStmts = keys.map(key => stmt.bind(String(updates[key]), key));
          
          await db.batch(batchStmts);

          return jsonResponse({ success: true, message: "Settings updated" });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
