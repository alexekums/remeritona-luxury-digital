import * as React from "react";
import { Html, Head, Body, Container, Section, Text, Hr } from "@react-email/components";

interface BookingEmailProps {
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

export default function BookingEmail({ guestName, guestEmail, roomName, checkIn, checkOut, nights, numRooms, guests, total, addons, notes, reference }: BookingEmailProps) {
  const addonsTotal = addons.reduce((s, a) => s + a.price, 0);
  const base = Math.round((total - addonsTotal) / 1.075);
  const tax = Math.round(base * 0.075);
  const naira = "&#8358;";

  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#111111", margin: "0", padding: "20px 0", fontFamily: "Georgia, serif" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#111111", borderRadius: "8px", overflow: "hidden" }}>
          <Section style={{ backgroundColor: "#1a1a1a", padding: "32px 40px", textAlign: "center", borderBottom: "1px solid #333" }}>   
            <Text style={{ fontSize: "11px", letterSpacing: "0.4em", color: "#c9a84c", textTransform: "uppercase", margin: "0 0 4px" }}>Remeritona Hotel & Suites</Text>    
            <Text style={{ fontSize: "22px", color: "#f0f0f0", letterSpacing: "0.05em", margin: "0" }}>Reservation Confirmed</Text>
          </Section>
          <Section style={{ padding: "32px 40px" }}>
            <Text style={{ fontSize: "15px", color: "#cccccc", margin: "0 0 8px" }}>Dear <strong style={{ color: "#f0f0f0" }}>{guestName}</strong>,</Text>
            <Text style={{ fontSize: "14px", color: "#999999", margin: "0 0 28px", lineHeight: "1.6" }}>Your reservation has been confirmed. We look forward to welcoming you to Remeritona Hotel & Suites, Abakaliki.</Text>
            <Section style={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "6px", padding: "20px 24px", marginBottom: "20px" }}>     
              <Text style={{ fontSize: "10px", letterSpacing: "0.35em", color: "#c9a84c", textTransform: "uppercase", margin: "0 0 12px" }}>Booking Details</Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Reference: <span style={{ color: "#c9a84c", fontFamily: "monospace" }}>{reference}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Room: <span style={{ color: "#f0f0f0" }}>{roomName}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Rooms: <span style={{ color: "#f0f0f0" }}>{numRooms}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Check-in: <span style={{ color: "#f0f0f0" }}>{checkIn}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Check-out: <span style={{ color: "#f0f0f0" }}>{checkOut}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Nights: <span style={{ color: "#f0f0f0" }}>{nights}</span></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Guests: <span style={{ color: "#f0f0f0" }}>{guests}</span></Text>
            </Section>
            <Section style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "20px 24px", marginBottom: "20px" }}>
              <Text style={{ fontSize: "10px", letterSpacing: "0.35em", color: "#c9a84c", textTransform: "uppercase", margin: "0 0 12px" }}>Payment Summary</Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>{numRooms} {numRooms === 1 ? "Room" : "Rooms"} x {nights} {nights === 1 ? "night" : "nights"}: <span style={{ color: "#ccc" }} dangerouslySetInnerHTML={{ __html: `${naira}${base.toLocaleString()}` }} /></Text>
              <Text style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>Taxes & fees (7.5%): <span style={{ color: "#ccc" }} dangerouslySetInnerHTML={{ __html: `${naira}${tax.toLocaleString()}` }} /></Text>
              {addons.map((addon, i) => (
                <Text key={i} style={{ fontSize: "13px", color: "#888", margin: "4px 0" }}>{addon.label}: <span style={{ color: "#ccc" }} dangerouslySetInnerHTML={{ __html: `${naira}${addon.price.toLocaleString()}` }} /></Text>
              ))}
              <Hr style={{ borderColor: "#333", margin: "12px 0 8px" }} />
              <Text style={{ fontSize: "18px", color: "#c9a84c", margin: "0" }} dangerouslySetInnerHTML={{ __html: `Total Paid: ${naira}${total.toLocaleString()}` }} />    
            </Section>
            {notes ? (
              <Section style={{ backgroundColor: "#161616", borderLeft: "3px solid #c9a84c", padding: "14px 18px", marginBottom: "28px" }}>
                <Text style={{ fontSize: "12px", color: "#888", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.2em" }}>Special Requests</Text>
                <Text style={{ fontSize: "13px", color: "#ccc", margin: "0" }}>{notes}</Text>
              </Section>
            ) : null}
            <Section style={{ textAlign: "center", marginBottom: "28px" }}>
              <a href={`https://lexgold.remeritona.workers.dev/my-bookings?ref=${reference}&email=${guestEmail}`} style={{ backgroundColor: "#c9a84c", color: "#0a0a0a", textDecoration: "none", padding: "12px 24px", borderRadius: "4px", fontSize: "14px", fontWeight: "bold", letterSpacing: "0.1em", textTransform: "uppercase", display: "inline-block" }}>Manage or Cancel Reservation</a>
              <Text style={{ fontSize: "11px", color: "#666", margin: "12px 0 0", display: "block" }}>Already checked in? Visit the front desk for early checkout assistance.</Text>
            </Section>
            <Hr style={{ borderColor: "#222", margin: "20px 0" }} />
            <Text style={{ textAlign: "center", fontSize: "12px", color: "#555", margin: "0", lineHeight: "1.8" }}>
              Remeritona Hotel & Suites · Abakaliki, Ebonyi State
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}