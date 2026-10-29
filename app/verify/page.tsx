import { redirect } from "next/navigation";
import { BoardFormPage } from "@/components/board/BoardBrand";
import { BoardVerifyForm } from "@/components/board/BoardAuthForms";
import { currentBoardTeacher } from "@/lib/boardAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm your email" };

export default async function BoardVerifyPage() {
  const t = await currentBoardTeacher();
  if (!t) redirect("/login");
  if (t.account.email_verified_at) redirect("/app");
  return (
    <BoardFormPage kicker="One last step" title="Confirm your email">
      <BoardVerifyForm email={t.email} />
    </BoardFormPage>
  );
}
