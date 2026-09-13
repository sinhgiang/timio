// Đăng ký toàn bộ bài hướng dẫn ở đây — thêm bài mới = thêm 1 object vào mảng GUIDES,
// không cần tạo route riêng. Trang /huong-dan và /huong-dan/[slug] tự render theo danh sách này.

export interface GuideSection {
  heading: string;
  body: string[]; // mỗi phần tử = 1 đoạn văn (hoặc 1 dòng trong danh sách nếu bắt đầu bằng "- ")
}

export interface Guide {
  slug: string;
  title: string;
  category: string;
  summary: string;
  sections: GuideSection[];
}

export const CATEGORIES = [
  "Bắt đầu",
  "Chấm công",
  "Nhân viên & Lương",
  "Nghỉ phép & Đơn từ",
  "Báo cáo",
  "Cài đặt công ty",
] as const;

export const GUIDES: Guide[] = [
  {
    slug: "bat-dau-voi-timio",
    title: "Bắt đầu với Timio",
    category: "Bắt đầu",
    summary: "Timio là gì, các bước thiết lập đầu tiên cho công ty mới.",
    sections: [
      {
        heading: "Timio là gì?",
        body: [
          "Timio là hệ thống chấm công bằng khuôn mặt (kiosk) dành cho doanh nghiệp Việt Nam — nhân viên quét mặt để check-in/check-out, chủ doanh nghiệp và kế toán xem báo cáo, tính lương, quản lý nghỉ phép ngay trên một hệ thống.",
        ],
      },
      {
        heading: "3 bước thiết lập ban đầu",
        body: [
          "- Tạo công ty và chi nhánh (giờ vào/ra, ngày làm việc trong tuần) tại Dashboard → Chi nhánh.",
          "- Thêm nhân viên: họ tên, mã nhân viên, chi nhánh, ca làm việc, lương. Xem bài \"Quản lý nhân viên\".",
          "- Đăng ký khuôn mặt cho từng nhân viên (hoặc để nhân viên tự đăng ký qua link riêng), sau đó mở màn hình kiosk tại /checkin/[slug-công-ty] trên điện thoại/máy tính bảng đặt ở cửa ra vào.",
        ],
      },
      {
        heading: "Đăng nhập Dashboard",
        body: [
          "Chủ doanh nghiệp/kế toán đăng nhập tại timio.vn/login bằng email đã đăng ký. Quản lý chi nhánh (manager) đăng nhập cùng địa chỉ nhưng chỉ thấy dữ liệu chi nhánh mình phụ trách và không xem được lương.",
        ],
      },
    ],
  },
  {
    slug: "kiosk-cham-cong-khuon-mat",
    title: "Chấm công bằng khuôn mặt (Kiosk)",
    category: "Chấm công",
    summary: "Cách đăng ký khuôn mặt và vận hành màn hình chấm công tại cửa ra vào.",
    sections: [
      {
        heading: "Đăng ký khuôn mặt cho nhân viên",
        body: [
          "Vào Dashboard → Nhân viên → chọn nhân viên → \"Đăng ký khuôn mặt\". Nhân viên đứng trước camera, hệ thống chụp và lưu lại đặc trưng khuôn mặt (không lưu ảnh gốc).",
          "Nên đăng ký trong điều kiện ánh sáng giống lúc chấm công thật (ánh sáng nơi đặt kiosk) để nhận diện chính xác hơn.",
        ],
      },
      {
        heading: "Mở màn hình kiosk",
        body: [
          "Truy cập timio.vn/checkin/[mã-công-ty] trên trình duyệt của điện thoại/máy tính bảng đặt cố định tại nơi làm việc. Nên bật chế độ toàn màn hình (thêm vào màn hình chính) để trông giống một máy chấm công thật.",
          "Nhân viên chỉ cần đứng trước camera vài giây, hệ thống tự nhận diện và ghi nhận giờ vào/ra — không cần bấm nút, không cần nhớ mã PIN.",
        ],
      },
      {
        heading: "Khi không nhận diện được",
        body: [
          "Nhân viên có thể chấm công bằng mã PIN 4 số (được cấp khi tạo hồ sơ) như phương án dự phòng.",
          "Nếu hệ thống nhận nhầm người hoặc không nhận ra, hãy đăng ký lại khuôn mặt ở nơi có ánh sáng tốt hơn và tránh đeo khẩu trang/kính râm lúc đăng ký.",
        ],
      },
    ],
  },
  {
    slug: "quan-ly-nhan-vien",
    title: "Quản lý nhân viên",
    category: "Nhân viên & Lương",
    summary: "Thêm, sửa hồ sơ nhân viên: ca làm việc, lương, phụ cấp, ngân hàng.",
    sections: [
      {
        heading: "Thêm nhân viên mới",
        body: [
          "Dashboard → Nhân viên → \"Thêm nhân viên\". Điền họ tên, mã nhân viên, chi nhánh, ca làm việc (chọn nhanh hoặc tự đặt giờ riêng nếu ca khác chi nhánh).",
          "Có thể khai báo ngay lương, phụ cấp, thông tin ngân hàng để xuất phiếu lương/chuyển khoản sau này — hoặc bổ sung sau bằng nút \"Sửa\".",
        ],
      },
      {
        heading: "Ca làm việc riêng (ca gãy, ngày làm khác)",
        body: [
          "Nếu nhân viên làm ca gãy (2 buổi/ngày, nghỉ hẳn giữa ca) hoặc có ngày trong tuần làm giờ khác — bật \"Ca gãy\" hoặc thêm \"Ngày làm khác\" ngay trong form nhân viên, không cần tạo chi nhánh riêng.",
        ],
      },
      {
        heading: "Tăng ca, phạt trễ, thưởng riêng",
        body: [
          "Mặc định nhân viên dùng quy định phạt trễ/thưởng chung của công ty. Có thể tắt và đặt mức riêng cho từng nhân viên nếu cần (VD: nhân viên thử việc, vị trí đặc thù).",
        ],
      },
    ],
  },
  {
    slug: "luong-phieu-luong",
    title: "Lương & Phiếu lương",
    category: "Nhân viên & Lương",
    summary: "Phân biệt Lương cơ bản và Tổng lương, cách tính phiếu lương hàng tháng.",
    sections: [
      {
        heading: "Lương cơ bản vs. Tổng lương",
        body: [
          "Lương cơ bản = mức lương làm căn cứ đóng BHXH — nên giữ đúng mức thực tế cần đóng bảo hiểm.",
          "Tổng lương / lương chính thức = tổng thu nhập thực tế của nhân viên (lương cơ bản + phụ cấp xăng xe, ăn trưa, KPI...). Hệ thống tự tính bằng Lương cơ bản + tổng phụ cấp, hoặc có thể nhập tay một con số khác nếu thực tế trả cao/thấp hơn.",
        ],
      },
      {
        heading: "Lương nào dùng để trả ngày lễ/Tết?",
        body: [
          "Theo luật, ngày lễ/Tết nhân viên nghỉ vẫn được hưởng nguyên lương. Với mỗi nhân viên, công ty chọn 1 trong 2 mức làm căn cứ trả những ngày này: Lương cơ bản hoặc Tổng lương — bật ở nút \"Áp dụng lương này cho ngày lễ/Tết?\" trong form nhân viên.",
          "Phiếu lương sẽ tự cộng thêm phần chênh lệch cho những ngày lễ nếu chọn Tổng lương làm căn cứ, hiển thị rõ dòng \"+X (lễ Y ngày)\".",
        ],
      },
      {
        heading: "Cách tính phiếu lương",
        body: [
          "Lương ngày công = Lương cơ bản ÷ số ngày công chuẩn × số ngày đi làm thực tế.",
          "Phụ cấp được cộng đủ 100% mỗi tháng (không bị trừ theo ngày công).",
          "Thu nhập gộp = Lương ngày công + phụ cấp + (thêm ngày lễ nếu có) − tiền phạt trễ + thưởng + tăng ca.",
          "Từ thu nhập gộp, hệ thống tự trừ BHXH (10.5%) và thuế TNCN theo số người phụ thuộc để ra lương thực nhận.",
        ],
      },
    ],
  },
  {
    slug: "nghi-phep-don-tu",
    title: "Nghỉ phép & Đơn từ",
    category: "Nghỉ phép & Đơn từ",
    summary: "Nhân viên gửi đơn nghỉ phép/về sớm/tăng ca, quản lý duyệt đơn.",
    sections: [
      {
        heading: "Nhân viên gửi đơn",
        body: [
          "Nhân viên gửi đơn (nghỉ phép, về sớm/đến muộn, xin sửa chấm công, xin tăng ca) qua cổng thông tin cá nhân /ho-so — mục \"Đơn từ\".",
        ],
      },
      {
        heading: "Quản lý duyệt đơn",
        body: [
          "Dashboard → Đơn từ (hoặc Nghỉ phép) → duyệt/từ chối. Khi duyệt đơn về sớm/đến muộn, hệ thống tự tính lại \"đúng giờ, không phạt\" cho buổi đó — không cần sửa tay chấm công.",
          "Ngày phép năm của nhân viên tự động trừ khi đơn nghỉ phép năm được duyệt.",
        ],
      },
    ],
  },
  {
    slug: "bao-cao",
    title: "Báo cáo",
    category: "Báo cáo",
    summary: "Xem báo cáo chấm công theo phòng ban, xuất Excel, báo cáo hàng ngày qua Email/Zalo.",
    sections: [
      {
        heading: "Báo cáo theo phòng ban",
        body: [
          "Dashboard → Báo cáo → Theo phòng ban: xem nhanh số người đi làm/đi trễ/vắng theo từng phòng ban trong tháng.",
        ],
      },
      {
        heading: "Xuất Excel",
        body: [
          "Hầu hết các trang báo cáo và phiếu lương đều có nút xuất Excel để lưu trữ hoặc gửi kế toán/ngân hàng.",
        ],
      },
      {
        heading: "Báo cáo hàng ngày tự động",
        body: [
          "Có thể bật nhận báo cáo chấm công hàng ngày (8h sáng) qua Email, Zalo hoặc Telegram tại Cài đặt công ty → Thông báo.",
        ],
      },
    ],
  },
  {
    slug: "cai-dat-cong-ty",
    title: "Cài đặt công ty & chi nhánh",
    category: "Cài đặt công ty",
    summary: "Chi nhánh, quy định phạt trễ/thưởng, ngày lễ, phân quyền quản lý.",
    sections: [
      {
        heading: "Chi nhánh",
        body: [
          "Mỗi chi nhánh có giờ vào/ra, ngày làm việc trong tuần, số ngày công chuẩn riêng. Nhân viên thuộc chi nhánh nào dùng giờ giấc chi nhánh đó, trừ khi có ca riêng khai báo trong hồ sơ.",
        ],
      },
      {
        heading: "Quy định phạt trễ & thưởng",
        body: [
          "Đặt quy định chung áp dụng cho toàn công ty (VD: trễ 5–15 phút phạt X đồng). Từng nhân viên có thể dùng riêng nếu cần.",
        ],
      },
      {
        heading: "Ngày lễ/Tết cố định",
        body: [
          "Khai báo ngày lễ/Tết trong năm — hệ thống tự đánh dấu chấm công \"nghỉ lễ hưởng nguyên lương\" cho toàn bộ nhân viên đúng những ngày này.",
        ],
      },
      {
        heading: "Phân quyền quản lý chi nhánh",
        body: [
          "Có thể tạo tài khoản \"Quản lý\" chỉ xem được dữ liệu chi nhánh mình phụ trách và không xem được lương — phù hợp giao cho trưởng chi nhánh mà không lộ thông tin lương toàn công ty.",
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(): { category: string; guides: Guide[] }[] {
  return CATEGORIES.map((category) => ({
    category,
    guides: GUIDES.filter((g) => g.category === category),
  })).filter((c) => c.guides.length > 0);
}
