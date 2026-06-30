import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token || !process.env.SUPABASE_ACCESS_TOKEN || token !== process.env.SUPABASE_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let sql: string;
  try {
    const body = await req.json() as { sql?: string };
    sql = body.sql ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!sql.trim()) {
    return NextResponse.json({ error: "sql is required" }, { status: 400 });
  }

  try {
    const result = await prisma.$executeRawUnsafe(sql);
    return NextResponse.json({ ok: true, rowsAffected: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token || !process.env.SUPABASE_ACCESS_TOKEN || token !== process.env.SUPABASE_ACCESS_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sql = searchParams.get("sql") ?? "";

  if (!sql.trim()) {
    return NextResponse.json({ error: "sql query param is required" }, { status: 400 });
  }

  try {
    const result = await prisma.$queryRawUnsafe(sql);
    return NextResponse.json({ ok: true, rows: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
