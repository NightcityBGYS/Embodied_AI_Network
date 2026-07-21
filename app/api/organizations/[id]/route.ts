import {
  deleteOrganization,
  patchOrganization,
} from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { ResearchOrganization } from "@/lib/research-pool-types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const { id } = await params;
  const body = (await request.json()) as {
    organization: Partial<ResearchOrganization>;
  };
  const organization = await patchOrganization(
    id,
    { organization: body.organization ?? {} },
    user,
  );
  if (!organization) {
    return Response.json({ error: "组织不存在" }, { status: 404 });
  }
  return Response.json({ organization });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const { id } = await params;
  const organization = await deleteOrganization(id, user);
  if (!organization) {
    return Response.json({ error: "组织不存在" }, { status: 404 });
  }
  return Response.json({ organization });
}
