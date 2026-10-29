import BoardLegal, { H2 } from "@/components/board/BoardLegal";

export const metadata = { title: "Privacy", alternates: { canonical: "/privacy" } };

export default function BoardPrivacyPage() {
  return (
    <BoardLegal title="Privacy" updated="October 2026">
      <p>This explains what D-Maths Board collects, why, and what you can ask us to do with it. It covers the board only; Novelia Academy&apos;s tuition has its own privacy policy. We follow the Nigeria Data Protection Act 2023.</p>

      <H2>Teachers</H2>
      <ul>
        <li><b>Account:</b> your name, email address, password (stored only in a scrambled form we can&apos;t read), and — if you give them — your school and phone number.</li>
        <li><b>Payments:</b> Paystack takes your payment. We receive the payment reference, amount and date, never your card details.</li>
        <li><b>Your work:</b> lessons, slides, quizzes and saved boards, so you can use them again.</li>
        <li><b>Security records:</b> sign-ins, sign-ups and payments are logged so we can spot misuse.</li>
      </ul>

      <H2>Students</H2>
      <ul>
        <li>Students don&apos;t make accounts. We keep only the <b>first name they type</b> when joining, which class they joined, and what they do in it — raised hands, answers to quizzes and answer boards, and anything they write on the board when the teacher allows it.</li>
        <li>Joining sets a small cookie on the student&apos;s device so they stay in the class if the page reloads. It lasts 12 hours and contains no personal details.</li>
        <li>Only the student&apos;s teacher sees their name and answers. We don&apos;t use students&apos; information for advertising, and we don&apos;t sell anyone&apos;s information.</li>
      </ul>

      <H2>Why we use it</H2>
      <p>To run the board and your classes, take payments, send account emails (your sign-up code, receipts and renewal reminders), keep the service secure, and fix problems. We rely on our agreement with teachers to provide the service, and on our legitimate interest in keeping it safe.</p>

      <H2>Who else handles it</H2>
      <p>Trusted providers that run parts of the service for us: Supabase (database and storage), Vercel (hosting), Paystack (payments) and our email provider. They may process data outside Nigeria under appropriate safeguards and only on our instructions.</p>

      <H2>How long we keep it</H2>
      <ul>
        <li>Teacher accounts and their work: while the account exists, and up to 12 months after it is closed (payment records for as long as tax law requires).</li>
        <li>Students&apos; names and answers: with the class they belong to. A teacher can delete a class at any time, which removes them.</li>
      </ul>

      <H2>Your choices</H2>
      <p>You can ask to see, correct, download or delete your information, or object to how we use it, by emailing <b>support@dmaths.academy</b>. For a student, a parent or the teacher can ask. You can also complain to the Nigeria Data Protection Commission.</p>
    </BoardLegal>
  );
}
