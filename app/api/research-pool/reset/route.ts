import { resetResearchPoolState } from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const state = resetResearchPoolState(user);
  if (!state) {
    return Response.json(
      { error: "Supabase 模式下不支持一键重置生产数据" },
      { status: 400 },
    );
  }
  return Response.json(state);
}
