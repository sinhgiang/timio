// Danh mục ngành nghề — tập trung lao động phổ thông/frontline VN (nghề lớn → nghề nhỏ).
export const JOB_CATEGORIES: { label: string; jobs: string[] }[] = [
  { label: "Ẩm thực - F&B", jobs: ["Phục vụ", "Pha chế (Bartender/Barista)", "Đầu bếp", "Phụ bếp", "Thu ngân", "Quản lý nhà hàng", "Giao đồ ăn"] },
  { label: "Bán hàng - Bán lẻ", jobs: ["Nhân viên bán hàng", "Tư vấn bán hàng", "Thu ngân siêu thị", "Quản lý cửa hàng", "Trưng bày sản phẩm", "Nhân viên kho cửa hàng"] },
  { label: "Dịch vụ - Chăm sóc khách", jobs: ["Lễ tân", "Chăm sóc khách hàng", "Nhân viên tổng đài", "Bảo vệ", "Vệ sinh - Tạp vụ", "Giúp việc nhà"] },
  { label: "Kho vận - Giao hàng", jobs: ["Nhân viên kho", "Bốc xếp", "Đóng gói", "Tài xế giao hàng", "Shipper", "Điều phối vận tải"] },
  { label: "Sản xuất - Nhà máy", jobs: ["Công nhân sản xuất", "Lắp ráp", "Kiểm hàng (QC/KCS)", "Vận hành máy", "May - Dệt", "Kỹ thuật viên xưởng"] },
  { label: "Xây dựng", jobs: ["Lao động phổ thông", "Thợ xây", "Thợ điện", "Thợ nước", "Thợ hàn", "Thợ sơn", "Thợ mộc", "Giám sát công trình"] },
  { label: "Lái xe - Vận tải", jobs: ["Tài xế ô tô", "Tài xế xe tải", "Tài xế xe khách", "Lái xe công nghệ", "Phụ xe"] },
  { label: "Làm đẹp - Chăm sóc", jobs: ["Cắt tóc - Tạo mẫu", "Nail", "Spa - Massage", "Trang điểm", "Chăm sóc da"] },
  { label: "Kỹ thuật - Sửa chữa", jobs: ["Sửa xe máy", "Sửa ô tô", "Điện lạnh", "Điện tử", "Sửa điện thoại", "Hỗ trợ kỹ thuật (IT)"] },
  { label: "Nông nghiệp - Thủy sản", jobs: ["Trồng trọt", "Chăn nuôi", "Thủy sản", "Làm vườn"] },
  { label: "Văn phòng - Hành chính", jobs: ["Nhân viên văn phòng", "Kế toán", "Nhân sự", "Hành chính", "Nhập liệu", "Marketing", "Chăm sóc fanpage"] },
  { label: "Y tế - Giáo dục", jobs: ["Điều dưỡng - Y tá", "Chăm sóc người già/bệnh", "Bảo mẫu", "Giáo viên", "Trợ giảng"] },
];
export const ALL_JOBS: string[] = JOB_CATEGORIES.flatMap((c) => c.jobs);
