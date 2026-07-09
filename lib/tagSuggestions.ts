// Gợi ý thẻ (tag) — SEO hai chiều: người tìm việc gắn kỹ năng, nhà tuyển dụng gắn thẻ cho tin.
// Hiển thị dạng "thẻ" (không có dấu #).

// Cho NGƯỜI TÌM VIỆC (kỹ năng / phẩm chất / mong muốn)
export const WORKER_TAG_SUGGESTIONS: string[] = [
  "chăm chỉ", "đúng giờ", "trung thực", "nhanh nhẹn", "chịu khó", "giao tiếp tốt",
  "có kinh nghiệm", "làm việc nhóm", "có xe máy", "biết tiếng Anh", "tin học văn phòng",
  "làm ca tối", "làm cuối tuần", "làm full-time", "làm part-time",
  "bán hàng", "chăm sóc khách hàng", "pha chế", "nấu ăn", "phục vụ", "thu ngân",
  "lái xe", "giao hàng", "kho vận", "lễ tân", "marketing", "content", "livestream",
  "chạy quảng cáo", "thiết kế", "sửa chữa", "kỹ thuật",
];

// Cho NHÀ TUYỂN DỤNG (thẻ gắn vào tin tuyển dụng để người tìm việc dễ thấy)
export const JOB_TAG_SUGGESTIONS: string[] = [
  "không cần kinh nghiệm", "có đào tạo", "lương cao", "thưởng hấp dẫn", "bao ăn ở",
  "part-time", "full-time", "ca tối", "làm theo ca", "giờ hành chính", "làm cuối tuần",
  "marketing", "bán hàng", "bán hàng online", "tiktok", "shopee", "tiếp thị liên kết",
  "chạy quảng cáo", "content", "livestream", "thiết kế", "chăm sóc khách hàng",
  "kho vận", "giao hàng", "phục vụ", "pha chế", "đầu bếp", "lễ tân", "thu ngân",
  "sinh viên làm thêm", "tuyển gấp", "đi làm ngay",
];

// Chuẩn hoá 1 thẻ: bỏ dấu #, cắt khoảng trắng, giới hạn độ dài
export const cleanTag = (s: string) => s.trim().replace(/^#+/, "").slice(0, 40);
