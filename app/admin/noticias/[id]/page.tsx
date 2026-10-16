import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ArticleForm } from "@/components/article-form";
import { getAdminSession } from "@/lib/admin-auth";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: logs } = await supabase.from("article_processing_logs").select("id,stage,status,message,created_at").eq("article_id", id).order("created_at", { ascending: false }).limit(20);
  return <AdminShell email={admin.email} title="Editar matéria" eyebrow="REDAÇÃO"><ArticleForm article={data as unknown as Article} processingLogs={logs || []}/></AdminShell>;
}
