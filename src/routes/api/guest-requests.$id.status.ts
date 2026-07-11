// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import {
  extractToken,
  getDb,
  GUEST_REQUEST_STATUSES,
  jsonResponse,
  validateAdminToken,
} from "@/lib/pms-api";

export const Route = createFileRoute("/api/guest-requests/$id/status")({
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

          const body = (await request.json()) as { status?: string };
          const status = body.status;
          if (!status || !GUEST_REQUEST_STATUSES.includes(status as typeof GUEST_REQUEST_STATUSES[number])) {
            return jsonResponse(
              { success: false, error: `Invalid status. Allowed: ${GUEST_REQUEST_STATUSES.join(", ")}` },
              400
            );
          }

          await db.prepare(
            `UPDATE guest_requests SET status = ? WHERE id = ?`
          ).bind(status, params.id).run();

          const row = await db.prepare(`SELECT * FROM guest_requests WHERE id = ?`).bind(params.id).first();
          if (!row) return jsonResponse({ success: false, error: "Request not found" }, 404);

          // === Invoice hook on terminal "completed" status ===
          if (status === "completed") {
            try {
              // Look up active checked-in guest via bookings → guests join
              const guest = await db.prepare(
                `SELECT g.id FROM guests g
                 JOIN bookings b ON b.reference = g.booking_ref
                 WHERE b.room_number = ? AND b.status = 'checked_in'
                 AND g.hotel_id = 'remeritona'
                 LIMIT 1`
              ).bind(row.room_number).first() as { id: string } | null;

              if (guest) {
                // Insert service tracking line item (zero-cost) into guest's billing folio
                const description = `Service Completed: ${(row as any).request_type || "Room Request"}`;
                await db.prepare(
                  `INSERT INTO invoices (guest_id, room_number, description, subtotal, tax, total, hotel_id)
                   VALUES (?, ?, ?, ?, ?, ?, 'remeritona')`
                ).bind(
                  guest.id,
                  row.room_number,
                  description,
                  0,
                  0,
                  0
                ).run();
              }
            } catch (hookErr) {
              // Log but don't fail the status update if the hook errors
              console.error("Invoice hook error (service):", hookErr);
            }
          }

          return jsonResponse({ success: true, item: { ...row, type: "service" } });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
