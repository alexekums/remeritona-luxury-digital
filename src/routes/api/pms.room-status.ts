// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";
import { resolveGuestProfile, evaluateGuestTier } from "@/lib/guest-profile";

// @ts-ignore
export const Route = createFileRoute("/api/pms/room-status")({
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

          const url = new URL(request.url);
          const roomNumber = url.searchParams.get("roomNumber");
          if (!roomNumber) {
            return jsonResponse({ success: false, error: "roomNumber query parameter is required" }, 400);
          }

          // Query the active checked-in booking and join with the guests loyalty table
          const stmt = db.prepare(`
            SELECT 
              b.guest_name,
              b.room_number,
              g.loyalty_points,
              g.tier
            FROM bookings b
            LEFT JOIN guests g ON b.reference = g.booking_ref
            WHERE b.room_number = ? AND b.status = 'checked_in'
            LIMIT 1
          `);
          const guest = await stmt.bind(roomNumber).first() as any;

          if (!guest) {
            return jsonResponse({ success: false, error: "Room is vacant or guest not found" });
          }

          // Map database numeric tier values to frontend strings
          // tier 1 -> SILVER, tier 2 -> GOLD, tier >= 3 -> PLATINUM
          const dbTier = guest.tier !== null ? Number(guest.tier) : 0;
          let tierString = "BRONZE";
          if (dbTier === 1) {
            tierString = "SILVER";
          } else if (dbTier === 2) {
            tierString = "GOLD";
          } else if (dbTier >= 3) {
            tierString = "PLATINUM";
          }

          return jsonResponse({
            success: true,
            guest: {
              name: guest.guest_name,
              full_name: guest.guest_name,
              tier: tierString,
              points: guest.loyalty_points ?? 0,
              loyalty_points: guest.loyalty_points ?? 0
            }
          });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
      POST: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) {
            return jsonResponse({ success: false, error: "DB not available" }, 500);
          }

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const body = (await request.json()) as { 
            roomNumber?: string; 
            totalAmount: number; 
            pointsEarned: number;
            paymentMethod?: string;
            cartItems?: string;
            discount?: number;
            subtotal?: number;
          };
          
          const transactionId = crypto.randomUUID().replace(/-/g, "");
          const pMethod = body.paymentMethod || (body.roomNumber ? "ROOM_CHARGE" : "CASH");
          
          if (body.roomNumber) {
            const booking = await db.prepare(
              `SELECT reference, guest_name, guest_email, guest_phone, room_slug, room_name, check_in, check_out FROM bookings WHERE room_number = ? AND status = 'checked_in' LIMIT 1`
            ).bind(body.roomNumber).first() as any;

            if (booking) {
              const guestProfileId = await resolveGuestProfile(db, booking.guest_name, booking.guest_email || "", booking.guest_phone || "");
              await db.prepare(
                `UPDATE bookings SET guest_profile_id = ? WHERE reference = ?`
              ).bind(guestProfileId, booking.reference).run();

              const guestRow = await db.prepare(
                `SELECT id FROM guests WHERE booking_ref = ? LIMIT 1`
              ).bind(booking.reference).first() as { id: string } | null;

              let currentGuestId = "";
              if (guestRow) {
                currentGuestId = guestRow.id;
                await db.prepare(
                  `UPDATE guests SET loyalty_points = loyalty_points + ? WHERE booking_ref = ?`
                ).bind(body.pointsEarned, booking.reference).run();
              } else {
                const newGuestId = crypto.randomUUID().replace(/-/g, "");
                currentGuestId = newGuestId;
                await db.prepare(
                  `INSERT INTO guests (id, hotel_id, booking_ref, room_number, room_type, full_name, guest_email, check_in, check_out, loyalty_points, tier, created_at)
                   VALUES (?, 'remeritona', ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
                ).bind(
                  newGuestId,
                  booking.reference,
                  body.roomNumber,
                  booking.room_slug,
                  booking.guest_name,
                  booking.guest_email ?? null,
                  booking.check_in,
                  booking.check_out,
                  body.pointsEarned
                ).run();
              }

              // Update lifetime points on the master profile
              if (body.pointsEarned > 0) {
                 await db.prepare(`
                    UPDATE hotel_guests SET lifetime_points = lifetime_points + ?, current_points = current_points + ? WHERE id = ?
                 `).bind(body.pointsEarned, body.pointsEarned, guestProfileId).run();
              }

              // Update cumulative folio bill (invoices table)
              await db.prepare(
                `INSERT INTO invoices (guest_id, room_number, description, subtotal, tax, total, hotel_id)
                 VALUES (?, ?, 'Bar POS Purchase', ?, 0, ?, 'remeritona')`
              ).bind(
                currentGuestId,
                body.roomNumber,
                body.totalAmount,
                body.totalAmount
              ).run();

              // Insert tracking entry in loyalty_ledger
              if (body.pointsEarned > 0) {
                const ledgerId = crypto.randomUUID().replace(/-/g, "");
                await db.prepare(
                  `INSERT INTO loyalty_ledger (id, booking_ref, points_delta, action_type, description)
                   VALUES (?, ?, ?, 'EARN', 'Bar POS Purchase')`
                ).bind(
                  ledgerId,
                  booking.reference,
                  body.pointsEarned
                ).run();
              }

              // Insert into bar_transactions
              await db.prepare(
                `INSERT INTO bar_transactions (id, guest_profile_id, room_number, payment_method, subtotal, discount, grand_total, points_earned, cart_items, staff_user)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              ).bind(
                transactionId,
                guestProfileId,
                body.roomNumber,
                pMethod,
                body.subtotal || body.totalAmount,
                body.discount || 0,
                body.totalAmount,
                body.pointsEarned,
                body.cartItems || "[]",
                "system"
              ).run();

              // Trigger Automatic Tier Upgrade
              await evaluateGuestTier(db, guestProfileId);

            } else {
              return jsonResponse({ success: false, error: "Active guest booking not found for this room" }, 404);
            }
          } else {
            // WALK-IN TRANSACTION
            await db.prepare(
                `INSERT INTO bar_transactions (id, guest_profile_id, room_number, payment_method, subtotal, discount, grand_total, points_earned, cart_items, staff_user)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              transactionId,
              null,
              null,
              pMethod,
              body.subtotal || body.totalAmount,
              body.discount || 0,
              body.totalAmount,
              0,
              body.cartItems || "[]",
              "system"
            ).run();
          }

          return jsonResponse({ success: true, message: "Transaction completed successfully" });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
