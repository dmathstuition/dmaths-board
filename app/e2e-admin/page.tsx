import { notFound } from "next/navigation";
import AdminDashboard from "@/components/board/AdminDashboard";

// The admin dashboard without a sign-in, for the automated browser tests only.
// It exists solely when the server runs with E2E_TEST_PAGES=1; elsewhere it is a 404.
export const dynamic = "force-dynamic";

export default function E2EAdminPage() {
  if (process.env.E2E_TEST_PAGES !== "1") notFound();
  return <div className="min-h-dvh bg-dmb-paper"><main className="mx-auto max-w-7xl px-3 py-6 sm:px-4"><AdminDashboard /></main></div>;
}
