import {
  Zap, Camera, Users, Building2, BarChart3, FileText,
  Umbrella, CalendarDays, MessageSquare, Gift, Banknote,
  Bell, Layers, Shield, ScrollText, User, type LucideIcon,
} from "lucide-react";

export const ARTICLES: { slug: string; label: string; Icon: LucideIcon; badge?: string }[] = [
  { slug: "getting-started", label: "Bắt đầu nhanh", Icon: Zap },
  { slug: "kiosk", label: "Máy chấm công", Icon: Camera },
  { slug: "employees", label: "Nhân viên", Icon: Users },
  { slug: "branches", label: "Chi nhánh & Ca làm", Icon: Building2 },
  { slug: "reports", label: "Báo cáo tháng", Icon: BarChart3 },
  { slug: "branch-reports", label: "Báo cáo đa chi nhánh", Icon: Layers, badge: "Business" },
  { slug: "payslip", label: "Phiếu lương", Icon: FileText },
  { slug: "salary-payment", label: "Thanh toán lương", Icon: Banknote, badge: "Mới" },
  { slug: "leave", label: "Nghỉ phép", Icon: Umbrella },
  { slug: "holidays", label: "Lịch nghỉ lễ", Icon: CalendarDays },
  { slug: "telegram", label: "Thông báo Telegram", Icon: MessageSquare },
  { slug: "late-alert", label: "Cảnh báo đi trễ tự động", Icon: Bell, badge: "Mới" },
  { slug: "contracts", label: "Hợp đồng lao động", Icon: ScrollText, badge: "Business" },
  { slug: "permissions", label: "Phân quyền quản lý", Icon: Shield },
  { slug: "employee-portal", label: "Cổng thông tin NV", Icon: User },
  { slug: "salary13", label: "Lương tháng 13", Icon: Gift },
];
