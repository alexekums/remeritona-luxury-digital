import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";
import BookingEmail from "@/components/BookingEmail";

interface EmailData {
  guestName: string;
  guestEmail: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  total: number;
  addons: Array<{ label: string; price: number }>;
  notes: string;
  reference: string;
}

export const sendBookingEmail = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const data = ctx.data as unknown as EmailData;
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Remeritona Hotel <onboarding@resend.dev>",
      to: data.guestEmail,
      subject: `Booking Confirmed - ${data.roomName}`,
      react: BookingEmail(data),
    });

    await resend.emails.send({
      from: "Remeritona Hotel <onboarding@resend.dev>",
      to: "alexekums@gmail.com",
      subject: `New Booking Alert - ${data.guestName}`,
      html: `
        <h2>New Booking Received</h2>
        <p><strong>Guest:</strong> ${data.guestName}</p>
        <p><strong>Email:</strong> ${data.guestEmail}</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Dates:</strong> ${data.checkIn} - ${data.checkOut} (${data.nights} nights)</p>
        <p><strong>Total Paid:</strong> ₦${data.total.toLocaleString()}</p>
        <p><strong>Add-ons:</strong> ${(data.addons as Array<{ label: string }>).map(a => a.label).join(", ") || "None"}</p>
        <p><strong>Special Requests:</strong> ${data.notes || "None"}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
      `,
    });

    return { success: true };
  });