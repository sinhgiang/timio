// Danh sách mặc định dùng trong toàn bộ hệ thống Timio
// Dùng làm gợi ý trong form — người dùng vẫn có thể gõ tùy chỉnh

// ─── Ca làm việc ──────────────────────────────────────────────────────────────

export interface ShiftPreset {
  label: string;
  checkInTime: string;
  checkOutTime: string;
  workDays: string; // "1,2,3,4,5" = T2–T6; 0 = CN
  gracePeriod: number;
}

export const SHIFT_PRESETS: ShiftPreset[] = [
  // Văn phòng / Hành chính
  { label: "Ca hành chính (08:00–17:00, T2–T6)",       checkInTime: "08:00", checkOutTime: "17:00", workDays: "1,2,3,4,5",   gracePeriod: 5  },
  { label: "Ca hành chính sớm (07:30–16:30, T2–T6)",   checkInTime: "07:30", checkOutTime: "16:30", workDays: "1,2,3,4,5",   gracePeriod: 5  },
  { label: "Ca hành chính muộn (09:00–18:00, T2–T6)",  checkInTime: "09:00", checkOutTime: "18:00", workDays: "1,2,3,4,5",   gracePeriod: 10 },
  { label: "Ca 6 ngày (08:00–17:00, T2–T7)",           checkInTime: "08:00", checkOutTime: "17:00", workDays: "1,2,3,4,5,6", gracePeriod: 5  },
  { label: "Ca 7 ngày (08:00–17:00, T2–CN)",           checkInTime: "08:00", checkOutTime: "17:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 10 },

  // Bán lẻ / Siêu thị / Cửa hàng
  { label: "Ca sáng bán lẻ (07:00–15:00, T2–CN)",      checkInTime: "07:00", checkOutTime: "15:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 5  },
  { label: "Ca chiều bán lẻ (14:00–22:00, T2–CN)",     checkInTime: "14:00", checkOutTime: "22:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 10 },

  // Nhà hàng / F&B / Khách sạn
  { label: "Ca nhà hàng sáng (06:00–14:00, T2–CN)",    checkInTime: "06:00", checkOutTime: "14:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 10 },
  { label: "Ca nhà hàng chiều (13:00–21:00, T2–CN)",   checkInTime: "13:00", checkOutTime: "21:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 10 },
  { label: "Ca nhà hàng tối (17:00–23:00, T2–CN)",     checkInTime: "17:00", checkOutTime: "23:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 15 },

  // Sản xuất / Nhà máy
  { label: "Ca 1 sản xuất (06:00–14:00, T2–T7)",       checkInTime: "06:00", checkOutTime: "14:00", workDays: "1,2,3,4,5,6", gracePeriod: 5  },
  { label: "Ca 2 sản xuất (14:00–22:00, T2–T7)",       checkInTime: "14:00", checkOutTime: "22:00", workDays: "1,2,3,4,5,6", gracePeriod: 5  },
  { label: "Ca đêm sản xuất (22:00–06:00, T2–T7)",     checkInTime: "22:00", checkOutTime: "06:00", workDays: "1,2,3,4,5,6", gracePeriod: 10 },

  // Y tế / Bệnh viện
  { label: "Ca y tế sáng (07:00–13:00, T2–CN)",        checkInTime: "07:00", checkOutTime: "13:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 5  },
  { label: "Ca y tế chiều (13:00–18:00, T2–CN)",       checkInTime: "13:00", checkOutTime: "18:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 5  },
  { label: "Ca trực đêm (18:00–07:00, T2–CN)",         checkInTime: "18:00", checkOutTime: "07:00", workDays: "1,2,3,4,5,6,0", gracePeriod: 15 },
];

// ─── Phòng ban ─────────────────────────────────────────────────────────────────

export const DEPARTMENT_PRESETS: string[] = [
  // Cốt lõi — mọi quy mô
  "Ban Giám đốc",
  "Kinh doanh",
  "Marketing",
  "Kế toán - Tài chính",
  "Nhân sự - Hành chính",
  "Kỹ thuật - IT",
  "Chăm sóc khách hàng",
  "Mua hàng - Kho",
  "Pháp chế",
  "Nghiên cứu & Phát triển",

  // Du lịch / Khách sạn
  "Lễ tân",
  "Hướng dẫn viên",
  "Buồng phòng",
  "Bếp",
  "Bảo vệ",

  // Sản xuất
  "Xưởng sản xuất",
  "Kiểm soát chất lượng",
  "Kho vận - Logistics",
  "Bảo trì",

  // Bán lẻ
  "Thu ngân",
  "Giao hàng",

  // Y tế
  "Khám bệnh",
  "Điều dưỡng",
  "Dược",

  // Giáo dục
  "Giảng dạy",
  "Hỗ trợ học vụ",
];

// ─── Chức vụ ───────────────────────────────────────────────────────────────────

export const POSITION_PRESETS: string[] = [
  // Thực tập / Thời vụ
  "Thực tập sinh",
  "Cộng tác viên",
  "Nhân viên thời vụ",

  // Nhân viên
  "Nhân viên",
  "Chuyên viên",
  "Kỹ thuật viên",
  "Kế toán viên",
  "Nhân viên kinh doanh",
  "Nhân viên kỹ thuật",

  // Nhân viên cao cấp
  "Chuyên viên cao cấp",
  "Kỹ sư",
  "Kế toán trưởng",

  // Quản lý cấp thấp
  "Tổ trưởng",
  "Nhóm trưởng",
  "Trưởng ca",

  // Quản lý trung cấp
  "Phó Trưởng phòng",
  "Trưởng phòng",
  "Quản lý",

  // Cấp cao
  "Phó Giám đốc",
  "Giám đốc bộ phận",
  "Giám đốc Chi nhánh",

  // Ban lãnh đạo
  "Giám đốc",
  "Phó Tổng Giám đốc",
  "Tổng Giám đốc",
];
