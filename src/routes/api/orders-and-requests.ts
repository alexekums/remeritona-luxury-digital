// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/orders-and-requests")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const { env } = await import("cloudflare:workers");
          const db = (env as unknown as {
            remeritona_bookings: D1Database
          }).remeritona_bookings;
          if (!db) {
            return Response.json(
              { error: "DB not available" },
              { status: 500 }
            );
          }
          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return Response.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }

          const url = new URL(request.url);
          const status = url.searchParams.get("status");
          const excludeArchived = url.searchParams.get("exclude_archived") === "true";
          const room = url.searchParams.get("room");

          let diningQuery = `
            SELECT
              CAST(id AS TEXT) as id,
              room_number,
              guest_name,
              items,
              total as total_amount,
              status,
              created_at,
              booking_ref,
              'dining' as type
            FROM room_orders
            WHERE hotel_id = 'remeritona'
          `;
          let serviceQuery = `
            SELECT
              id,
              room_number,
              guest_name,
              booking_ref,
              request_type,
              notes,
              status,
              created_at,
              'service' as type
            FROM guest_requests
            WHERE hotel_id = 'remeritona'
          `;

          const params: any[] = [];

          if (status) {
            diningQuery += ` AND status = ?`;
            serviceQuery += ` AND status = ?`;
            params.push(status);
          }

          if (excludeArchived) {
            diningQuery += ` AND status != 'archived'`;
            serviceQuery += ` AND status != 'archived'`;
          }

          if (room) {
            diningQuery += ` AND room_number = ?`;
            serviceQuery += ` AND room_number = ?`;
            params.push(room);
          }

          diningQuery += ` ORDER BY created_at DESC`;
          serviceQuery += ` ORDER BY created_at DESC`;

          const diningRows = await db.prepare(diningQuery).bind(...params).all();
          const serviceRows = await db.prepare(serviceQuery).bind(...params).all();

          const combined = [
            ...(diningRows.results || []),
            ...(serviceRows.results || []),
          ].sort((a: any, b: any) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
          const settingsRows = await db.prepare(
            `SELECT key, value FROM system_settings`
          ).all();
          
          const configMap = (settingsRows.results || []).reduce((acc: any, row: any) => {
            const val = row.value;
            if (val === "true" || val === "1") {
              acc[row.key] = true;
            } else if (val === "false" || val === "0") {
              acc[row.key] = false;
            } else if (!isNaN(Number(val)) && val.trim() !== "") {
              acc[row.key] = Number(val);
            } else {
              acc[row.key] = val;
            }
            return acc;
          }, { escalation_warning_mins: 10, escalation_critical_mins: 20 });

          return Response.json({ results: combined, settings: configMap });
        } catch (error) {
          return Response.json(
            { error: String(error) },
            { status: 500 }
          );
        }
      },
    },
  },
});
