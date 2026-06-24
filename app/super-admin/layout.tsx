import { redirect } from "next/navigation";

export default function SuperAdminLayout() {
  redirect("/admin/companies");
}
