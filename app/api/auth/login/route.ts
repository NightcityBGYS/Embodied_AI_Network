import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase-config";
import {
  getInvitedUserByEmail,
  setEmailSessionCookie,
} from "@/lib/server-auth";

type LoginBody = {
  email?: string;
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({
      user: { name: "Eric", role: "Admin" },
      authRequired: false,
    });
  }

  const config = getSupabaseConfig();
  const body = (await request.json().catch(() => ({}))) as LoginBody;
  const email = body.email?.trim();

  if (!config || !email) {
    return Response.json({ error: "请输入邮箱" }, { status: 400 });
  }

  const user = await getInvitedUserByEmail(email);
  if (!user) {
    return Response.json(
      { error: "该邮箱未受邀，请联系管理员" },
      { status: 401 },
    );
  }

  const loginResponse = Response.json({ ok: true });
  await setEmailSessionCookie(loginResponse, user);
  return loginResponse;
}
