import BoardLegal, { H2 } from "@/components/board/BoardLegal";
import { BOARD_PRICE_NGN, BOARD_TRIAL_DAYS } from "@/lib/boardPlan";

export const metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };
const price = `₦${BOARD_PRICE_NGN.toLocaleString("en-NG")}`;

export default function BoardTermsPage() {
  return (
    <BoardLegal title="Terms of use" updated="October 2026">
      <p>These terms cover D-Maths Board, the live interactive whiteboard run by Novelia Academy (&ldquo;we&rdquo;, &ldquo;us&rdquo;) at dmaths.academy. They are separate from the terms for Novelia Academy&apos;s tuition. By creating a teacher account, or by joining a class as a student, you agree to them.</p>

      <H2>Who can use D-Maths Board</H2>
      <ul>
        <li><b>Teachers</b> create an account with a real name and an email address they control. You must be 18 or older and keep your password private. One account is for one teacher — please don&apos;t share it.</li>
        <li><b>Students</b> join a teacher&apos;s class with the class PIN and a first name. Students don&apos;t create accounts. The teacher running the class is responsible for who they invite.</li>
      </ul>

      <H2>Free trial and subscription</H2>
      <ul>
        <li>A new teacher account gets a {BOARD_TRIAL_DAYS}-day free trial once the email address is confirmed. No card is needed.</li>
        <li>After the trial, a subscription costs <b>{price} a month</b>, paid a month at a time through Paystack. Any trial or paid days you have left are added on to the new month.</li>
        <li><b>Nothing renews automatically.</b> We never store your card. We email you before your month ends; if you don&apos;t renew, the account pauses and your saved lessons, quizzes and boards are kept.</li>
        <li>We may change the price for future months. A change never affects time you have already paid for, and we will tell you before it applies to you.</li>
      </ul>

      <H2>Your content</H2>
      <p>Slides, lessons, quizzes and anything written on your boards stay yours. You give us permission only to store them and show them to you and your students so the service works. Only upload material you have the right to use. We don&apos;t share your lessons with other teachers.</p>

      <H2>Using the board responsibly</H2>
      <p>Please don&apos;t use D-Maths Board to:</p>
      <ul>
        <li>share anything unlawful, hateful, sexual, violent or otherwise unsuitable for students;</li>
        <li>bully, harass or collect personal information from students beyond what a class needs;</li>
        <li>try to break, overload, copy or get around the security of the service, or access accounts or classes that aren&apos;t yours;</li>
        <li>resell or rent your account to others.</li>
      </ul>
      <p>Teachers are responsible for what happens in their classes, including removing a student who misbehaves (the board lets you do this at any time).</p>

      <H2>Holds and closing an account</H2>
      <p>We may put an account on hold, or close it, if these terms are broken, if a payment is reversed, or to protect students or the service. Where we can, we&apos;ll tell you why first. You can ask us to close your account at any time by emailing support@dmaths.academy.</p>

      <H2>Availability</H2>
      <p>We work hard to keep the board running and your work saved, but we can&apos;t promise it will never be interrupted — for example by internet outages or maintenance. Keep your own copies of important slides. To the extent the law allows, our total responsibility to you for any claim is limited to what you paid us in the 12 months before it.</p>

      <H2>Changes and law</H2>
      <p>If we change these terms in a way that matters, we&apos;ll email teachers before the change applies. These terms are governed by the laws of the Federal Republic of Nigeria.</p>

      <H2>Contact</H2>
      <p>Questions about these terms: <b>support@dmaths.academy</b>.</p>
    </BoardLegal>
  );
}
