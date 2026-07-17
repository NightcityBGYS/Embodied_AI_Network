import { listActivities } from "@/lib/research-pool-data";
import { requireApiUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  const user = await requireApiUser(request);
  if (user instanceof Response) return user;
  return Response.json({ activities: await listActivities() });
}
