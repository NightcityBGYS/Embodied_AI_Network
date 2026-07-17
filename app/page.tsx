import { ResearchPoolApp } from "@/components/research-pool-app";

export const dynamic = "force-dynamic";

export default function Home() {
  return <ResearchPoolApp initialView="dashboard" />;
}
