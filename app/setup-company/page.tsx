import { redirect } from "next/navigation";

// Trang này đã được thay bằng modal trong dashboard
export default function SetupCompanyPage() {
  redirect("/dashboard");
}
