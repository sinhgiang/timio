// Quy tắc hiển thị tên ứng viên trên trang công khai /ung-vien
// - Đang LÀM VIỆC (active) tại một công ty nào đó mà bật "đang tìm việc" → CHE NỬA TÊN
//   (bảo vệ họ: công ty hiện tại không nhận ra họ đang tìm việc mới).
// - Không đang làm ở đâu / đã nghỉ việc → HIỆN ĐẦY ĐỦ.
export function candidateDisplayName(fullName: string, currentlyEmployed: boolean): string {
  const name = (fullName || "").trim();
  if (!currentlyEmployed) return name;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name ? name[0] + "." : "Ẩn danh";
  // Giữ nguyên họ + đệm, chỉ để chữ cái đầu của TÊN (từ cuối) + dấu chấm
  const last = parts[parts.length - 1];
  return [...parts.slice(0, -1), last[0] + "."].join(" ");
}
