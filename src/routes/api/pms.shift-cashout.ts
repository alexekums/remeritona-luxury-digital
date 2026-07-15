// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

// @ts-ignore
export const Route = createFileRoute("/api/pms/shift-cashout")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) {
            return jsonResponse({ success: false, error: "DB not available" }, 500);
          }

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          // Query the last 24 hours of transactions
          const transactions = await db.prepare(`
            SELECT * FROM bar_transactions
            WHERE created_at >= datetime('now', '-24 hours')
            ORDER BY created_at DESC
          `).all() as any;

          const results = transactions.results || [];
          
          let cashTotal = 0;
          let cardTotal = 0;
          let roomChargeTotal = 0;

          for (const tx of results) {
            if (tx.payment_method === 'CASH') cashTotal += tx.grand_total;
            if (tx.payment_method === 'CARD') cardTotal += tx.grand_total;
            if (tx.payment_method === 'ROOM_CHARGE') roomChargeTotal += tx.grand_total;
          }

          return jsonResponse({
            success: true,
            transactions: results,
            totals: {
              cash: cashTotal,
              card: cardTotal,
              roomCharge: roomChargeTotal,
              grandTotal: cashTotal + cardTotal + roomChargeTotal
            }
          });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      }
    }
  }
});
