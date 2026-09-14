// Nhật ký cập nhật — mỗi khi Timio ra tính năng/bản sửa lỗi mới cho người dùng,
// thêm 1 object vào đầu mảng CHANGELOG (mới nhất lên trên). Trang /cap-nhat tự render theo danh sách này.

export interface ChangelogEntry {
  date: string; // yyyy-mm-dd
  title: string;
  tag: "Tính năng mới" | "Cải tiến" | "Sửa lỗi";
  body: string[]; // các đoạn mô tả ngắn, tiếng Việt, hướng tới người dùng cuối
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-14",
    title: "Phạt tiền khi quên chấm công ra",
    tag: "Tính năng mới",
    body: [
      "Báo cáo chấm công nay phân biệt rõ \"Quên chấm công ra\" với \"Đúng giờ\" — trước đây nhân viên vào đúng giờ nhưng quên bấm giờ ra vẫn hiện nhầm là \"Đúng giờ\".",
      "Có thể bật phạt tiền cho lỗi quên chấm công ra tại Cài đặt → Phạt/Thưởng → \"Phạt quên chấm công ra\" (mặc định tắt, tự nhập số tiền để bật). Khoản phạt tự động trừ vào lương tháng đó.",
      "Hệ thống tự động rà soát và áp dụng vào rạng sáng hôm sau cho những ca đã kết thúc mà vẫn thiếu giờ ra.",
    ],
  },
  {
    date: "2026-09-14",
    title: "Sắp xếp lại mục \"Tổng quan\" trên thanh menu",
    tag: "Sửa lỗi",
    body: [
      "Mục \"Tổng quan\" luôn cố định ở đầu thanh menu bên trái — trước đây nếu ghim thêm lối tắt cá nhân hoá, mục này có thể bị đẩy xuống dưới.",
    ],
  },
  {
    date: "2026-09-13",
    title: "Tách Lương cơ bản và Tổng lương, chọn căn cứ trả lương ngày lễ/Tết",
    tag: "Tính năng mới",
    body: [
      "Hồ sơ nhân viên nay có 2 mục lương riêng biệt: Lương cơ bản (căn cứ đóng BHXH) và Tổng lương/lương chính thức (thu nhập thực tế, tự tính = Lương cơ bản + phụ cấp, có thể sửa tay nếu khác).",
      "Có thể chọn dùng Lương cơ bản hay Tổng lương làm căn cứ trả những ngày nghỉ lễ/Tết hưởng nguyên lương — phiếu lương tự cộng phần chênh lệch và hiển thị rõ ràng.",
      "Xem chi tiết tại bài hướng dẫn \"Lương & Phiếu lương\".",
    ],
  },
  {
    date: "2026-09-10",
    title: "Làm mới giao diện Báo cáo theo phòng ban",
    tag: "Cải tiến",
    body: [
      "Trang Báo cáo theo phòng ban được thiết kế lại, dễ nhìn hơn — xem nhanh số người đi làm/đi trễ/vắng theo từng phòng ban trong tháng.",
    ],
  },
  {
    date: "2026-09-08",
    title: "Sửa lỗi trạng thái chấm công \"Đúng giờ\"",
    tag: "Sửa lỗi",
    body: [
      "Trạng thái \"Đúng giờ\" trên báo cáo trước đây chỉ xét giờ vào — nay xét cả giờ ra, phản ánh đúng thực tế đi làm của nhân viên.",
    ],
  },
  {
    date: "2026-09-05",
    title: "Giảm nhận nhầm người khi chấm công bằng khuôn mặt",
    tag: "Sửa lỗi",
    body: [
      "Cải thiện độ chính xác nhận diện khuôn mặt tại kiosk, giảm đáng kể tình trạng nhận nhầm giữa hai nhân viên có ngoại hình giống nhau.",
    ],
  },
];
