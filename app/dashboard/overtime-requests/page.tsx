import { redirect } from "next/navigation";

// Đã gộp "Duyệt tăng ca" vào mục "Tăng ca" — điều hướng để giữ link/bookmark cũ còn dùng được.
export default function OvertimeRequestsPage() {
  redirect("/dashboard/overtime");
}
