import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RowInput {
  name: string;
  code: string;
  pin?: string;
  department?: string;
  position?: string;
  branchId: string;
  baseSalary?: number;
  phone?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  joinDate?: string;    // YYYY-MM-DD
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const companyId = (session?.user as { companyId?: string })?.companyId;
  if (!companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rows: RowInput[];
  try {
    rows = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "Không có dữ liệu" }, { status: 400 });
  }

  if (rows.length > 500) {
    return NextResponse.json({ error: "Tối đa 500 nhân viên mỗi lần import" }, { status: 400 });
  }

  // Verify all branchIds belong to this company
  const branchIdsSeen: Record<string, true> = {};
  rows.forEach((r) => { if (r.branchId) branchIdsSeen[r.branchId] = true; });
  const branchIds = Object.keys(branchIdsSeen);
  const branches = await prisma.branch.findMany({
    where: { companyId, id: { in: branchIds } },
    select: { id: true },
  });
  const validBranchIdSet: Record<string, true> = {};
  branches.forEach((b) => { validBranchIdSet[b.id] = true; });
  const validBranchIds = validBranchIdSet;

  const results: Array<{ row: number; name: string; ok: boolean; error?: string }> = [];
  let created = 0;

  const DEFAULT_PIN = await bcrypt.hash("0000", 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.name?.trim()) {
      results.push({ row: rowNum, name: row.name ?? "", ok: false, error: "Thiếu tên" });
      continue;
    }
    if (!row.code?.trim()) {
      results.push({ row: rowNum, name: row.name, ok: false, error: "Thiếu mã NV" });
      continue;
    }
    if (!row.branchId || !validBranchIds[row.branchId]) {
      results.push({ row: rowNum, name: row.name, ok: false, error: "Chi nhánh không hợp lệ" });
      continue;
    }

    const pinRaw = row.pin && /^\d{4}$/.test(String(row.pin)) ? String(row.pin) : null;
    const hashedPin = pinRaw ? await bcrypt.hash(pinRaw, 10) : DEFAULT_PIN;

    try {
      await prisma.employee.create({
        data: {
          name: row.name.trim(),
          code: String(row.code).trim(),
          pin: hashedPin,
          department: row.department?.trim() || null,
          position: row.position?.trim() || null,
          branchId: row.branchId,
          companyId,
          baseSalary: row.baseSalary ? Number(row.baseSalary) : 0,
          phone: row.phone?.trim() || null,
          dateOfBirth: row.dateOfBirth || null,
          joinDate: row.joinDate ? new Date(row.joinDate) : null,
        },
      });
      results.push({ row: rowNum, name: row.name, ok: true });
      created++;
    } catch (err: unknown) {
      const isUnique =
        typeof err === "object" && err !== null && "code" in err &&
        (err as { code: string }).code === "P2002";
      results.push({
        row: rowNum,
        name: row.name,
        ok: false,
        error: isUnique ? "Mã NV đã tồn tại" : "Lỗi server",
      });
    }
  }

  return NextResponse.json({ created, total: rows.length, results });
}
