import { redirect } from "next/navigation";
import BoardAppNav from "@/components/board/BoardAppNav";
import { currentBoardViewer } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

// The teacher's side of D-Maths Board: board teachers, and academy admins
// (other academy accounts have their own portals). Each page also checks the subscription (lib/boardPages).
export default async function BoardAppLayout({ children }: { children: React.ReactNode }) {
  const t = await currentBoardViewer();
  if (!t) redirect("/login");
  if (t.access.state === "unverified") redirect("/verify");
  const badge = t.isAdmin ? "Admin" : t.access.state === "trial" ? `Free trial · ${t.access.daysLeft} day${t.access.daysLeft === 1 ? "" : "s"} left`
    : t.access.state === "expired" ? "Subscription ended" : t.access.state === "suspended" ? "Account on hold" : null;
  return (
    <div className="dmb-sky min-h-dvh">
      <BoardAppNav name={`${t.firstName} ${t.lastName}`.trim()} badge={badge} isAdmin={t.isAdmin} />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6">{children}</main>
    </div>
  );
}
