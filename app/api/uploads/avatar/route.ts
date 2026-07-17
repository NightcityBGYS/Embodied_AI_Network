import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireApiUser } from "@/lib/server-auth";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase-config";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const AVATAR_BUCKET = "avatars";
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function isAllowedAvatarUrl(url = "") {
  return /^\/uploads\/avatars\/[a-zA-Z0-9._-]+\.(jpg|png|webp)$/.test(url);
}

function isAllowedStoragePath(storagePath = "") {
  return (
    !storagePath.startsWith("/") &&
    !storagePath.includes("..") &&
    /^[a-zA-Z0-9/_-]+\.(jpg|png|webp)$/.test(storagePath)
  );
}

function encodeStoragePath(storagePath: string) {
  return storagePath.split("/").map(encodeURIComponent).join("/");
}

function pathFromAvatarUrl(url = "") {
  if (url.startsWith("/api/uploads/avatar?")) {
    const parsed = new URL(url, "https://app.local");
    return parsed.searchParams.get("path") ?? "";
  }
  return "";
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "本地头像由 public/uploads 提供" }, { status: 404 });
  }

  const user = await requireApiUser(request);
  if (user instanceof Response) return user;

  const config = getSupabaseConfig();
  const storagePath = new URL(request.url).searchParams.get("path") ?? "";
  if (!config || !isAllowedStoragePath(storagePath)) {
    return Response.json({ error: "头像地址无效" }, { status: 400 });
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${AVATAR_BUCKET}/${encodeStoragePath(storagePath)}`,
    {
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return Response.json({ error: "头像不存在" }, { status: 404 });
  }

  return new Response(await response.arrayBuffer(), {
    headers: {
      "content-type": response.headers.get("content-type") || "image/webp",
      "cache-control": "private, max-age=300",
    },
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "请上传头像文件" }, { status: 400 });
  }

  const extension = MIME_TO_EXT[file.type];
  if (!extension) {
    return Response.json({ error: "仅支持 JPG、PNG、WebP 头像" }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return Response.json({ error: "头像不能超过 2MB" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  if (isSupabaseConfigured()) {
    const config = getSupabaseConfig();
    const owner = user.id || user.email || user.name || "avatars";
    const storagePath = `${owner.replace(/[^a-zA-Z0-9_-]/g, "-")}/${fileName}`;

    if (!config) {
      return Response.json({ error: "Supabase 未配置" }, { status: 500 });
    }

    const uploadResponse = await fetch(
      `${config.url}/storage/v1/object/${AVATAR_BUCKET}/${encodeStoragePath(storagePath)}`,
      {
        method: "POST",
        headers: {
          apikey: config.serviceRoleKey,
          authorization: `Bearer ${config.serviceRoleKey}`,
          "content-type": file.type,
          "x-upsert": "false",
        },
        body: bytes,
      },
    );

    if (!uploadResponse.ok) {
      return Response.json({ error: "头像上传到 Supabase Storage 失败" }, { status: 500 });
    }

    return Response.json(
      { url: `/api/uploads/avatar?path=${encodeURIComponent(storagePath)}` },
      { status: 201 },
    );
  }

  await mkdir(AVATAR_DIR, { recursive: true });
  await writeFile(path.join(AVATAR_DIR, fileName), bytes);

  return Response.json({ url: `/uploads/avatars/${fileName}` }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;

  const body = (await request.json().catch(() => ({}))) as { url?: string };
  const url = body.url ?? "";

  if (isSupabaseConfigured()) {
    const config = getSupabaseConfig();
    const storagePath = pathFromAvatarUrl(url);

    if (!config || !isAllowedStoragePath(storagePath)) {
      return Response.json({ error: "头像地址无效" }, { status: 400 });
    }

    const response = await fetch(`${config.url}/storage/v1/object/${AVATAR_BUCKET}`, {
      method: "DELETE",
      headers: {
        apikey: config.serviceRoleKey,
        authorization: `Bearer ${config.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prefixes: [storagePath] }),
    });

    if (!response.ok) {
      return Response.json({ error: "头像删除失败" }, { status: 500 });
    }

    return Response.json({ ok: true });
  }

  if (!isAllowedAvatarUrl(url)) {
    return Response.json({ error: "头像地址无效" }, { status: 400 });
  }

  const fileName = path.basename(url);
  await unlink(path.join(AVATAR_DIR, fileName)).catch(() => undefined);
  return Response.json({ ok: true });
}
