import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Tạo công ty demo
  const company = await prisma.company.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Công Ty Demo",
      slug: "demo",
      timezone: "Asia/Ho_Chi_Minh",
    },
  });
  console.log("✅ Company:", company.name);

  // Tạo admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      companyId: company.id,
      email: "admin@demo.com",
      name: "Admin",
      password: adminPassword,
    },
  });
  console.log("✅ Admin: admin@demo.com / admin123");

  // Tạo chi nhánh
  const branch = await prisma.branch.upsert({
    where: { id: "branch-main" },
    update: {},
    create: {
      id: "branch-main",
      companyId: company.id,
      name: "Văn phòng chính",
      checkInTime: "07:30",
      checkOutTime: "17:30",
      gracePeriod: 5,
      workDays: "1,2,3,4,5",
    },
  });
  console.log("✅ Branch:", branch.name);

  // Tạo quy tắc phạt
  await prisma.penaltyRule.deleteMany({ where: { companyId: company.id } });
  await prisma.penaltyRule.createMany({
    data: [
      { companyId: company.id, fromMinutes: 6, toMinutes: 10, amount: 50000 },
      { companyId: company.id, fromMinutes: 11, toMinutes: 20, amount: 100000 },
      { companyId: company.id, fromMinutes: 21, toMinutes: 30, amount: 200000 },
      { companyId: company.id, fromMinutes: 31, toMinutes: 9999, amount: 500000 },
    ],
  });
  console.log("✅ Penalty rules: 4 rules");

  // Tạo quy tắc thưởng
  await prisma.rewardRule.deleteMany({ where: { companyId: company.id } });
  await prisma.rewardRule.createMany({
    data: [
      {
        companyId: company.id,
        condition: "zero_late_days",
        amount: 50000,
        label: "Không đi trễ cả tháng",
      },
      {
        companyId: company.id,
        condition: "full_attendance",
        amount: 100000,
        label: "Đi đủ ngày công",
      },
    ],
  });
  console.log("✅ Reward rules: 2 rules");

  // Tạo nhân viên mẫu
  const employees = [
    { name: "Nguyễn Văn An",  code: "NV001", department: "Kinh doanh",          position: "Trưởng phòng" },
    { name: "Trần Thị Bình",  code: "NV002", department: "Kế toán - Tài chính",  position: "Kế toán viên" },
    { name: "Lê Văn Cường",   code: "NV003", department: "Kỹ thuật - IT",        position: "Kỹ sư" },
    { name: "Phạm Thị Dung",  code: "NV004", department: "Kinh doanh",           position: "Nhân viên kinh doanh" },
    { name: "Hoàng Văn Em",   code: "NV005", department: "Nhân sự - Hành chính", position: "Chuyên viên" },
  ];

  const defaultPin = await bcrypt.hash("1234", 10);

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { companyId_code: { companyId: company.id, code: emp.code } },
      update: {},
      create: {
        companyId: company.id,
        branchId: branch.id,
        name: emp.name,
        code: emp.code,
        pin: defaultPin,
        department: emp.department,
        position: emp.position,
        status: "active",
      },
    });
  }
  console.log("✅ Employees: 5 nhân viên (PIN mặc định: 1234)");

  // ─── Công ty 2: Trekking Tour Sapa ──────────────────────────────────────────
  const sapaMessages = JSON.stringify({
    welcome:
      "Chào mừng đến với Trekking Tour Sapa! Vui lòng quét khuôn mặt để điểm danh.",
    checkinOntime:
      "Cảm ơn {name} đã đến đúng giờ! Chúc bạn có một ngày làm việc thật vui vẻ và hiệu quả!",
    checkinLate:
      "Cảm ơn {name}! Bạn trễ {minutes} phút hôm nay. Cố gắng đúng giờ hơn vào ngày mai nhé!",
    checkout:
      "Cảm ơn {name} đã hoàn thành công việc hôm nay! Chúc bạn buổi tối thật vui vẻ, hẹn gặp lại!",
  });

  const sapaCompany = await prisma.company.upsert({
    where: { slug: "trekking-tour-sapa" },
    update: { kioskMessages: sapaMessages },
    create: {
      name: "Trekking Tour Sapa",
      slug: "trekking-tour-sapa",
      timezone: "Asia/Ho_Chi_Minh",
      kioskMessages: sapaMessages,
    },
  });
  console.log("✅ Company:", sapaCompany.name);

  const sapaAdminPassword = await bcrypt.hash("sapa123", 10);
  await prisma.admin.upsert({
    where: { email: "admin@sapa.com" },
    update: {},
    create: {
      companyId: sapaCompany.id,
      email: "admin@sapa.com",
      name: "Admin Sapa",
      password: sapaAdminPassword,
    },
  });
  console.log("✅ Admin Sapa: admin@sapa.com / sapa123");

  const sapaBranch = await prisma.branch.upsert({
    where: { id: "branch-sapa" },
    update: {},
    create: {
      id: "branch-sapa",
      companyId: sapaCompany.id,
      name: "Văn phòng Sapa",
      checkInTime: "07:00",
      checkOutTime: "18:00",
      gracePeriod: 10,
      workDays: "1,2,3,4,5,6",
    },
  });
  console.log("✅ Branch:", sapaBranch.name);

  await prisma.penaltyRule.deleteMany({ where: { companyId: sapaCompany.id } });
  await prisma.penaltyRule.createMany({
    data: [
      { companyId: sapaCompany.id, fromMinutes: 11, toMinutes: 20, amount: 50000 },
      { companyId: sapaCompany.id, fromMinutes: 21, toMinutes: 30, amount: 100000 },
      { companyId: sapaCompany.id, fromMinutes: 31, toMinutes: 9999, amount: 200000 },
    ],
  });

  const sapaEmployees = [
    { name: "Nguyễn Văn Hải", code: "SP001", department: "Hướng dẫn viên",      position: "Chuyên viên cao cấp" },
    { name: "Lý Thị Mai",     code: "SP002", department: "Lễ tân",              position: "Nhân viên" },
    { name: "Giàng A Minh",   code: "SP003", department: "Hướng dẫn viên",      position: "Nhân viên" },
    { name: "Vàng Thị Lan",   code: "SP004", department: "Kế toán - Tài chính", position: "Kế toán viên" },
    { name: "Lù Văn Tú",      code: "SP005", department: "Kho vận - Logistics",  position: "Nhân viên" },
  ];

  for (const emp of sapaEmployees) {
    await prisma.employee.upsert({
      where: { companyId_code: { companyId: sapaCompany.id, code: emp.code } },
      update: {},
      create: {
        companyId: sapaCompany.id,
        branchId: sapaBranch.id,
        name: emp.name,
        code: emp.code,
        pin: defaultPin,
        department: emp.department,
        position: emp.position,
        status: "active",
      },
    });
  }
  console.log("✅ Sapa Employees: 5 nhân viên");

  console.log("\n🎉 Seed hoàn tất!");
  console.log("📋 Demo Company:");
  console.log("   Dashboard: http://localhost:3000/dashboard");
  console.log("   Email: admin@demo.com / admin123");
  console.log("   Kiosk: http://localhost:3000/checkin/demo");
  console.log("\n🏔️  Trekking Tour Sapa:");
  console.log("   Email: admin@sapa.com / sapa123");
  console.log("   Kiosk: http://localhost:3000/checkin/trekking-tour-sapa");
  console.log("   PIN nhân viên: 1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
