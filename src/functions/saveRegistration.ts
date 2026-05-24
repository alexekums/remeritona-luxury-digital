import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

const cfEnv = () => env as unknown as {
  remeritona_bookings: D1Database;
};

export const saveGuestRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: {
    token: string;
    booking_ref: string;
    room_number: string;
    room_type: string;
    tariff: string;
    arrival: string;
    departure: string;
    surname: string;
    other_names: string;
    residential_address: string;
    state: string;
    company_address: string;
    occupation: string;
    email: string;
    address: string;
    purpose: string;
    tel: string;
    nationality: string;
    passport_no: string;
    date_issued: string;
    visa_permit_no: string;
    next_of_kin: string;
    next_of_kin_phone: string;
    car_reg: string;
    receptionist: string;
    billing_instruction: string;
    signature_obtained: boolean;
  }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;

    // Verify session using direct query
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    // Upsert — update if exists, insert if not
    const existing = await db.prepare(
      `SELECT id FROM guest_registrations WHERE booking_ref = ? LIMIT 1`
    ).bind(data.booking_ref).first() as any;

    if (existing) {
      await db.prepare(`
        UPDATE guest_registrations SET
          room_number=?, room_type=?, tariff=?, arrival=?, departure=?,
          surname=?, other_names=?, residential_address=?, state=?,
          company_address=?, occupation=?, email=?, address=?, purpose=?, tel=?,
          nationality=?, passport_no=?, date_issued=?, visa_permit_no=?,
          next_of_kin=?, next_of_kin_phone=?, car_reg=?, receptionist=?,
          billing_instruction=?, signature_obtained=?, updated_at=datetime('now')
        WHERE booking_ref=?
      `).bind(
        data.room_number, data.room_type, data.tariff, data.arrival, data.departure,
        data.surname, data.other_names, data.residential_address, data.state,
        data.company_address, data.occupation, data.email, data.address, data.purpose, data.tel,
        data.nationality, data.passport_no, data.date_issued, data.visa_permit_no,
        data.next_of_kin, data.next_of_kin_phone, data.car_reg, data.receptionist,
        data.billing_instruction, data.signature_obtained ? 1 : 0,
        data.booking_ref
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO guest_registrations (
          hotel_id, booking_ref, room_number, room_type, tariff, arrival, departure,
          surname, other_names, residential_address, state, company_address, occupation,
          email, address, purpose, tel, nationality, passport_no, date_issued,
          visa_permit_no, next_of_kin, next_of_kin_phone, car_reg, receptionist,
          billing_instruction, signature_obtained
        ) VALUES ('remeritona',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        data.booking_ref, data.room_number, data.room_type, data.tariff, data.arrival, data.departure,
        data.surname, data.other_names, data.residential_address, data.state,
        data.company_address, data.occupation, data.email, data.address, data.purpose, data.tel,
        data.nationality, data.passport_no, data.date_issued, data.visa_permit_no,
        data.next_of_kin, data.next_of_kin_phone, data.car_reg, data.receptionist,
        data.billing_instruction, data.signature_obtained ? 1 : 0
      ).run();
    }

    return { success: true };
  });

export const getGuestRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; booking_ref: string }) => data)
  .handler(async ({ data }): Promise<any> => {
    const db = cfEnv().remeritona_bookings;
    const session = await db.prepare(
      `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
    ).bind(data.token).first() as any;
    if (!session) return { success: false, error: "Unauthorized" };

    const reg = await db.prepare(
      `SELECT * FROM guest_registrations WHERE booking_ref = ? LIMIT 1`
    ).bind(data.booking_ref).first() as any;

    return { success: true, registration: reg ?? null };
  });