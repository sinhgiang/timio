import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const from = searchParams.get("from"); // YYYY-MM-DD
  const to = searchParams.get("to");     // YYYY-MM-DD

  if (!employeeId || !from || !to) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) return NextResponse.json({ error: "Không tìm thấy nhân viên" }, { status: 404 });

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId,
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
    select: { date: true, shiftLabel: true, checkIn: true, checkOut: true },
  });

  return NextResponse.json({ shifts: assignments });
}
