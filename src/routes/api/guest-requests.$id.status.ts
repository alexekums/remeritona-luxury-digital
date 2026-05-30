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
            `UPDATE guest_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`
          ).bind(status, params.id).run();

          const row = await db.prepare(`SELECT * FROM guest_requests WHERE id = ?`).bind(params.id).first();
          if (!row) return jsonResponse({ success: false, error: "Request not found" }, 404);

          return jsonResponse({ success: true, item: { ...row, type: "service" } });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
