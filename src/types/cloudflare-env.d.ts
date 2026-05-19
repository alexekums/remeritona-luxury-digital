// src/types/cloudflare-env.d.ts
declare module "cloudflare:workers" {
  interface Env {
    remeritona_bookings: D1Database;
    MAILERSEND_API_KEY: string;
    PAYSTACK_SECRET_KEY: string;
    FLUTTERWAVE_SECRET_KEY: string;
  }
}
export {};