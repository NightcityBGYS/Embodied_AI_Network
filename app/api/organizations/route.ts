import { createOrganization, listOrganizations } from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";
import type { ResearchOrganization } from "@/lib/research-pool-types";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  return Response.json({ organizations: await listOrganizations() });
}

export async function POST(request: Request) {
  const user = await requireApiUser(request, "write");
  if (user instanceof Response) return user;
  const body = (await request.json()) as {
    organization: Partial<ResearchOrganization>;
  };
  const organization = await createOrganization(
    { organization: body.organization ?? {} },
    user,
  );
  return Response.json({ organization }, { status: 201 });
}
