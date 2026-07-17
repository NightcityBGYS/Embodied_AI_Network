import {
  archivePerson,
  deletePerson,
  getPerson,
  patchPerson,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const { id } = await context.params;
  const person = await getPerson(id);
  if (!person) {
    return Response.json({ error: "人员不存在" }, { status: 404 });
  }
  return Response.json({ person });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as {
    patch: Record<string, unknown>;
    action?: string;
    summary?: string;
    before?: string;
    after?: string;
  };
  const person = await patchPerson(id, body, user);
  if (!person) {
    return Response.json({ error: "人员不存在" }, { status: 404 });
  }
  return Response.json({ person });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const shouldDelete = new URL(request.url).searchParams.get("hard") === "true";
  const person = shouldDelete
    ? await deletePerson(id, user)
    : await archivePerson(id, user);
  if (!person) {
    return Response.json({ error: "人员不存在" }, { status: 404 });
  }
  return Response.json({ person });
}
