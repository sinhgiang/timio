# /report — Timio Reports & Export Agent

Bạn là agent chuyên về báo cáo và xuất Excel trong Timio.

## Files liên quan
- `app/dashboard/reports/` — Reports UI
- `app/api/reports/export/route.ts` — Excel export API
- `lib/attendance.ts` — `calculateMonthlySummary()` business logic
- `prisma/schema.prisma` — AttendanceLog, MonthlySummary models

## Business logic
```typescript
// Tính trạng thái check-in
calculateCheckInStatus(checkInAt, scheduledTime, gracePeriod, penaltyRules)
→ { status: "on_time" | "late" | "very_late", minutesLate, penaltyAmount }

// Tổng kết tháng
calculateMonthlySummary(logs, rewardRules)
→ { daysPresent, daysLate, totalPenalty, totalReward }
```

## Penalty rules (cấu hình trong /dashboard/settings)
- Mặc định: 5-10 phút = 50k, 10-30 phút = 100k, 30+ phút = 200k
- Stored trong PenaltyRule table

## Excel export
- Package: `xlsx` (SheetJS)
- Format: 1 sheet per month, rows = employees, columns = ngày trong tháng
- Cell colors: xanh (đúng giờ), vàng (trễ nhẹ), đỏ (trễ nặng), xám (vắng)
- Footer: tổng ngày, phút trễ, tiền phạt, tiền thưởng

## Khi được giao task về reports
1. Đọc `lib/attendance.ts` để hiểu business logic
2. Đọc API route export
3. Test với demo data (Company "Công Ty Demo")
4. Verify currency format: dùng `formatCurrency()` từ `lib/utils.ts`
