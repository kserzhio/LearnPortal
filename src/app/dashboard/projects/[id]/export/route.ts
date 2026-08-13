import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadCompletedProjectExport } from "@/features/final-projects/persistence/completed-projects";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createSupabaseServerClient();
  if (!supabase) return new Response("Service unavailable", { status: 503 });
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return new Response("Unauthorized", { status: 401 });
  const artifact = await loadCompletedProjectExport(supabase, user.id, id);
  if (!artifact) return new Response("Not found", { status: 404 });
  return new Response(JSON.stringify(artifact.document, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${artifact.project.slug}-v${artifact.project.contentVersion}.json"`, "Cache-Control": "private, no-store" } });
}
