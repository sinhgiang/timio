import {
  Zap, Camera, Users, Building2, BarChart3, FileText,
  Umbrella, CalendarDays, MessageSquare, Gift, type LucideIcon,
} from "lucide-react";

export const ARTICLES: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: "getting-started", label: "Bắt đầu nhanh", Icon: Zap },
  { slug: "kiosk", label: "Máy chấm công", Icon: Camera },
  { slug: "employees", label: "Nhân viên", Icon: Users },
  { slug: "branches", label: "Chi nhánh & Ca làm", Icon: Building2 },
  { slug: "reports", label: "Báo cáo tháng", Icon: BarChart3 },
  { slug: "payslip", label: "Phiếu lương", Icon: FileText },
  { slug: "leave", label: "Nghỉ phép", Icon: Umbrella },
  { slug: "holidays", label: "Lịch nghỉ lễ", Icon: CalendarDays },
  { slug: "telegram", label: "Thông báo Telegram", Icon: MessageSquare },
  { slug: "salary13", label: "Lương tháng 13", Icon: Gift },
];
