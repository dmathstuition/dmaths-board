import HostRoom from "@/components/live/HostRoom";
import { boardPage } from "@/lib/boardPages";

export const dynamic = "force-dynamic";
export const metadata = { title: "Class" };

export default async function BoardHostPage({ params }: { params: { id: string } }) {
  await boardPage();
  return <HostRoom id={params.id} base="/app" />;
}
