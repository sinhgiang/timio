// Dùng ở trang "Lịch phân ca" (app/dashboard/shifts) — trước đây trang này KHÔNG hề biết gì về
// đơn nghỉ phép đã duyệt, nên sếp có thể xếp ca làm việc ngay đúng ngày nhân viên đã được duyệt
// nghỉ mà không có cảnh báo gì (phản hồi 10/9/2026: "cho nhân viên nghỉ 1 ngày... nhưng nếu tôi
// cho hôm đó đi làm, có xung đột gì không?" — hiện tại KHÔNG, đây là lỗ hổng thật). Hàm này gom 1
// danh sách LeaveRequest đã duyệt (type="approved") thành map `${employeeId}__${date}` -> loại
// nghỉ, để trang lịch phân ca tô đỏ/cảnh báo đúng ô ngày bị trùng.
export interface ApprovedLeaveRow {
  employeeId: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  type: string;
  dates: string | null; // JSON string[] — chỉ có khi type="holiday" (nghỉ lễ tự chọn, có thể không liền ngày)
}

export function expandApprovedLeaveByCell(
  leaves: ApprovedLeaveRow[],
  rangeStart: string,
  rangeEnd: string
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const lr of leaves) {
    const days: string[] = [];
    if (lr.dates) {
      try {
        const arr = JSON.parse(lr.dates) as string[];
        days.push(...arr.filter((d) => d >= rangeStart && d <= rangeEnd));
      } catch {
        // dates hỏng định dạng — bỏ qua, không chặn cả trang
      }
    } else {
      let d = lr.fromDate > rangeStart ? lr.fromDate : rangeStart;
      const end = lr.toDate < rangeEnd ? lr.toDate : rangeEnd;
      while (d <= end) {
        days.push(d);
        const dt = new Date(d);
        dt.setDate(dt.getDate() + 1);
        d = dt.toISOString().slice(0, 10);
      }
    }
    for (const day of days) map[`${lr.employeeId}__${day}`] = lr.type;
  }
  return map;
}
