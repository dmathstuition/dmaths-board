import { http, HttpResponse } from "msw";

const PAYSTACK_BASE = "https://api.paystack.co/transaction/verify";
const EMAIL_RELAY = "https://script.google.com/fake";

export const defaultHandlers = [
  // Default: successful Paystack verification for 15000 NGN (1500000 kobo)
  http.get(`${PAYSTACK_BASE}/:reference`, () => {
    return HttpResponse.json({
      status: true,
      data: {
        status: "success",
        amount: 1500000,
        customer: { email: "student@test.com" },
      },
    });
  }),

  // Default: email relay succeeds
  http.post(EMAIL_RELAY, () => {
    return HttpResponse.json({ ok: true });
  }),
];
