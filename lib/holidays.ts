// Vietnamese national holidays preset
export function getVNHolidays(year: number): { date: string; name: string }[] {
  return [
    { date: `${year}-01-01`, name: "Tết Dương Lịch" },
    { date: `${year}-04-30`, name: "Ngày Giải Phóng Miền Nam" },
    { date: `${year}-05-01`, name: "Quốc Tế Lao Động" },
    { date: `${year}-09-02`, name: "Quốc Khánh" },
    // Giỗ Tổ Hùng Vương 10/3 âm lịch — approx dates for 2024-2027
    ...(year === 2024 ? [{ date: "2024-04-18", name: "Giỗ Tổ Hùng Vương (10/3 ÂL)" }] : []),
    ...(year === 2025 ? [{ date: "2025-04-07", name: "Giỗ Tổ Hùng Vương (10/3 ÂL)" }] : []),
    ...(year === 2026 ? [{ date: "2026-04-27", name: "Giỗ Tổ Hùng Vương (10/3 ÂL)" }] : []),
    ...(year === 2027 ? [{ date: "2027-04-16", name: "Giỗ Tổ Hùng Vương (10/3 ÂL)" }] : []),
  ];
}

// Tết Nguyên Đán — separate because it's multi-day and lunar-based
export function getTetHolidays(year: number): { date: string; name: string }[] {
  // Tết dates (official govt decree), approximately:
  const tetDates: Record<number, string[]> = {
    2024: ["2024-02-08", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12", "2024-02-13", "2024-02-14"],
    2025: ["2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03"],
    2026: ["2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19", "2026-02-20", "2026-02-21", "2026-02-22"],
    2027: ["2027-02-05", "2027-02-06", "2027-02-07", "2027-02-08", "2027-02-09", "2027-02-10", "2027-02-11"],
  };
  const dates = tetDates[year] ?? [];
  return dates.map((d, i) => ({
    date: d,
    name: i === 0 ? "Giao Thừa Tết Nguyên Đán" : i === 1 ? "Mùng 1 Tết Nguyên Đán" : `Mùng ${i} Tết Nguyên Đán`,
  }));
}

export function getAllVNHolidays(year: number): { date: string; name: string }[] {
  return [...getTetHolidays(year), ...getVNHolidays(year)].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}
