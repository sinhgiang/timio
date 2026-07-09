// Điểm tin cậy Timio — tính từ dữ liệu chấm công THẬT. NV sở hữu; có lợi cho NV (mang đi xin việc, ứng lương tốt hơn).

export type TrustLevel = "new" | "bronze" | "silver" | "gold";

export interface TrustScore {
  score: number | null;                 // 0-100, null nếu chưa có ngày công
  level: TrustLevel;
  levelLabel: string;
  parts: { punctuality: number; consistency: number; tenure: number }; // đóng góp từng phần
}

const VOLUME_TARGET = 60;   // ~3 tháng đi làm đều đặn = tối đa phần "chuyên cần"
const TENURE_TARGET = 12;   // 12 tháng gắn bó = tối đa phần "gắn bó"

export interface TrustInput {
  punctualityRate: number | null; // % ngày đúng giờ
  totalDaysWorked: number;
  experienceMonths: number;
}

export function computeTrustScore(v: TrustInput): TrustScore {
  if (!v.totalDaysWorked || v.totalDaysWorked <= 0) {
    return { score: null, level: "new", levelLabel: "Hồ sơ mới", parts: { punctuality: 0, consistency: 0, tenure: 0 } };
  }
  const punctuality = Math.round(((v.punctualityRate ?? 0) / 100) * 50);          // 0-50: tín hiệu chính
  const consistency = Math.round(Math.min(v.totalDaysWorked / VOLUME_TARGET, 1) * 25); // 0-25: đi làm đều
  const tenure = Math.round(Math.min(v.experienceMonths / TENURE_TARGET, 1) * 25);     // 0-25: gắn bó
  const score = Math.min(100, punctuality + consistency + tenure);
  const level: TrustLevel = score >= 85 ? "gold" : score >= 70 ? "silver" : "bronze";
  const levelLabel = level === "gold" ? "Vàng · Rất đáng tin" : level === "silver" ? "Bạc · Đáng tin" : "Đồng · Đang xây uy tín";
  return { score, level, levelLabel, parts: { punctuality, consistency, tenure } };
}

// Map điểm số có sẵn (vd vScore của cựu NV) → hạng + nhãn, DÙNG CHUNG với computeTrustScore để đồng nhất.
export function levelFromScore(score: number | null): { level: TrustLevel; levelLabel: string } {
  if (score == null) return { level: "new", levelLabel: "Hồ sơ mới" };
  const level: TrustLevel = score >= 85 ? "gold" : score >= 70 ? "silver" : "bronze";
  const levelLabel = level === "gold" ? "Vàng · Rất đáng tin" : level === "silver" ? "Bạc · Đáng tin" : "Đồng · Đang xây uy tín";
  return { level, levelLabel };
}

// Gợi ý tăng điểm (khung có lợi cho NV)
export function trustTips(v: TrustInput, ts: TrustScore): string[] {
  const tips: string[] = [];
  if (ts.score === null) { tips.push("Bắt đầu chấm công đều để xây điểm tin cậy."); return tips; }
  if ((v.punctualityRate ?? 0) < 95) tips.push("Đi làm đúng giờ để tăng phần điểm lớn nhất.");
  if (v.totalDaysWorked < VOLUME_TARGET) tips.push(`Đi làm thêm ${VOLUME_TARGET - v.totalDaysWorked} ngày nữa để đạt tối đa phần chuyên cần.`);
  if (v.experienceMonths < TENURE_TARGET) tips.push("Gắn bó lâu dài giúp điểm gắn bó tăng dần.");
  if (tips.length === 0) tips.push("Tuyệt vời! Giữ phong độ để duy trì hạng cao.");
  return tips;
}

// GĐ3: điểm cao → được ứng lương nhiều hơn (cộng thêm % vào hạn mức EWA).
export function ewaBoostPercent(level: TrustLevel): number {
  return level === "gold" ? 15 : level === "silver" ? 5 : 0;
}
