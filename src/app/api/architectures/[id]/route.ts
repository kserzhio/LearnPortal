import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, context: RouteContext<"/api/architectures/[id]">) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Запит відхилено." }, 403);
  const { id } = await context.params;
  if (!UUID.test(id)) return json({ error: "Некоректний ідентифікатор." }, 400);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return json({ error: "Синхронізація ще не налаштована." }, 503);
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return json({ error: "Потрібно увійти для синхронізації." }, 401);

  const { data, error } = await supabase
    .from("saved_architectures")
    .delete()
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .select("id");

  if (error) return json({ error: "Не вдалося видалити архітектуру." }, 500);
  if (!data?.length) return json({ error: "Архітектуру не знайдено." }, 404);
  return json({ deleted: id });
}
