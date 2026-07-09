// 34 tỉnh/thành Việt Nam sau sáp nhập 1/7/2025 (28 tỉnh + 6 TP TW), nhóm theo miền.
// Nguồn: Nghị quyết sắp xếp ĐVHC 2025 (chinhphu.vn).
export const VN_REGIONS: { label: string; provinces: string[] }[] = [
  { label: "Miền Bắc", provinces: ["Hà Nội", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Hưng Yên", "Ninh Bình", "Phú Thọ", "Thái Nguyên", "Tuyên Quang", "Lào Cai", "Cao Bằng", "Lạng Sơn", "Sơn La", "Điện Biên", "Lai Châu"] },
  { label: "Miền Trung - Tây Nguyên", provinces: ["Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Trị", "Huế", "Đà Nẵng", "Quảng Ngãi", "Gia Lai", "Đắk Lắk", "Khánh Hòa", "Lâm Đồng"] },
  { label: "Miền Nam", provinces: ["TP. Hồ Chí Minh", "Đồng Nai", "Tây Ninh", "Cần Thơ", "Vĩnh Long", "Đồng Tháp", "An Giang", "Cà Mau"] },
];
export const ALL_PROVINCES: string[] = VN_REGIONS.flatMap((r) => r.provinces);

// Lựa chọn đặc biệt cho khu vực mong muốn (ngoài tỉnh cụ thể)
export const AREA_REMOTE = "Làm online / từ xa";
export const AREA_ANYWHERE = "Bất kỳ đâu";
