import { Wallet, TrendingUp, GraduationCap, Plane, Utensils, Gift, Heart, Clock, Shield, Users, Star, Home, type LucideIcon } from "lucide-react";

export type Perk = { icon: string; label: string };

const MAP: Record<string, LucideIcon> = {
  wallet: Wallet, growth: TrendingUp, training: GraduationCap, travel: Plane, food: Utensils,
  gift: Gift, heart: Heart, clock: Clock, shield: Shield, team: Users, home: Home, star: Star,
};

// Danh sách để owner chọn khi thêm perk
export const PERK_OPTIONS: { icon: string; label: string }[] = [
  { icon: "wallet", label: "Lương thưởng tốt" },
  { icon: "growth", label: "Cơ hội thăng tiến" },
  { icon: "training", label: "Đào tạo bài bản" },
  { icon: "travel", label: "Du lịch hàng năm" },
  { icon: "food", label: "Bao ăn ca" },
  { icon: "gift", label: "Thưởng lễ, Tết" },
  { icon: "heart", label: "Môi trường thân thiện" },
  { icon: "clock", label: "Giờ giấc linh hoạt" },
  { icon: "shield", label: "Bảo hiểm đầy đủ" },
  { icon: "team", label: "Đồng đội gắn kết" },
  { icon: "home", label: "Chỗ ở / hỗ trợ nhà" },
  { icon: "star", label: "Phúc lợi khác" },
];

export function PerkIcon({ icon, size = 18, className }: { icon: string; size?: number; className?: string }) {
  const Ico = MAP[icon] || Star;
  return <Ico size={size} className={className} strokeWidth={1.6} />;
}
