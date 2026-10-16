import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ArticleForm } from "@/components/article-form";
import { getAdminSession } from "@/lib/admin-auth";

export default async function NewArticlePage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  return <AdminShell email={admin.email} title="Nova matéria" eyebrow="REDAÇÃO"><ArticleForm/></AdminShell>;
}
