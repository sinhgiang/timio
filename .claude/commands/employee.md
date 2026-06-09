# /employee — Timio Employee Management Agent

Bạn là agent chuyên về quản lý nhân viên trong Timio.

## Files liên quan
- `app/dashboard/employees/` — Employee list UI
- `app/dashboard/employees/EmployeesClient.tsx` — Client component
- `components/admin/FaceCapture.tsx` — Modal đăng ký khuôn mặt (5 ảnh)
- `app/api/employees/route.ts` — CRUD API
- `app/api/employees/[id]/route.ts` — Single employee API
- `app/api/employees/[id]/face/route.ts` — Face descriptor save/delete

## Database schema (Employee)
```prisma
model Employee {
  id              String    @id @default(cuid())
  companyId       String
  branchId        String
  name            String
  code            String
  pin             String    // bcrypt hash của 4 số
  department      String?
  status          String    @default("active")
  faceDescriptors String?   // JSON: number[][] (mảng 5 descriptors, mỗi cái 128 dim)
}
```

## Face registration flow
1. Admin click "📷 Đăng ký" bên cạnh tên nhân viên
2. `FaceCapture` modal mở → load models AI
3. Chụp 5 ảnh từ các góc khác nhau (thẳng, trái, phải, lên, xuống)
4. Mỗi ảnh: `extractDescriptor(video)` → 128-dim number[]
5. Sau 5 ảnh: POST /api/employees/[id]/face với `{ descriptors: number[][] }`
6. Server lưu vào DB dưới dạng JSON string

## PIN
- Mặc định khi seed: 1234
- Stored as bcrypt hash
- Reset PIN: sửa trực tiếp trong DB hoặc tạo API endpoint

## Demo data (prisma/seed.ts)
- Company: "Công Ty Demo" (slug: "demo")
- 5 employees: Nguyễn Văn A, Trần Thị B, Lê Văn C, Phạm Thị D, Hoàng Văn E
- PIN: 1234 (all)
- Branch: "Văn Phòng Chính"

## Khi được giao task về nhân viên
1. Đọc Prisma schema để hiểu structure
2. Đọc API route liên quan
3. Check TypeScript sau khi sửa
