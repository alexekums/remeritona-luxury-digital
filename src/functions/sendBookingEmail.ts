import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { render } from "@react-email/components";
import BookingEmail from "@/components/BookingEmail";
import * as React from "react";

export interface EmailData {
  guestName: string;
  guestEmail: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  numRooms: number;
  guests: number;
  total: number;
  addons: Array<{ label: string; price: number }>;
  notes: string;
  reference: string;
}

export const sendBookingEmail = createServerFn({ method: "POST" })
  .inputValidator((data: EmailData) => data)
  .handler(async ({ data }) => {
    const cfEnv = env as unknown as { MAILERSEND_API_KEY: string };
    const mailerSend = new MailerSend({ apiKey: cfEnv.MAILERSEND_API_KEY || "" });

    const sentFrom = new Sender("booking@remeritonahotel.com", "Remeritona Hotel");

    const htmlContent = await render(
      React.createElement(BookingEmail, data)
    );

    // Send to guest
    const guestEmail = new EmailParams()
      .setFrom(sentFrom)
      .setTo([new Recipient(data.guestEmail, data.guestName)])
      .setSubject(`Booking Confirmed - ${data.roomName}`)
      .setHtml(htmlContent);

    await mailerSend.email.send(guestEmail);

    // Send to hotel
    const hotelEmail = new EmailParams()
      .setFrom(sentFrom)
      .setTo([new Recipient("alexekums@gmail.com", "Remeritona Hotel")])
      .setSubject(`New Booking Alert - ${data.guestName}`)
      .setHtml(`
        <h2>New Booking Received</h2>
        <p><strong>Guest:</strong> ${data.guestName}</p>
        <p><strong>Email:</strong> ${data.guestEmail}</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut} (${data.nights} nights, ${data.numRooms} rooms)</p>
        <p><strong>Total Paid:</strong> N${data.total.toLocaleString()}</p>
        <p><strong>Add-ons:</strong> ${data.addons.map(a => a.label).join(", ") || "None"}</p>
        <p><strong>Special Requests:</strong> ${data.notes || "None"}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
      `);

    await mailerSend.email.send(hotelEmail);

    return { success: true };
  });
