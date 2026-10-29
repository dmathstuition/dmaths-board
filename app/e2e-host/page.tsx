import { notFound } from "next/navigation";
import HostRoom from "@/components/live/HostRoom";

// The teacher's class screen without a sign-in, for the automated browser
// tests in e2e/ only. It exists solely when the server runs with
// E2E_TEST_PAGES=1 (the test runner sets it); everywhere else it is a 404.
export const dynamic = "force-dynamic";

export default function E2EHostPage({ searchParams }: { searchParams: { id?: string } }) {
  if (process.env.E2E_TEST_PAGES !== "1") notFound();
  return <div className="p-3"><HostRoom id={searchParams.id ?? "11111111-1111-1111-1111-111111111111"} base="/app" /></div>;
}
