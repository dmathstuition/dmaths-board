import { BoardFormPage } from "@/components/board/BoardBrand";
import ClassCheck from "@/components/board/ClassCheck";

export const metadata = { title: "Check my class" };

export default function ClassCheckPage() {
  return (
    <BoardFormPage title="Check my class" kicker="Live board, slides and uploads">
      <ClassCheck />
    </BoardFormPage>
  );
}
