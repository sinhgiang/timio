import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const slugify = (s) => s.normalize("NFD").split("").filter((ch) => { const c = ch.charCodeAt(0); return c < 0x300 || c > 0x36f; }).join("").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// 10 công ty + 1 tin tuyển mỗi công ty
const COMPANIES = [
  { name: "Chuỗi Cà Phê Ban Mai", job: "Nhân viên pha chế", dept: "F&B", loc: "Đà Nẵng", min: 7e6, max: 10e6, wt: "Ca tối 17h-22h", tags: "pha chế, ca tối, part-time" },
  { name: "Siêu Thị Hồng Phúc", job: "Thu ngân siêu thị", dept: "Bán lẻ", loc: "Cần Thơ", min: 7e6, max: 9e6, wt: "Ca xoay", tags: "thu ngân, trung thực" },
  { name: "Logistics Đại Phát", job: "Nhân viên kho", dept: "Kho vận", loc: "Bình Dương", min: 9e6, max: 13e6, wt: "Giờ hành chính", tags: "kho vận, chịu khó" },
  { name: "Cơ Khí Tân Tiến", job: "Kỹ thuật viên bảo trì", dept: "Kỹ thuật", loc: "Đồng Nai", min: 10e6, max: 15e6, wt: "Giờ hành chính", tags: "kỹ thuật, có đào tạo" },
  { name: "Dịch Vụ Sao Việt", job: "Nhân viên chăm sóc khách hàng", dept: "CSKH", loc: "TP.HCM", min: 8e6, max: 11e6, wt: "Giờ hành chính", tags: "chăm sóc khách hàng, không cần kinh nghiệm" },
  { name: "Vận Tải An Bình", job: "Tài xế giao hàng", dept: "Vận tải", loc: "Hải Phòng", min: 9e6, max: 14e6, wt: "Linh hoạt", tags: "giao hàng, có xe máy" },
  { name: "Nông Sản Xanh", job: "Kế toán kho", dept: "Kế toán", loc: "Cần Thơ", min: 9e6, max: 12e6, wt: "Giờ hành chính", tags: "kế toán, cẩn thận" },
  { name: "Spa Ngọc Lan", job: "Lễ tân spa", dept: "Dịch vụ", loc: "TP.HCM", min: 7e6, max: 10e6, wt: "Ca xoay", tags: "lễ tân, giao tiếp tốt" },
  { name: "Thời Trang Hạ Long", job: "Nhân viên bán hàng", dept: "Bán hàng", loc: "Hà Nội", min: 8e6, max: 12e6, wt: "Ca xoay", tags: "bán hàng, hoa hồng cao" },
  { name: "Media House Sáng Tạo", job: "Nhân viên sản xuất nội dung", dept: "Marketing", loc: "Hà Nội", min: 10e6, max: 18e6, wt: "Giờ hành chính", tags: "marketing, content, tiktok" },
];

// 10 ứng viên (active → che nửa tên; resigned → hiện đầy đủ)
const CANDIDATES = [
  { name: "Nguyễn Thị Hồng", pos: "Pha chế", area: "Đà Nẵng", kw: "pha chế, ca tối, nhanh nhẹn", active: true },
  { name: "Trần Văn Nam", pos: "Nhân viên kho", area: "Bình Dương", kw: "kho vận, chịu khó", active: false },
  { name: "Lê Thị Mai", pos: "Thu ngân", area: "Cần Thơ", kw: "trung thực, tin học văn phòng", active: true },
  { name: "Phạm Quốc Toàn", pos: "Tài xế giao hàng", area: "TP.HCM", kw: "có xe máy, đúng giờ", active: false },
  { name: "Hoàng Văn Kiên", pos: "Kỹ thuật viên", area: "Đồng Nai", kw: "kỹ thuật, sửa chữa", active: true },
  { name: "Vũ Thị Lan", pos: "Chăm sóc khách hàng", area: "Hà Nội", kw: "giao tiếp tốt, kiên nhẫn", active: false },
  { name: "Đặng Minh Quân", pos: "Nhân viên bán hàng", area: "Hà Nội", kw: "bán hàng, chăm sóc khách hàng", active: true },
  { name: "Bùi Thị Hà", pos: "Lễ tân", area: "TP.HCM", kw: "biết tiếng Anh, giao tiếp tốt", active: false },
  { name: "Ngô Văn Dũng", pos: "Phục vụ", area: "TP.HCM", kw: "chăm chỉ, làm cuối tuần", active: true },
  { name: "Đỗ Thị Ngọc", pos: "Marketing online", area: "Hà Nội", kw: "marketing, content, tiktok", active: false },
];

async function main() {
  const companyIds = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const c = COMPANIES[i];
    const slug = "tim-" + slugify(c.name); // prefix "tim-" để dễ nhận biết/dọn dẹp
    const co = await prisma.company.upsert({ where: { slug }, create: { name: c.name, slug }, update: {}, select: { id: true } });
    companyIds.push(co.id);
    let branch = await prisma.branch.findFirst({ where: { companyId: co.id }, select: { id: true } });
    if (!branch) branch = await prisma.branch.create({ data: { companyId: co.id, name: "Chi nhánh chính" }, select: { id: true } });
    const existJob = await prisma.jobPosting.findFirst({ where: { companyId: co.id, title: c.job }, select: { id: true } });
    if (!existJob) await prisma.jobPosting.create({ data: { companyId: co.id, title: c.job, department: c.dept, location: c.loc, salaryMin: c.min, salaryMax: c.max, workTime: c.wt, tags: c.tags, status: "open", isPublic: true, description: `Tuyển ${c.job} tại ${c.loc}. Môi trường thân thiện, thu nhập tốt.`, requirements: "Chăm chỉ, trung thực, có tinh thần trách nhiệm." } });
  }
  console.log(`Đã tạo/cập nhật ${companyIds.length} công ty + tin tuyển`);

  const now = Date.now();
  for (let i = 0; i < CANDIDATES.length; i++) {
    const c = CANDIDATES[i];
    const phone = "09000001" + String(i + 10).padStart(2, "0"); // 0900000110.. (dải demo)
    const handle = slugify(c.name) + "-tm" + (i + 1);
    const wa = await prisma.workerAccount.upsert({
      where: { phone },
      create: { phone, name: c.name, handle, activatedAt: new Date(), openToWork: true, profilePublic: true, shareTrustScore: true, shareContact: false, desiredPosition: c.pos, desiredArea: c.area, keywords: c.kw },
      update: { name: c.name, handle, openToWork: true, profilePublic: true, shareTrustScore: true, desiredPosition: c.pos, desiredArea: c.area, keywords: c.kw },
      select: { id: true },
    });
    const coId = companyIds[i % companyIds.length];
    const branch = await prisma.branch.findFirst({ where: { companyId: coId }, select: { id: true } });
    const monthsTenure = 6 + (i % 24);
    const joinDate = new Date(now - monthsTenure * 30 * 86400000);
    let emp = await prisma.employee.findFirst({ where: { workerAccountId: wa.id, companyId: coId }, select: { id: true } });
    if (!emp) {
      emp = await prisma.employee.create({ data: { companyId: coId, branchId: branch.id, name: c.name, code: "TM" + phone.slice(-4), pin: "0000", position: c.pos, status: c.active ? "active" : "inactive", joinDate, workerAccountId: wa.id }, select: { id: true } });
    } else {
      await prisma.employee.update({ where: { id: emp.id }, data: { status: c.active ? "active" : "inactive", joinDate } });
    }
    // Chấm công để có điểm tin cậy (~40 ngày, ~90% đúng giờ)
    const rows = [];
    for (let d = 0; d < 42; d++) {
      const day = new Date(now - (d + 1) * 86400000);
      if (day.getDay() === 0) continue; // bỏ chủ nhật
      const dateStr = day.toISOString().slice(0, 10);
      const late = d % 10 === 0 ? 8 : 0;
      rows.push({ employeeId: emp.id, branchId: branch.id, date: dateStr, status: "present", checkInAt: new Date(day.setHours(2, late ? 40 : 25, 0, 0)), minutesLate: late });
    }
    await prisma.attendanceLog.createMany({ data: rows, skipDuplicates: true });
  }
  console.log(`Đã tạo/cập nhật ${CANDIDATES.length} ứng viên + chấm công (điểm tin cậy)`);
  console.log("XONG. Slug công ty demo bắt đầu bằng 'tim-'; SĐT ứng viên demo dải 09000001xx.");
}
main().catch((e) => { console.error("ERR", e); process.exit(1); }).finally(() => prisma.$disconnect());
