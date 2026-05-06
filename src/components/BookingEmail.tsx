import * as React from 'react';
import { Html, Head, Body, Container, Text, Section, Hr, Row, Column } from '@react-email/components';

interface BookingEmailProps {
  guestName: string;
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

export default function BookingEmail({
  guestName,
  roomName,
  checkIn,
  checkOut,
  nights,
  guests,
  total,
  addons,
  notes,
  reference,
}: BookingEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#111', color: '#ddd', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '8px' }}>
            <Text style={{ fontSize: '28px', color: '#f1c40f', textAlign: 'center' }}>
              🎉 Booking Confirmed!
            </Text>

            <Hr style={{ borderColor: '#333', margin: '20px 0' }} />

            <Text style={{ fontSize: '18px' }}>Dear {guestName},</Text>
            
            <Text>Your reservation at <strong>Remeritona Hotel & Suites</strong> has been confirmed.</Text>

            <Section style={{ backgroundColor: '#222', padding: '15px', borderRadius: '6px', margin: '20px 0' }}>
              <Text><strong>Booking Reference:</strong> {reference}</Text>
              <Text><strong>Room:</strong> {roomName}</Text>
              <Text><strong>Check-in:</strong> {checkIn}</Text>
              <Text><strong>Check-out:</strong> {checkOut}</Text>
              <Text><strong>Nights:</strong> {nights}</Text>
              <Text><strong>Guests:</strong> {guests}</Text>
            </Section>

            {addons.length > 0 && (
              <Section>
                <Text><strong>Selected Add-ons (Pay on Arrival):</strong></Text>
                {addons.map((addon, i) => (
                  <Text key={i}>• {addon.label} — ₦{addon.price.toLocaleString()}</Text>
                ))}
              </Section>
            )}

            {notes && (
              <Section>
                <Text><strong>Special Requests:</strong></Text>
                <Text>{notes}</Text>
              </Section>
            )}

            <Text style={{ fontSize: '20px', color: '#f1c40f', marginTop: '20px' }}>
              Total Paid: ₦{total.toLocaleString()}
            </Text>

            <Hr style={{ borderColor: '#333', margin: '25px 0' }} />

            <Text style={{ textAlign: 'center', color: '#888' }}>
              Thank you for choosing Remeritona Hotel.<br />
              We look forward to welcoming you!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}