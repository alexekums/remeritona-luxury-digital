// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { getDb, jsonResponse } from "@/lib/pms-api";

// @ts-ignore
export const Route = createFileRoute("/api/pms/migrate")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = await getDb();
          await db.prepare(`
            CREATE TABLE IF NOT EXISTS bar_transactions (
                id TEXT PRIMARY KEY,
                guest_profile_id TEXT,
                room_number TEXT,
                payment_method TEXT NOT NULL,
                subtotal INTEGER NOT NULL,
                discount INTEGER NOT NULL,
                grand_total INTEGER NOT NULL,
                points_earned INTEGER DEFAULT 0,
                cart_items TEXT NOT NULL,
                staff_user TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
          `).run();
          return jsonResponse({ success: true, message: "Migration successful" });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      }
    }
  }
});
