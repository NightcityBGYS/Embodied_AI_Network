import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase-config";
import { setAuthCookies } from "@/lib/server-auth";

type LoginBody = {
  email?: string;
  password?: string;
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
  const password = body.password ?? "";

  if (!config || !email || !password) {
    return Response.json({ error: "请输入邮箱和密码" }, { status: 400 });
  }

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    msg?: string;
  };

  if (!response.ok || !data.access_token || !data.refresh_token) {
    return Response.json(
      { error: data.error_description || data.msg || "登录失败，请检查账号" },
      { status: 401 },
    );
  }

  const loginResponse = Response.json({ ok: true });
  setAuthCookies(loginResponse, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  });
  return loginResponse;
}

