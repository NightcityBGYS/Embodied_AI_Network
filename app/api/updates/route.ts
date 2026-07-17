import {
  createUpdate,
  listUpdates,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { WorkUpdate } from "@/lib/research-pool-types";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  const url = new URL(request.url);
  return Response.json({
    updates: await listUpdates({
      date: url.searchParams.get("date") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      updateType: url.searchParams.get("updateType") ?? undefined,
      person: url.searchParams.get("person") ?? undefined,
      organization: url.searchParams.get("organization") ?? undefined,
    }),
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as { update: Partial<WorkUpdate> };
  const update = await createUpdate({ update: body.update ?? {} }, user);
  return Response.json({ update }, { status: 201 });
}
