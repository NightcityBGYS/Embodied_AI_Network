import { getRequestUser } from "@/lib/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase-config";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return Response.json(
      { error: "请先登录", authRequired: isSupabaseConfigured() },
      { status: 401 },
    );
  }

  return Response.json({
    user,
    authRequired: isSupabaseConfigured(),
  });
}

