import { BoardFormPage } from "@/components/board/BoardBrand";
import { BoardSignupForm } from "@/components/board/BoardAuthForms";
import { BOARD_TRIAL_DAYS } from "@/lib/boardPlan";

export const metadata = { title: "Create your account" };

export default function BoardSignupPage() {
  return (
    <BoardFormPage kicker={`${BOARD_TRIAL_DAYS}-day free trial`} title="Create your teacher account">
      <BoardSignupForm />
    </BoardFormPage>
  );
}
