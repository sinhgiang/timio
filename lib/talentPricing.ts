// Bảng giá credit cộng đồng ứng viên (1 credit = 1 lượt mở khóa liên hệ)
// Giá tham chiếu thị trường VN (~ TopCV): 15-20k/lượt, gói lớn rẻ hơn.
export interface CreditPack {
  id: string;
  credits: number;
  price: number; // VND
  label: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c10", credits: 10, price: 200000, label: "10 lượt" },
  { id: "c30", credits: 30, price: 540000, label: "30 lượt" }, // ~18k/lượt (-10%)
  { id: "c50", credits: 50, price: 850000, label: "50 lượt" }, // 17k/lượt (-15%)
  { id: "c100", credits: 100, price: 1600000, label: "100 lượt" }, // 16k/lượt (-20%)
];

export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}
