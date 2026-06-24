/**
 * Test script: Commission window 12 tháng
 * Chạy: node scripts/test-commission-window.mjs
 *
 * Mô phỏng chính xác logic trong:
 *   app/admin/referrals/page.tsx
 *   app/affiliate/[code]/page.tsx
 */

const COMMISSION_WINDOW_MS = 365 * 24 * 60 * 60 * 1000; // 12 tháng
const HOLD_MS              = 30  * 24 * 60 * 60 * 1000;  // 30 ngày giữ đơn
const PLAN_PRICES          = { pro: 299000, business: 799000 };

function planPrice(plan) { return PLAN_PRICES[plan] ?? 0; }
function isPaid(plan)    { return plan === "pro" || plan === "business"; }

function getTier(converted) {
  if (converted >= 21) return { name: "Vàng",  rate: 20 };
  if (converted >= 6)  return { name: "Bạc",   rate: 15 };
  return                      { name: "Đồng",  rate: 10 };
}

// ── Replica logic từ admin/referrals/page.tsx ─────────────────────────────
function calcAdminCommission(companies, firstPaidMap) {
  const now = Date.now();

  function inWindow(companyId) {
    const fp = firstPaidMap.get(companyId);
    if (!fp) return false;
    return (now - fp) < COMMISSION_WINDOW_MS;
  }

  const paidReferrals = companies.filter(c => isPaid(c.plan) && inWindow(c.id));
  const converted     = paidReferrals.length;
  const revenue       = paidReferrals.reduce((s, c) => s + planPrice(c.plan), 0);
  const tier          = getTier(converted);
  const commission    = Math.round(revenue * tier.rate / 100);
  return { converted, revenue, commission, tier: tier.name, paidReferrals: paidReferrals.map(c => c.name) };
}

// ── Replica logic từ affiliate/[code]/page.tsx ────────────────────────────
function calcAffiliateCommission(referrals, firstPaidMap) {
  const now = Date.now();
  const paidEligible = [];
  const paidPending  = [];
  const expired      = [];

  for (const r of referrals) {
    if (!isPaid(r.plan)) continue;
    const fp = firstPaidMap.get(r.id);
    if (!fp) continue;
    const age       = now - fp;
    const inWindow  = age < COMMISSION_WINDOW_MS;
    const eligible  = age >= HOLD_MS;
    if (!inWindow) { expired.push(r); continue; }
    if (eligible)  paidEligible.push(r);
    else           paidPending.push(r);
  }

  const converted         = paidEligible.length;
  const revenue           = paidEligible.reduce((s, r) => s + planPrice(r.plan), 0);
  const tier              = getTier(converted);
  const commission        = Math.round(revenue * tier.rate / 100);
  const pendingRevenue    = paidPending.reduce((s, r)  => s + planPrice(r.plan), 0);
  const pendingCommission = Math.round(pendingRevenue * tier.rate / 100);
  return { converted, commission, pendingCommission, tier: tier.name,
           eligible: paidEligible.map(c=>c.name), pending: paidPending.map(c=>c.name), expired: expired.map(c=>c.name) };
}

// ── Helper: tạo ngày cách đây N tháng ────────────────────────────────────
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.getTime();
}
function daysAgo(n) {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

let pass = 0; let fail = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ PASS  ${label}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL  ${label}  ${detail}`);
    fail++;
  }
}

console.log("\n══════════════════════════════════════════════════");
console.log("  TEST: Commission window 12 tháng");
console.log("══════════════════════════════════════════════════\n");

// ─── SCENARIO 1: Khách hàng vừa mua (6 tháng trước) → còn hiệu lực ───────
console.log("SCENARIO 1: Khách mua Pro cách đây 6 tháng → vẫn nhận commission");
{
  const companies = [{ id: "c1", name: "Công ty A", plan: "pro" }];
  const firstPaidMap = new Map([["c1", monthsAgo(6)]]);
  const r = calcAdminCommission(companies, firstPaidMap);
  assert("Converted = 1",      r.converted === 1,      `got ${r.converted}`);
  assert("Commission = 29900", r.commission === 29900,  `got ${r.commission}`);
  assert("Tier = Đồng",        r.tier === "Đồng",       `got ${r.tier}`);
}

// ─── SCENARIO 2: Khách hàng mua 13 tháng trước → hết hiệu lực ────────────
console.log("\nSCENARIO 2: Khách mua Pro cách đây 13 tháng → KHÔNG nhận commission");
{
  const companies = [{ id: "c2", name: "Công ty B", plan: "pro" }];
  const firstPaidMap = new Map([["c2", monthsAgo(13)]]);
  const r = calcAdminCommission(companies, firstPaidMap);
  assert("Converted = 0",    r.converted === 0,   `got ${r.converted}`);
  assert("Commission = 0",   r.commission === 0,  `got ${r.commission}`);
  assert("Không có referral trong window", r.paidReferrals.length === 0);
}

// ─── SCENARIO 3: Khách gia hạn sau 12 tháng → vẫn hết hiệu lực ──────────
console.log("\nSCENARIO 3: Khách mua tháng 1, gia hạn liên tục, nay là tháng 14 → HẾT hiệu lực");
{
  // Dù khách vẫn đang trả tiền hàng tháng, first payment là 14 tháng trước
  const companies = [{ id: "c3", name: "Công ty C (gia hạn liên tục)", plan: "pro" }];
  const firstPaidMap = new Map([["c3", monthsAgo(14)]]); // First payment = 14 tháng trước
  const r = calcAdminCommission(companies, firstPaidMap);
  assert("Commission = 0 dù khách đang active", r.commission === 0, `got ${r.commission}`);
}

// ─── SCENARIO 4: Đúng ranh giới 12 tháng ─────────────────────────────────
console.log("\nSCENARIO 4: First payment đúng 12 tháng - 1 ngày → vẫn còn hiệu lực");
{
  const companies = [{ id: "c4", name: "Công ty D", plan: "business" }];
  const firstPaidMap = new Map([["c4", daysAgo(364)]]); // 364 ngày < 365 ngày
  const r = calcAdminCommission(companies, firstPaidMap);
  assert("Commission > 0 (còn 1 ngày)", r.commission > 0, `got ${r.commission}`);
}

console.log("\nSCENARIO 4b: First payment đúng 12 tháng + 1 ngày → HẾT hiệu lực");
{
  const companies = [{ id: "c4b", name: "Công ty D'", plan: "business" }];
  const firstPaidMap = new Map([["c4b", daysAgo(366)]]); // 366 ngày > 365 ngày
  const r = calcAdminCommission(companies, firstPaidMap);
  assert("Commission = 0 (hết hạn 1 ngày)", r.commission === 0, `got ${r.commission}`);
}

// ─── SCENARIO 5: Mix — nhiều khách, một số trong window, một số ngoài ─────
console.log("\nSCENARIO 5: 5 khách, 2 còn hiệu lực, 3 hết → chỉ tính 2");
{
  const companies = [
    { id: "m1", name: "Alpha (3 tháng)",  plan: "pro" },      // ✅ trong window
    { id: "m2", name: "Beta (7 tháng)",   plan: "business" }, // ✅ trong window
    { id: "m3", name: "Gamma (13 tháng)", plan: "pro" },      // ❌ hết hạn
    { id: "m4", name: "Delta (15 tháng)", plan: "business" }, // ❌ hết hạn
    { id: "m5", name: "Epsilon (24 tháng)", plan: "pro" },    // ❌ hết hạn
  ];
  const firstPaidMap = new Map([
    ["m1", monthsAgo(3)],
    ["m2", monthsAgo(7)],
    ["m3", monthsAgo(13)],
    ["m4", monthsAgo(15)],
    ["m5", monthsAgo(24)],
  ]);
  const r = calcAdminCommission(companies, firstPaidMap);
  // Alpha: 299k×10% = 29.900, Beta: 799k×10% = 79.900 → total 109.800
  assert("Converted = 2",        r.converted === 2,    `got ${r.converted}`);
  assert("Revenue = 1.098.000",  r.revenue === 1098000, `got ${r.revenue}`);
  assert("Commission = 109.800", r.commission === 109800, `got ${r.commission}`);
  assert("Chỉ Alpha và Beta được tính",
    r.paidReferrals.includes("Alpha (3 tháng)") && r.paidReferrals.includes("Beta (7 tháng)"),
    `got ${r.paidReferrals}`);
}

// ─── SCENARIO 6: Affiliate dashboard — expired list hiển thị đúng ─────────
console.log("\nSCENARIO 6: Affiliate dashboard — phân loại eligible / pending / expired");
{
  const referrals = [
    { id: "r1", name: "Mới mua 10 ngày",   plan: "pro" },      // pending (< 30 ngày)
    { id: "r2", name: "Mua 3 tháng",        plan: "pro" },      // eligible
    { id: "r3", name: "Mua 13 tháng",       plan: "business" }, // expired
    { id: "r4", name: "Free plan",          plan: "starter" },  // bỏ qua
  ];
  const firstPaidMap = new Map([
    ["r1", daysAgo(10)],
    ["r2", monthsAgo(3)],
    ["r3", monthsAgo(13)],
    // r4 không có payment
  ]);
  const r = calcAffiliateCommission(referrals, firstPaidMap);
  assert("1 eligible",    r.eligible.length === 1, `got ${r.eligible}`);
  assert("1 pending",     r.pending.length  === 1, `got ${r.pending}`);
  assert("1 expired",     r.expired.length  === 1, `got ${r.expired}`);
  assert("Expired là Mua 13 tháng", r.expired[0] === "Mua 13 tháng", `got ${r.expired}`);
  assert("Commission = 29900 (chỉ eligible)", r.commission === 29900, `got ${r.commission}`);
  assert("Pending commission = 29900", r.pendingCommission === 29900, `got ${r.pendingCommission}`);
}

// ─── SCENARIO 7: Khách gia hạn từ Pro lên Business trong window ───────────
console.log("\nSCENARIO 7: Khách mua Pro 6 tháng trước, vừa upgrade Business → commission theo Business");
{
  const companies = [{ id: "u1", name: "Upgraded Corp", plan: "business" }]; // plan hiện tại = business
  const firstPaidMap = new Map([["u1", monthsAgo(6)]]);  // first payment = 6 tháng trước (khi còn Pro)
  const r = calcAdminCommission(companies, firstPaidMap);
  // Dùng plan hiện tại (business 799k) × 10% = 79.900
  assert("Commission = 79900 (business rate)", r.commission === 79900, `got ${r.commission}`);
  assert("Vẫn trong window", r.converted === 1);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log("\n══════════════════════════════════════════════════");
console.log(`  KẾT QUẢ: ${pass} PASS  |  ${fail} FAIL`);
console.log("══════════════════════════════════════════════════\n");
if (fail > 0) process.exit(1);
