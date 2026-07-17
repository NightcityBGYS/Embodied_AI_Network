import { ResearchPoolApp } from "@/components/research-pool-app";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResearchPoolApp initialView="edit" selectedId={id} />;
}
