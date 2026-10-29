import BoardLegal, { H2 } from "@/components/board/BoardLegal";
import { BOARD_PRICE_NGN, BOARD_TRIAL_DAYS } from "@/lib/boardPlan";

export const metadata = { title: "Payments & refunds", alternates: { canonical: "/refunds" } };
const price = `₦${BOARD_PRICE_NGN.toLocaleString("en-NG")}`;

export default function BoardRefundsPage() {
  return (
    <BoardLegal title="Payments & refunds" updated="October 2026">
      <H2>What you pay</H2>
      <p>D-Maths Board costs <b>{price} a month</b>, paid a month at a time through Paystack by card, bank transfer or USSD. Students never pay. You can try everything free for {BOARD_TRIAL_DAYS} days first, so you know it suits you before paying.</p>

      <H2>No automatic charges</H2>
      <p>We never save your card and never charge you without you pressing Pay. Before your month ends we email you a reminder; if you don&apos;t renew, your account simply pauses with your work kept.</p>

      <H2>Refunds</H2>
      <ul>
        <li><b>Charged twice, or charged but your month didn&apos;t start:</b> we refund the extra payment in full, or switch your month on, as soon as we confirm it with Paystack.</li>
        <li><b>Changed your mind:</b> if you ask within 7 days of paying, we refund you in full.</li>
        <li>After 7 days a month&apos;s subscription isn&apos;t refundable, except where the law requires, or where the board was unavailable to you for a long period because of a fault on our side.</li>
        <li>If we close an account for breaking the terms, the unused part of the month isn&apos;t refunded.</li>
      </ul>

      <H2>How to ask</H2>
      <p>Email <b>support@dmaths.academy</b> from your account&apos;s email address with your Paystack reference (it&apos;s on your Billing page and in your receipt). Refunds go back through Paystack to the way you paid, usually within 5–10 working days.</p>
    </BoardLegal>
  );
}
