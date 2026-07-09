// Danh mục ngành nghề VN — ưu tiên nhóm Internet/Digital (người dùng app rành internet) + Du lịch, rồi frontline.
export const JOB_CATEGORIES: { label: string; jobs: string[] }[] = [
  { label: "Internet - Digital - Online", jobs: ["Marketing online", "Sáng tạo nội dung (Content)", "Chạy quảng cáo (Ads)", "Quản trị fanpage / MXH", "Livestream bán hàng", "Sale online", "Chăm sóc khách online", "SEO", "Thiết kế đồ họa", "Dựng video", "Chỉnh sửa ảnh", "Cộng tác viên online", "Nhập liệu online"] },
  { label: "Công nghệ thông tin (IT)", jobs: ["Lập trình viên", "Nhân viên IT", "Hỗ trợ kỹ thuật (IT Helpdesk)", "Kiểm thử phần mềm (Tester)", "Quản trị mạng / hệ thống", "Data / Phân tích dữ liệu"] },
  { label: "Du lịch - Khách sạn", jobs: ["Hướng dẫn viên du lịch", "Điều hành tour", "Sale tour", "Đặt phòng (Booking)", "Lễ tân khách sạn", "Buồng phòng", "Phục vụ khách sạn", "Quản lý khách sạn"] },
  { label: "Ẩm thực - F&B", jobs: ["Phục vụ", "Pha chế (Bartender/Barista)", "Đầu bếp", "Phụ bếp", "Thu ngân", "Quản lý nhà hàng", "Giao đồ ăn"] },
  { label: "Bán hàng - Bán lẻ", jobs: ["Nhân viên bán hàng", "Tư vấn bán hàng", "Thu ngân siêu thị", "Quản lý cửa hàng", "Trưng bày sản phẩm", "Nhân viên kho cửa hàng"] },
  { label: "Marketing - Truyền thông", jobs: ["Nhân viên Marketing", "Truyền thông - PR", "Tổ chức sự kiện", "Copywriter", "Brand / Thương hiệu", "Nghiên cứu thị trường"] },
  { label: "Dịch vụ - Chăm sóc khách", jobs: ["Lễ tân", "Chăm sóc khách hàng", "Nhân viên tổng đài", "Bảo vệ", "Vệ sinh - Tạp vụ", "Giúp việc nhà"] },
  { label: "Kho vận - Giao hàng", jobs: ["Nhân viên kho", "Bốc xếp", "Đóng gói", "Tài xế giao hàng", "Shipper", "Điều phối vận tải"] },
  { label: "Sản xuất - Nhà máy", jobs: ["Công nhân sản xuất", "Lắp ráp", "Kiểm hàng (QC/KCS)", "Vận hành máy", "May - Dệt", "Kỹ thuật viên xưởng"] },
  { label: "Xây dựng", jobs: ["Lao động phổ thông", "Thợ xây", "Thợ điện", "Thợ nước", "Thợ hàn", "Thợ sơn", "Thợ mộc", "Giám sát công trình"] },
  { label: "Lái xe - Vận tải", jobs: ["Tài xế ô tô", "Tài xế xe tải", "Tài xế xe khách", "Lái xe công nghệ", "Phụ xe"] },
  { label: "Làm đẹp - Chăm sóc", jobs: ["Cắt tóc - Tạo mẫu", "Nail", "Spa - Massage", "Trang điểm", "Chăm sóc da"] },
  { label: "Kỹ thuật - Sửa chữa", jobs: ["Sửa xe máy", "Sửa ô tô", "Điện lạnh", "Điện tử", "Sửa điện thoại", "Cơ khí"] },
  { label: "Văn phòng - Hành chính", jobs: ["Nhân viên văn phòng", "Kế toán", "Nhân sự", "Hành chính - Lễ tân VP", "Nhập liệu", "Trợ lý / Thư ký"] },
  { label: "Y tế - Sức khỏe", jobs: ["Điều dưỡng - Y tá", "Chăm sóc người già/bệnh", "Dược sĩ / Bán thuốc", "Kỹ thuật viên y tế"] },
  { label: "Giáo dục - Đào tạo", jobs: ["Giáo viên", "Trợ giảng", "Gia sư", "Bảo mẫu"] },
  { label: "Nông nghiệp - Thủy sản", jobs: ["Trồng trọt", "Chăn nuôi", "Thủy sản", "Làm vườn"] },
];
export const ALL_JOBS: string[] = JOB_CATEGORIES.flatMap((c) => c.jobs);
