// Flexible coupon system. Add new coupons here.
// Each coupon defines a validator that receives the booking context and returns
// either { valid: true, discount, message } or { valid: false, reason }.

export type CouponContext = {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  subtotal: number; // in NGN
  nights: number;
};

export type CouponResult =
  | { valid: true; discount: number; label: string; message: string }
  | { valid: false; reason: string };

export type Coupon = {
  code: string;
  description: string;
  validate: (ctx: CouponContext) => CouponResult;
};

// True if the stay covers at least one Friday, Saturday, or Sunday night.
function coversWeekend({ checkIn, checkOut }: CouponContext): boolean {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const cur = new Date(start);
  while (cur < end) {
    const d = cur.getDay(); // 0 Sun, 5 Fri, 6 Sat
    if (d === 5 || d === 6 || d === 0) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export const COUPONS: Coupon[] = [
  {
    code: "FON-WEEKEND",
    description: "15% off weekend stays (Fri/Sat/Sun nights).",
    validate: (ctx) => {
      if (!coversWeekend(ctx)) {
        return {
          valid: false,
          reason: "FON-WEEKEND is only valid for stays covering Friday, Saturday or Sunday.",
        };
      }
      return {
        valid: true,
        discount: Math.round(ctx.subtotal * 0.15),
        label: "FON-WEEKEND (15% off)",
        message: "Weekend coupon applied — 15% off room subtotal.",
      };
    },
  },
];

export function applyCoupon(code: string, ctx: CouponContext): CouponResult {
  const normalized = code.trim().toUpperCase();
  const coupon = COUPONS.find((c) => c.code.toUpperCase() === normalized);
  if (!coupon) return { valid: false, reason: "Unknown coupon code." };
  return coupon.validate(ctx);
}
