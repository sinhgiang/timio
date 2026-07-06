"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import BranchQRCard from "@/components/settings/BranchQRCard";
import AutoReminderPanel from "@/components/settings/AutoReminderPanel";
import LateReminderPanel from "@/components/settings/LateReminderPanel";
import PlanGate from "@/components/ui/PlanGate";
import {
  Monitor,
  Building2,
  Clock,
  Timer,
  Trophy,
  CalendarDays,
  MessageSquare,
  Send,
  QrCode,
  Download,
  Printer,
  PenLine,
  Upload,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  Gift,
  Users,
  Mail,
  ArrowRightLeft,
} from "lucide-react";

interface PenaltyRule {
  id: string;
  fromMinutes: number;
  toMinutes: number;
  amount: number;
  type: string;
}

interface RewardRule {
  id: string;
  condition: string;
  amount: number;
  label: string;
}

interface Branch {
  id: string;
  name: string;
}

interface Props {
  company: { id: string; name: string; slug: string; telegramBotToken?: string; accountingChatId?: string | null; logoUrl?: string | null; signatureUrl?: string | null; stampUrl?: string | null; zaloOaToken?: string | null; zaloOaId?: string | null; zaloAppId?: string | null; zaloSecretKey?: string | null; zaloRefreshToken?: string | null; kioskMessages?: string | null; paydayOfMonth?: number | null };
  penaltyRules: PenaltyRule[];
  rewardRules: RewardRule[];
  branches?: Branch[];
  referralStats?: { registered: number; converted: number; companies?: { name: string; slug: string; plan: string; joinedAt: string }[] };
  plan?: string;
  trialEndsAt?: string | null;
  role?: string;
}

const REWARD_CONDITIONS = [
  "Không đến trễ ngày nào trong tháng",
  "Không vắng ngày nào trong tháng",
  "Không đến trễ và không vắng trong tháng",
  "Đi đủ ngày làm việc trong tháng",
];

interface Holiday {
  id: string;
  date: string;
  name: string;
  isNational: boolean;
  penalizeLate?: boolean;
}

interface HolidayProps extends Props {
  holidays: Holiday[];
}

export default function SettingsClient({ company, penaltyRules, rewardRules, holidays: initialHolidays, branches = [], referralStats, plan = "starter", trialEndsAt = null, role = "owner" }: HolidayProps & { branches?: Branch[]; referralStats?: { registered: number; converted: number; companies?: { name: string; slug: string; plan: string; joinedAt: string }[] }; plan?: string; trialEndsAt?: string | null; role?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"penalty" | "reward">("penalty");
  const [activeSection, setActiveSection] = useState("qr");
  const [loading, setLoading] = useState(false);
  const [telegramToken, setTelegramToken] = useState(company.telegramBotToken ?? "");
  const [accountingChatId, setAccountingChatId] = useState(company.accountingChatId ?? "");
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState("");
  const [testChatId, setTestChatId] = useState("");

  // Logo công ty
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [logoMsg, setLogoMsg] = useState("");

  const saveLogo = async (value: string | null) => {
    setLogoMsg("");
    const res = await fetch("/api/company/logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: value }),
    });
    if (res.ok) {
      setLogoUrl(value ?? "");
      setLogoMsg(value ? "✅ Đã lưu logo!" : "✅ Đã xóa logo.");
    } else {
      const d = await res.json().catch(() => ({}));
      setLogoMsg(`❌ ${d.error ?? "Lưu thất bại"}`);
    }
  };

  const onLogoFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Resize giữ tỉ lệ, rộng tối đa 400px
        const maxW = 400;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        // PNG để giữ nền trong suốt nếu có
        const dataUrl = canvas.toDataURL("image/png");
        saveLogo(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Zalo OA
  const [zaloOaId, setZaloOaId] = useState(company.zaloOaId ?? "");
  const [zaloAppId, setZaloAppId] = useState(company.zaloAppId ?? "");
  const [zaloSecretKey, setZaloSecretKey] = useState(company.zaloSecretKey ?? "");
  const [zaloSaving, setZaloSaving] = useState(false);
  const [zaloMsg, setZaloMsg] = useState("");
  const zaloConnected = !!company.zaloOaToken;
  const [siteOrigin, setSiteOrigin] = useState("https://timio.vn");

  // Đọc kết quả OAuth từ query ?zalo=...
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSiteOrigin(window.location.origin);
    const params = new URLSearchParams(window.location.search);
    const z = params.get("zalo");
    if (!z) return;
    const map: Record<string, string> = {
      ok: "✅ Kết nối Zalo OA thành công! Giờ vào “Kết nối Zalo” để gán nhân viên.",
      denied: "❌ Bạn đã từ chối uỷ quyền hoặc thiếu mã. Thử lại nhé.",
      noappid: "❌ Chưa lưu App ID / Secret Key. Điền và bấm “1. Lưu thông tin” trước.",
      plan: "❌ Tính năng Zalo cần gói Pro trở lên.",
      fail: `❌ Kết nối thất bại: ${params.get("msg") ?? "lỗi không xác định"}`,
    };
    setZaloMsg(map[z] ?? "");
    // xoá query khỏi URL cho sạch
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Kiosk messages
  const defaultKioskMessages = () => {
    try { return JSON.parse(company.kioskMessages ?? "{}"); } catch { return {}; }
  };
  const km = defaultKioskMessages();
  const [kioskMsg, setKioskMsg] = useState({
    welcome:       km.welcome       ?? "Xin chào! Nhìn vào camera để chấm công",
    checkinOntime: km.checkinOntime ?? "Chào {name}! Chúc bạn một ngày làm việc hiệu quả",
    checkinLate:   km.checkinLate   ?? "Chào {name}! Bạn đến trễ {minutes} phút hôm nay",
    checkout:      km.checkout      ?? "Tạm biệt {name}! Hẹn gặp lại",
  });
  const [kioskSaving, setKioskSaving] = useState(false);
  const [kioskSaveMsg, setKioskSaveMsg] = useState("");

  const saveKioskMessages = async () => {
    setKioskSaving(true); setKioskSaveMsg("");
    const res = await fetch("/api/company/kiosk-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kioskMsg),
    });
    setKioskSaveMsg(res.ok ? "✅ Đã lưu!" : "❌ Lỗi lưu");
    setKioskSaving(false);
    if (res.ok) setTimeout(() => setKioskSaveMsg(""), 3000);
  };

  // Payday setting
  const [payday, setPayday] = useState(String(company.paydayOfMonth ?? 5));
  const [paydaySaving, setPaydaySaving] = useState(false);
  const [paydayMsg, setPaydayMsg] = useState("");

  const savePayday = async () => {
    setPaydaySaving(true); setPaydayMsg("");
    const res = await fetch("/api/company/payday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paydayOfMonth: payday }),
    });
    const data = await res.json();
    setPaydayMsg(res.ok ? "✅ Đã lưu ngày phát lương" : `❌ ${data.error}`);
    setPaydaySaving(false);
  };

  // Test email
  const [emailTesting, setEmailTesting] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  const testEmail = async () => {
    setEmailTesting(true);
    setEmailMsg("");
    const res = await fetch("/api/settings/test-email", { method: "POST" });
    const data = await res.json();
    setEmailMsg(res.ok ? "✅ Email đã gửi! Kiểm tra hộp thư của bạn." : `❌ ${data.error}`);
    setEmailTesting(false);
  };

  // Test daily attendance report
  const [reportTesting, setReportTesting] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  const testDailyReport = async () => {
    setReportTesting(true);
    setReportMsg("");
    const res = await fetch("/api/cron/daily-report/test", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      const t = data.totals ?? {};
      setReportMsg(`✅ Đã gửi báo cáo thử về ${data.sentTo} (đúng giờ ${t.onTime ?? 0}, trễ ${t.late ?? 0}, chưa vào ${t.notYet ?? 0})${data.zaloSent ? " + Zalo" : ""}.`);
    } else {
      setReportMsg(`❌ ${data.error}`);
    }
    setReportTesting(false);
  };

  // Password change
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ ok: false, text: "Mật khẩu mới không khớp" }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ ok: false, text: "Mật khẩu mới phải ít nhất 6 ký tự" }); return; }
    setPwLoading(true); setPwMsg(null);
    const res = await fetch("/api/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwMsg({ ok: true, text: "Đổi mật khẩu thành công!" });
      setPwForm({ current: "", next: "", confirm: "" });
    } else {
      setPwMsg({ ok: false, text: data.error ?? "Lỗi đổi mật khẩu" });
    }
    setPwLoading(false);
  };

  // Danger Zone — delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const deleteAccount = async () => {
    if (deleteConfirmSlug !== company.slug) {
      setDeleteError("Slug không khớp. Vui lòng nhập lại đúng.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/delete-account", { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/";
      } else {
        const data = await res.json();
        setDeleteError(data.error ?? "Xóa tài khoản thất bại");
      }
    } catch {
      setDeleteError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Holidays
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [holidayYear, setHolidayYear] = useState(new Date().getFullYear());
  const [holidayForm, setHolidayForm] = useState({ date: "", name: "" });
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayMsg, setHolidayMsg] = useState("");

  const loadHolidays = async (year: number) => {
    const res = await fetch(`/api/holidays?year=${year}`);
    if (res.ok) setHolidays(await res.json());
  };

  const importPreset = async () => {
    setHolidayLoading(true);
    setHolidayMsg("");
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preset: true, year: holidayYear }),
    });
    if (res.ok) {
      const data = await res.json();
      setHolidayMsg(`Đã thêm ${data.imported} ngày lễ năm ${holidayYear}`);
      await loadHolidays(holidayYear);
    }
    setHolidayLoading(false);
  };

  const addHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setHolidayLoading(true);
    await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: holidayForm.date, name: holidayForm.name, isNational: false }),
    });
    setHolidayForm({ date: "", name: "" });
    setShowHolidayForm(false);
    await loadHolidays(holidayYear);
    setHolidayLoading(false);
  };

  const deleteHoliday = async (id: string) => {
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  // Bật/tắt "vẫn tính muộn/phạt" cho 1 ngày lễ (upsert theo date)
  const toggleHolidayPenalize = async (h: Holiday) => {
    const next = !h.penalizeLate;
    setHolidays((prev) => prev.map((x) => (x.id === h.id ? { ...x, penalizeLate: next } : x)));
    await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: h.date, name: h.name, isNational: h.isNational, penalizeLate: next }),
    });
  };

  // Penalty (late)
  const [showLatePenaltyForm, setShowLatePenaltyForm] = useState(false);
  const [latePenaltyForm, setLatePenaltyForm] = useState({ fromMinutes: "", toMinutes: "", amount: "" });

  // Penalty (early leave)
  const [showEarlyForm, setShowEarlyForm] = useState(false);
  const [earlyForm, setEarlyForm] = useState({ fromMinutes: "", toMinutes: "", amount: "" });

  // Reward
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [rewardForm, setRewardForm] = useState({ label: "", condition: REWARD_CONDITIONS[2], amount: "" });

  const checkinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkin/${company.slug}`
      : `/checkin/${company.slug}`;

  const [copiedCheckin, setCopiedCheckin] = useState(false);
  const [copiedLeave, setCopiedLeave] = useState(false);
  const [copiedEmployee, setCopiedEmployee] = useState(false);

  const copyCheckinUrl = () => {
    navigator.clipboard.writeText(checkinUrl).catch(() => {});
    setCopiedCheckin(true);
    setTimeout(() => setCopiedCheckin(false), 2000);
  };

  const copyLeaveUrl = () => {
    navigator.clipboard.writeText(leaveUrl).catch(() => {});
    setCopiedLeave(true);
    setTimeout(() => setCopiedLeave(false), 2000);
  };

  const copyEmployeeUrl = () => {
    navigator.clipboard.writeText(employeeUrl).catch(() => {});
    setCopiedEmployee(true);
    setTimeout(() => setCopiedEmployee(false), 2000);
  };

  // QR code canvas — check-in
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrReady, setQrReady] = useState(false);

  const setQrCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    qrCanvasRef.current = canvas;
    if (!canvas || !checkinUrl) return;
    setQrReady(false);
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvas, checkinUrl, {
        width: 260,
        margin: 2,
        color: { dark: "#1e3a8a", light: "#ffffff" },
      }).then(() => setQrReady(true)).catch(() => {});
    });
  }, [checkinUrl]);

  // QR code canvas — leave kiosk
  const qrLeaveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrLeaveReady, setQrLeaveReady] = useState(false);
  const leaveUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/leave/${company.slug}`
      : `/leave/${company.slug}`;

  const setQrLeaveCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    qrLeaveCanvasRef.current = canvas;
    if (!canvas || !leaveUrl) return;
    setQrLeaveReady(false);
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvas, leaveUrl, {
        width: 260,
        margin: 2,
        color: { dark: "#166534", light: "#ffffff" },
      }).then(() => setQrLeaveReady(true)).catch(() => {});
    });
  }, [leaveUrl]);

  const downloadLeaveQR = () => {
    if (!qrLeaveCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-leave-${company.slug}.png`;
    link.href = qrLeaveCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const printLeaveQR = () => {
    if (!qrLeaveCanvasRef.current) return;
    const dataUrl = qrLeaveCanvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Xin Nghỉ Phép — ${company.name}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        img { width: 280px; height: 280px; }
        h2 { font-size: 22px; margin: 16px 0 8px; color: #166534; }
        p { font-size: 13px; color: #64748b; margin: 0; }
        .url { font-size: 11px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
        @media print { @page { margin: 1cm; } }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h2>${company.name}</h2>
        <p>Quét mã để xin nghỉ phép</p>
        <p class="url">${leaveUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  // QR code canvas — employee portal
  const qrEmployeeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrEmployeeReady, setQrEmployeeReady] = useState(false);
  const employeeUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/employee/${company.slug}`
      : `/employee/${company.slug}`;

  const setQrEmployeeCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    qrEmployeeCanvasRef.current = canvas;
    if (!canvas) return;
    setQrEmployeeReady(false);
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvas, employeeUrl, {
        width: 260,
        margin: 2,
        color: { dark: "#7c3aed", light: "#ffffff" },
      }).then(() => setQrEmployeeReady(true));
    });
  }, [employeeUrl]);

  const downloadEmployeeQR = () => {
    if (!qrEmployeeCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-employee-${company.slug}.png`;
    link.href = qrEmployeeCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const printEmployeeQR = () => {
    if (!qrEmployeeCanvasRef.current) return;
    const dataUrl = qrEmployeeCanvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Tra Cứu Chấm Công — ${company.name}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        img { width: 280px; height: 280px; }
        h2 { font-size: 22px; margin: 16px 0 8px; color: #7c3aed; }
        p { font-size: 13px; color: #64748b; margin: 0; }
        .url { font-size: 11px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
        @media print { @page { margin: 1cm; } }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h2>${company.name}</h2>
        <p>Tra cứu chấm công cá nhân</p>
        <p class="url">${employeeUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  // QR code canvas — trang tuyển dụng công khai
  const qrRecruitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrRecruitReady, setQrRecruitReady] = useState(false);
  const [copiedRecruit, setCopiedRecruit] = useState(false);
  const recruitUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tuyendung/${company.slug}`
      : `/tuyendung/${company.slug}`;

  const copyRecruitUrl = () => {
    navigator.clipboard.writeText(recruitUrl).catch(() => {});
    setCopiedRecruit(true);
    setTimeout(() => setCopiedRecruit(false), 2000);
  };

  const setQrRecruitCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    qrRecruitCanvasRef.current = canvas;
    if (!canvas) return;
    setQrRecruitReady(false);
    import("qrcode").then(({ toCanvas }) => {
      toCanvas(canvas, recruitUrl, {
        width: 260,
        margin: 2,
        color: { dark: "#c2410c", light: "#ffffff" },
      }).then(() => setQrRecruitReady(true)).catch(() => {});
    });
  }, [recruitUrl]);

  const downloadRecruitQR = () => {
    if (!qrRecruitCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-tuyendung-${company.slug}.png`;
    link.href = qrRecruitCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const printRecruitQR = () => {
    if (!qrRecruitCanvasRef.current) return;
    const dataUrl = qrRecruitCanvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Tuyển Dụng — ${company.name}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        img { width: 280px; height: 280px; }
        h2 { font-size: 22px; margin: 16px 0 8px; color: #c2410c; }
        p { font-size: 13px; color: #64748b; margin: 0; }
        .url { font-size: 11px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
        @media print { @page { margin: 1cm; } }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h2>${company.name} đang tuyển dụng</h2>
        <p>Quét mã để xem vị trí và ứng tuyển</p>
        <p class="url">${recruitUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  // Signature / Stamp upload
  const [sigUrl, setSigUrl] = useState<string | null>(company.signatureUrl ?? null);
  const [stampUrl, setStampUrl] = useState<string | null>(company.stampUrl ?? null);
  const [sigSaving, setSigSaving] = useState(false);
  const [sigMsg, setSigMsg] = useState("");

  const uploadImage = async (file: File, field: "signatureUrl" | "stampUrl") => {
    if (file.size > 300 * 1024) { setSigMsg("Ảnh quá lớn (tối đa 300KB)"); return; }
    setSigSaving(true); setSigMsg("");
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const res = await fetch("/api/settings/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: base64 }),
      });
      if (res.ok) {
        if (field === "signatureUrl") setSigUrl(base64);
        else setStampUrl(base64);
        setSigMsg("Đã lưu!");
      } else {
        setSigMsg("Lưu thất bại");
      }
      setSigSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = async (field: "signatureUrl" | "stampUrl") => {
    setSigSaving(true); setSigMsg("");
    await fetch("/api/settings/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, value: null }),
    });
    if (field === "signatureUrl") setSigUrl(null);
    else setStampUrl(null);
    setSigSaving(false);
    setSigMsg("Đã xóa");
  };

  const downloadQR = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qrcode-${company.slug}.png`;
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const printQR = () => {
    if (!qrCanvasRef.current) return;
    const dataUrl = qrCanvasRef.current.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Check-in — ${company.name}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        img { width: 280px; height: 280px; }
        h2 { font-size: 22px; margin: 16px 0 8px; color: #1e3a8a; }
        p { font-size: 13px; color: #64748b; margin: 0; }
        .url { font-size: 11px; color: #94a3b8; margin-top: 8px; font-family: monospace; }
        @media print { @page { margin: 1cm; } }
      </style></head>
      <body>
        <img src="${dataUrl}" />
        <h2>${company.name}</h2>
        <p>Quét mã để chấm công</p>
        <p class="url">${checkinUrl}</p>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body></html>
    `);
    win.document.close();
  };

  const lateRules = penaltyRules.filter((r) => r.type !== "early_leave");
  const earlyRules = penaltyRules.filter((r) => r.type === "early_leave");

  const savePenaltyRule = async (type: "late" | "early_leave", form: typeof latePenaltyForm) => {
    setLoading(true);
    await fetch("/api/penalty-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromMinutes: Number(form.fromMinutes),
        toMinutes: Number(form.toMinutes),
        amount: Number(form.amount),
        companyId: company.id,
        type,
      }),
    });
    setLoading(false);
    if (type === "late") { setShowLatePenaltyForm(false); setLatePenaltyForm({ fromMinutes: "", toMinutes: "", amount: "" }); }
    else { setShowEarlyForm(false); setEarlyForm({ fromMinutes: "", toMinutes: "", amount: "" }); }
    router.refresh();
  };

  const deletePenaltyRule = async (id: string) => {
    await fetch(`/api/penalty-rules/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const saveRewardRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/reward-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: rewardForm.label, condition: rewardForm.condition, amount: Number(rewardForm.amount) }),
    });
    setLoading(false);
    setShowRewardForm(false);
    setRewardForm({ label: "", condition: REWARD_CONDITIONS[2], amount: "" });
    router.refresh();
  };

  const deleteRewardRule = async (id: string) => {
    await fetch(`/api/reward-rules/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const saveTelegramToken = async () => {
    setTelegramSaving(true);
    setTelegramMsg("");
    await fetch("/api/company/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramBotToken: telegramToken, accountingChatId }),
    });
    setTelegramSaving(false);
    setTelegramMsg("Đã lưu!");
    router.refresh();
  };

  const saveZaloToken = async () => {
    setZaloSaving(true);
    setZaloMsg("");
    const res = await fetch("/api/company/zalo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zaloOaId, zaloAppId, zaloSecretKey }),
    });
    setZaloSaving(false);
    setZaloMsg(res.ok ? "✅ Đã lưu. Giờ bấm \"Kết nối Zalo OA\" bên dưới." : "❌ Lưu thất bại");
    router.refresh();
  };

  const testTelegram = async () => {
    if (!testChatId.trim()) { setTelegramMsg("Nhập Chat ID trước"); return; }
    setTelegramSaving(true);
    setTelegramMsg("");
    const res = await fetch("/api/company/telegram", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: testChatId }),
    });
    setTelegramSaving(false);
    setTelegramMsg(res.ok ? "✅ Gửi thành công! Kiểm tra Telegram." : "❌ Gửi thất bại — kiểm tra lại Bot Token và Chat ID.");
  };

  const SETTINGS_NAV = [
    { key: "qr",        label: "QR & Link",     Icon: QrCode },
    { key: "penalty",   label: "Phạt & Thưởng", Icon: Clock },
    { key: "holiday",   label: "Ngày lễ",        Icon: CalendarDays },
    { key: "notify",    label: "Thông báo",      Icon: MessageSquare },
    { key: "kiosk",     label: "Kiosk",          Icon: Monitor },
    { key: "signature", label: "Chữ ký & Dấu",  Icon: PenLine },
    { key: "account",   label: "Tài khoản",      Icon: Users },
    { key: "referral",  label: "Giới thiệu",     Icon: Gift },
  ];

  return (
    <div className="flex min-h-full">
      {/* ── Left nav ── */}
      <nav className="w-52 shrink-0 border-r border-gray-100 py-6 bg-white self-start sticky top-0 min-h-screen">
        <p className="text-[10px] font-bold text-gray-400 px-4 mb-3 uppercase tracking-wider">Cài đặt</p>
        {SETTINGS_NAV.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
              activeSection === key
                ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={15} className={activeSection === key ? "text-blue-600" : "text-gray-400"} />
            {label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className={`flex-1 p-6 ${activeSection === "qr" ? "max-w-6xl" : "max-w-3xl"}`}>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {SETTINGS_NAV.find(s => s.key === activeSection)?.label ?? "Cài đặt"}
        </h1>

      {activeSection === "qr" && <>
      {/* Check-in URL */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-700 mb-1">
          <Monitor size={14} /> Link chấm công
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-white px-3 py-2 rounded-lg border border-blue-200 text-blue-800 truncate">
            {checkinUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(checkinUrl)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >Copy</button>
        </div>
      </div>

      {/* QR Codes — 4 loại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

        {/* QR Chấm công */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1 self-start flex-wrap">
            <QrCode size={14} className="text-blue-600" />
            <span className="font-semibold text-gray-800 text-xs">QR Chấm công</span>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">In & dán</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-2 self-start leading-tight">Nhân viên quét mặt → check-in tự động.</p>
          <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 mb-2">
            <canvas ref={setQrCanvas} className={qrReady ? "block" : "hidden"} style={{ width: 150, height: 150 }} />
            {!qrReady && <div className="w-[150px] h-[150px] flex items-center justify-center text-gray-400 text-[10px]">Đang tạo QR...</div>}
          </div>
          <div className="flex items-center gap-1 mb-2 w-full">
            <code className="flex-1 text-[10px] bg-gray-100 px-1.5 py-1 rounded text-blue-800 break-all min-w-0 leading-tight">{checkinUrl}</code>
            <button onClick={copyCheckinUrl} title="Copy link"
              className={`shrink-0 p-1 rounded-lg border transition-all ${copiedCheckin ? "bg-green-50 border-green-200 text-green-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600"}`}>
              {copiedCheckin ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex gap-1.5 w-full">
            <button onClick={downloadQR} disabled={!qrReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] hover:bg-blue-700 disabled:opacity-50">
              <Download size={11} /> Tải
            </button>
            <button onClick={printQR} disabled={!qrReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-[11px] hover:bg-gray-50 disabled:opacity-50">
              <Printer size={11} /> In
            </button>
          </div>
        </div>

        {/* QR Nghỉ phép */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1 self-start flex-wrap">
            <QrCode size={14} className="text-green-700" />
            <span className="font-semibold text-gray-800 text-xs">QR Xin nghỉ phép</span>
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">In & dán</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-2 self-start leading-tight">Nhân viên quét mặt → gửi đơn nghỉ.</p>
          <div className="bg-green-50 p-2 rounded-xl border border-green-100 mb-2">
            <canvas ref={setQrLeaveCanvas} className={qrLeaveReady ? "block" : "hidden"} style={{ width: 150, height: 150 }} />
            {!qrLeaveReady && <div className="w-[150px] h-[150px] flex items-center justify-center text-gray-400 text-[10px]">Đang tạo QR...</div>}
          </div>
          <div className="flex items-center gap-1 mb-2 w-full">
            <code className="flex-1 text-[10px] bg-gray-100 px-1.5 py-1 rounded text-green-800 break-all min-w-0 leading-tight">{leaveUrl}</code>
            <button onClick={copyLeaveUrl} title="Copy link"
              className={`shrink-0 p-1 rounded-lg border transition-all ${copiedLeave ? "bg-green-50 border-green-200 text-green-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-green-50 hover:border-green-200 hover:text-green-600"}`}>
              {copiedLeave ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex gap-1.5 w-full">
            <button onClick={downloadLeaveQR} disabled={!qrLeaveReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-700 text-white rounded-lg text-[11px] hover:bg-green-800 disabled:opacity-50">
              <Download size={11} /> Tải
            </button>
            <button onClick={printLeaveQR} disabled={!qrLeaveReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-[11px] hover:bg-gray-50 disabled:opacity-50">
              <Printer size={11} /> In
            </button>
          </div>
        </div>

        {/* QR Tra cứu chấm công */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1 self-start flex-wrap">
            <QrCode size={14} className="text-violet-600" />
            <span className="font-semibold text-gray-800 text-xs">QR Tra cứu</span>
            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">Nhân viên tự xem</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-2 self-start leading-tight">Nhân viên quét → nhập mã + PIN → xem lịch.</p>
          <div className="bg-violet-50 p-2 rounded-xl border border-violet-100 mb-2">
            <canvas ref={setQrEmployeeCanvas} className={qrEmployeeReady ? "block" : "hidden"} style={{ width: 150, height: 150 }} />
            {!qrEmployeeReady && <div className="w-[150px] h-[150px] flex items-center justify-center text-gray-400 text-[10px]">Đang tạo QR...</div>}
          </div>
          <div className="flex items-center gap-1 mb-2 w-full">
            <code className="flex-1 text-[10px] bg-gray-100 px-1.5 py-1 rounded text-violet-800 break-all min-w-0 leading-tight">{employeeUrl}</code>
            <button onClick={copyEmployeeUrl} title="Copy link"
              className={`shrink-0 p-1 rounded-lg border transition-all ${copiedEmployee ? "bg-green-50 border-green-200 text-green-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600"}`}>
              {copiedEmployee ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex gap-1.5 w-full">
            <button onClick={downloadEmployeeQR} disabled={!qrEmployeeReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg text-[11px] hover:bg-violet-700 disabled:opacity-50">
              <Download size={11} /> Tải
            </button>
            <button onClick={printEmployeeQR} disabled={!qrEmployeeReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-[11px] hover:bg-gray-50 disabled:opacity-50">
              <Printer size={11} /> In
            </button>
          </div>
        </div>

        {/* QR Tuyển dụng */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-1 self-start flex-wrap">
            <QrCode size={14} className="text-orange-600" />
            <span className="font-semibold text-gray-800 text-xs">QR Tuyển dụng</span>
            <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">Đăng FB/Zalo</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-2 self-start leading-tight">Ứng viên quét → xem vị trí → tự nộp đơn.</p>
          <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 mb-2">
            <canvas ref={setQrRecruitCanvas} className={qrRecruitReady ? "block" : "hidden"} style={{ width: 150, height: 150 }} />
            {!qrRecruitReady && <div className="w-[150px] h-[150px] flex items-center justify-center text-gray-400 text-[10px]">Đang tạo QR...</div>}
          </div>
          <div className="flex items-center gap-1 mb-2 w-full">
            <code className="flex-1 text-[10px] bg-gray-100 px-1.5 py-1 rounded text-orange-800 break-all min-w-0 leading-tight">{recruitUrl}</code>
            <button onClick={copyRecruitUrl} title="Copy link"
              className={`shrink-0 p-1 rounded-lg border transition-all ${copiedRecruit ? "bg-green-50 border-green-200 text-green-600" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600"}`}>
              {copiedRecruit ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="flex gap-1.5 w-full">
            <button onClick={downloadRecruitQR} disabled={!qrRecruitReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-600 text-white rounded-lg text-[11px] hover:bg-orange-700 disabled:opacity-50">
              <Download size={11} /> Tải
            </button>
            <button onClick={printRecruitQR} disabled={!qrRecruitReady}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-[11px] hover:bg-gray-50 disabled:opacity-50">
              <Printer size={11} /> In
            </button>
          </div>
        </div>

      </div>

      {/* QR per branch */}
      {branches.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <QrCode size={16} className="text-blue-600" />
            <span className="font-semibold text-gray-800 text-sm">QR riêng từng chi nhánh</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mỗi chi nhánh 1 mã</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Mỗi chi nhánh có 1 mã QR riêng. In ra dán tại lối vào — nhân viên quét đúng kiosk chi nhánh của họ.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <BranchQRCard
                key={branch.id}
                branch={branch}
                companySlug={company.slug}
                companyName={company.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Branch link card */}
      <Link
        href="/dashboard/branches"
        className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 mb-6 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-blue-500" />
          <div>
            <p className="font-medium text-gray-800 group-hover:text-blue-700">Quản lý Chi nhánh &amp; Ca làm</p>
            <p className="text-sm text-gray-500">Thêm, sửa, xóa chi nhánh · Cấu hình giờ vào/ra · Chọn ngày làm việc</p>
          </div>
        </div>
        <span className="text-gray-400 group-hover:text-blue-600">→</span>
      </Link>

      {/* Migration card */}
      <Link
        href="/dashboard/migrate"
        className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 mb-6 hover:border-blue-300 hover:bg-blue-50/30 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <ArrowRightLeft size={22} className="text-blue-500" strokeWidth={1.5} />
          <div>
            <p className="font-medium text-gray-800 group-hover:text-blue-700">Chuyển dữ liệu từ phần mềm khác</p>
            <p className="text-sm text-gray-500">Import nhân viên &amp; chấm công từ Tanca, Amis, Base HRM, 1Office, ACheckin...</p>
          </div>
        </div>
        <span className="text-gray-400 group-hover:text-blue-600">→</span>
      </Link>
      </>}

      {activeSection === "penalty" && <>
      {/* Tabs */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6 w-fit">
        {(["penalty", "reward"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t === "penalty" ? "Bảng phạt" : "Bảng thưởng"}
          </button>
        ))}
      </div>

      {/* ── Bảng phạt ── */}
      {tab === "penalty" && (
        <div className="space-y-6">

          {/* Đến muộn */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-700"><Clock size={16} className="text-orange-500" /> Quy tắc phạt đến muộn</div>
                <p className="text-xs text-gray-400 mt-0.5">Áp dụng mặc định cho tất cả nhân viên</p>
              </div>
              <button
                onClick={() => setShowLatePenaltyForm(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >+ Thêm mức</button>
            </div>

            {showLatePenaltyForm && (
              <form onSubmit={(e) => { e.preventDefault(); savePenaltyRule("late", latePenaltyForm); }} className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Từ (phút)</label>
                    <input type="number" min="1" value={latePenaltyForm.fromMinutes} onChange={(e) => setLatePenaltyForm({ ...latePenaltyForm, fromMinutes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Đến (phút)</label>
                    <input type="number" min="1" value={latePenaltyForm.toMinutes} onChange={(e) => setLatePenaltyForm({ ...latePenaltyForm, toMinutes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phạt (VND)</label>
                    <input type="number" min="0" step="1000" value={latePenaltyForm.amount} onChange={(e) => setLatePenaltyForm({ ...latePenaltyForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowLatePenaltyForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Lưu</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Trễ từ</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Đến</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Phạt</th>
                    <th className="text-right px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lateRules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 text-gray-700">{r.fromMinutes} phút</td>
                      <td className="px-5 py-3 text-gray-700">{r.toMinutes} phút</td>
                      <td className="px-5 py-3 text-red-600 font-medium">{formatCurrency(r.amount)}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => deletePenaltyRule(r.id)} className="text-red-400 hover:text-red-600 text-xs">Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {lateRules.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-5 text-gray-400 text-sm">Chưa có quy tắc phạt đến muộn</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Về sớm */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-700"><Timer size={16} className="text-purple-500" /> Quy tắc phạt về sớm</div>
                <p className="text-xs text-gray-400 mt-0.5">Áp dụng mặc định cho tất cả nhân viên</p>
              </div>
              <button
                onClick={() => setShowEarlyForm(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >+ Thêm mức</button>
            </div>

            {showEarlyForm && (
              <form onSubmit={(e) => { e.preventDefault(); savePenaltyRule("early_leave", earlyForm); }} className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Từ (phút)</label>
                    <input type="number" min="1" value={earlyForm.fromMinutes} onChange={(e) => setEarlyForm({ ...earlyForm, fromMinutes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Đến (phút)</label>
                    <input type="number" min="1" value={earlyForm.toMinutes} onChange={(e) => setEarlyForm({ ...earlyForm, toMinutes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phạt (VND)</label>
                    <input type="number" min="0" step="1000" value={earlyForm.amount} onChange={(e) => setEarlyForm({ ...earlyForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowEarlyForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Lưu</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Về sớm từ</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Đến</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Phạt</th>
                    <th className="text-right px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {earlyRules.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3 text-gray-700">{r.fromMinutes} phút</td>
                      <td className="px-5 py-3 text-gray-700">{r.toMinutes} phút</td>
                      <td className="px-5 py-3 text-red-600 font-medium">{formatCurrency(r.amount)}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => deletePenaltyRule(r.id)} className="text-red-400 hover:text-red-600 text-xs">Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {earlyRules.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-5 text-gray-400 text-sm">Chưa có quy tắc phạt về sớm</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── Bảng thưởng ── */}
      {tab === "reward" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-gray-700"><Trophy size={16} className="text-yellow-500" /> Quy tắc thưởng chuyên cần</div>
              <p className="text-xs text-gray-400 mt-0.5">Áp dụng mặc định cho tất cả nhân viên, tính cuối tháng</p>
            </div>
            <button
              onClick={() => setShowRewardForm(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >+ Thêm thưởng</button>
          </div>

          {showRewardForm && (
            <form onSubmit={saveRewardRule} className="bg-white rounded-xl border border-gray-200 p-5 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên khoản thưởng</label>
                <input
                  type="text"
                  value={rewardForm.label}
                  onChange={(e) => setRewardForm({ ...rewardForm, label: e.target.value })}
                  placeholder="VD: Thưởng chuyên cần tháng"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Điều kiện</label>
                <select
                  value={rewardForm.condition}
                  onChange={(e) => setRewardForm({ ...rewardForm, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {REWARD_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số tiền thưởng (VND)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={rewardForm.amount}
                  onChange={(e) => setRewardForm({ ...rewardForm, amount: e.target.value })}
                  placeholder="VD: 500000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowRewardForm(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50">Lưu</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-green-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Tên khoản thưởng</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Điều kiện</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Thưởng</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rewardRules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3 font-medium text-gray-700">{r.label}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{r.condition}</td>
                    <td className="px-5 py-3 text-green-600 font-semibold">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => deleteRewardRule(r.id)} className="text-red-400 hover:text-red-600 text-xs">Xóa</button>
                    </td>
                  </tr>
                ))}
                {rewardRules.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-400">Chưa có quy tắc thưởng nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </>}

      {/* ── Ngày Lễ ── */}
      {activeSection === "holiday" && (
        <PlanGate requiredPlan="pro" feature="Quản lý ngày lễ" mode="section">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 font-semibold text-gray-700"><CalendarDays size={16} className="text-red-500" /> Lịch nghỉ lễ</div>
              <p className="text-xs text-gray-400 mt-0.5">Ngày lễ sẽ không tính vắng trong báo cáo</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={holidayYear}
                onChange={(e) => { const y = Number(e.target.value); setHolidayYear(y); loadHolidays(y); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <button
                onClick={importPreset}
                disabled={holidayLoading}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >Nhập lễ VN {holidayYear}</button>
              <button
                onClick={() => setShowHolidayForm(true)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >+ Thêm tự chọn</button>
            </div>
          </div>

          {holidayMsg && <p className="text-sm text-green-600 font-medium mb-3">{holidayMsg}</p>}

          {showHolidayForm && (
            <form onSubmit={addHoliday} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Ngày</label>
                <input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên ngày lễ</label>
                <input type="text" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} placeholder="VD: Nghỉ lễ công ty" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              </div>
              <button type="button" onClick={() => setShowHolidayForm(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">Hủy</button>
              <button type="submit" disabled={holidayLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Lưu</button>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-red-50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Ngày</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Tên ngày lễ</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Loại</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Đi làm ngày này</th>
                  <th className="text-right px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {holidays.filter((h) => h.date.startsWith(String(holidayYear))).map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3 font-mono text-gray-700">{h.date}</td>
                    <td className="px-5 py-3 text-gray-700">{h.name}</td>
                    <td className="px-5 py-3">
                      {h.isNational
                        ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Quốc gia</span>
                        : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Công ty</span>}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleHolidayPenalize(h)}
                        title="Ngày lễ này: nếu nhân viên vẫn đi làm, có tính muộn + phạt không?"
                        className={`text-xs px-2.5 py-1 rounded-full font-medium border transition-colors ${
                          h.penalizeLate
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-green-50 border-green-200 text-green-700"
                        }`}
                      >
                        {h.penalizeLate ? "Vẫn tính muộn/phạt" : "Không phạt (nghỉ lễ)"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => deleteHoliday(h.id)} className="text-red-400 hover:text-red-600 text-xs">Xóa</button>
                    </td>
                  </tr>
                ))}
                {holidays.filter((h) => h.date.startsWith(String(holidayYear))).length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      <p>Chưa có ngày lễ nào cho năm {holidayYear}</p>
                      <p className="text-xs mt-1">Nhấn &ldquo;Nhập lễ VN&rdquo; để thêm tất cả ngày lễ quốc gia</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </PlanGate>
      )}

      {activeSection === "notify" && <>
      {/* ── Telegram Notifications ── */}
      <PlanGate requiredPlan="pro" feature="Thông báo Telegram" className="mt-8">
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={20} className="text-blue-500" />
          <h2 className="text-base font-bold text-gray-800">Thông báo Telegram</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Nhận cảnh báo khi nhân viên đến trễ và báo cáo chấm công hàng ngày qua Telegram.</p>

        <div className="space-y-3 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveTelegramToken}
                disabled={telegramSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >Lưu</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Tạo bot tại <span className="font-mono">@BotFather</span> trên Telegram → chép token vào đây.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kiểm tra kết nối</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                placeholder="Chat ID hoặc Group ID (VD: -1001234567890)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={testTelegram}
                disabled={telegramSaving || !telegramToken}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
              >Gửi thử</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Nhập Chat ID của nhóm muốn nhận thông báo chấm công trễ. Thêm bot vào nhóm trước.</p>
          </div>

          {/* Chat ID kế toán */}
          <div>
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
              💰 Chat ID kế toán
              <span className="text-xs text-gray-400 font-normal">(nhận thông báo khi duyệt nghỉ phép)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={accountingChatId}
                onChange={(e) => setAccountingChatId(e.target.value)}
                placeholder="-1001234567890 (ID nhóm kế toán)"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveTelegramToken}
                disabled={telegramSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >Lưu</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Khi admin duyệt nghỉ phép, bot sẽ tự động gửi thông báo vào nhóm này.</p>
          </div>

          {telegramMsg && (
            <p className={`text-sm font-medium ${telegramMsg.startsWith("✅") || telegramMsg.startsWith("Đã") ? "text-green-600" : "text-red-500"}`}>
              {telegramMsg}
            </p>
          )}

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 mt-2">
            <strong>Cách lấy Chat ID:</strong> Thêm bot @userinfobot vào nhóm → nó sẽ trả về Chat ID. Hoặc mở link:
            <code className="block mt-1 text-xs bg-white px-2 py-1 rounded border border-amber-200">
              https://api.telegram.org/bot&#123;TOKEN&#125;/getUpdates
            </code>
          </div>
        </div>
      </div>
      </PlanGate>

      {/* ── Logo công ty ── */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={20} className="text-blue-500" />
          <h2 className="text-base font-bold text-gray-800">Logo công ty</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Logo sẽ hiển thị ở đầu các email thông báo gửi cho nhân viên (nhắc chấm công, thông báo...). Nên dùng ảnh PNG nền trong suốt.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-40 h-20 rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="logo" className="max-h-16 max-w-[150px] object-contain" />
            ) : (
              <ImageIcon size={24} className="text-gray-300" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium border border-blue-100 w-fit">
              <Upload size={14} /> {logoUrl ? "Đổi logo" : "Tải logo lên"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogoFile(f); }}
              />
            </label>
            {logoUrl && (
              <button
                type="button"
                onClick={() => saveLogo(null)}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 w-fit"
              >
                <X size={12} /> Xóa logo
              </button>
            )}
            {logoMsg && <p className={`text-xs font-medium ${logoMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{logoMsg}</p>}
            <p className="text-xs text-gray-400">PNG/JPG, tự động thu nhỏ. Tối đa ~400KB.</p>
          </div>
        </div>
      </div>

      {/* ── Zalo OA ── */}
      <PlanGate requiredPlan="pro" feature="Thông báo Zalo OA" className="mt-8">
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={20} className="text-blue-500" />
          <h2 className="text-base font-bold text-gray-800">Thông báo Zalo</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Kết nối Zalo OA để gửi thông báo (duyệt nghỉ phép, nhắc chấm công, trợ lý AI gửi tin) tự động cho nhân viên và thành viên đã follow OA.
        </p>

        {zaloConnected && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-sm text-green-700 font-medium max-w-xl">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Đã kết nối Zalo OA — sẵn sàng gửi tin.
            </span>
            <a
              href="/dashboard/zalo-connect"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100"
            >
              <MessageSquare size={14} /> Gán nhân viên đã follow →
            </a>
          </div>
        )}
        {zaloMsg && <p className={`text-sm mb-3 font-medium ${zaloMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>{zaloMsg}</p>}

        <div className="space-y-3 max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">OA ID</label>
              <input
                value={zaloOaId}
                onChange={(e) => setZaloOaId(e.target.value)}
                placeholder="VD: 994206080815296531"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">App ID</label>
              <input
                value={zaloAppId}
                onChange={(e) => setZaloAppId(e.target.value)}
                placeholder="App ID (developers.zalo.me)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Secret Key (Khóa bí mật)</label>
            <input
              type="password"
              value={zaloSecretKey}
              onChange={(e) => setZaloSecretKey(e.target.value)}
              placeholder="App Secret Key"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveZaloToken}
              disabled={zaloSaving}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >{zaloSaving ? "Đang lưu..." : "1. Lưu thông tin"}</button>
            <a
              href="/api/zalo/oauth/start"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >2. Kết nối Zalo OA →</a>
          </div>

          {/* Callback URL cần đăng ký trong Zalo App */}
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">Trước khi bấm “Kết nối”, dán URL này vào Zalo App → Official Account → Callback URL:</p>
            <code className="block bg-white border border-amber-200 rounded px-2 py-1 mt-1 break-all text-amber-900 select-all">
              {siteOrigin}/api/zalo/oauth/callback
            </code>
          </div>

          <div className="mt-1 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1.5">
            <p className="font-semibold">Các bước (làm 1 lần):</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-600">
              <li>Điền <strong>OA ID, App ID, Secret Key</strong> ở trên → bấm <strong>1. Lưu thông tin</strong></li>
              <li>Trong Zalo App, dán <strong>Callback URL</strong> (khung vàng) vào mục Official Account → Cập nhật</li>
              <li>Bấm <strong>2. Kết nối Zalo OA</strong> → đồng ý uỷ quyền → xong (token tự gia hạn)</li>
              <li>Vào <strong>Kết nối Zalo</strong> (menu trái) để gán nhân viên đã follow OA</li>
            </ol>
          </div>
        </div>
      </div>
      </PlanGate>

      {/* ── Email Notifications ── */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-blue-500" />
          <h2 className="text-base font-bold text-gray-800">Thông báo Email</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Timio tự động gửi email khi nhân viên gửi đơn xin nghỉ và khi affiliate có đơn hàng mới.
          Cấu hình SMTP tại biến môi trường <code className="bg-gray-100 px-1 rounded">SMTP_USER</code> / <code className="bg-gray-100 px-1 rounded">SMTP_PASS</code>.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={testEmail}
            disabled={emailTesting}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={14} />
            {emailTesting ? "Đang gửi..." : "Gửi email kiểm tra"}
          </button>
          {emailMsg && (
            <span className={`text-sm font-medium ${emailMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {emailMsg}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Email kiểm tra sẽ được gửi đến địa chỉ email đăng nhập của bạn.
        </p>
      </div>

      {/* ── Daily Attendance Report ── */}
      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-indigo-500" />
          <h2 className="text-base font-bold text-gray-800">Báo cáo chấm công hàng ngày</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Mỗi ngày lúc 8:00 sáng, hệ thống gửi báo cáo (đúng giờ / đến trễ / chưa vào) cho các quản lý đã bật.
          Bật/tắt cho từng người tại <a href="/dashboard/team" className="text-indigo-600 hover:underline">Nhân sự → Nhận báo cáo hàng ngày</a>.
          Gửi qua Email (miễn phí) và Zalo (nếu công ty đã kết nối OA + quản lý đã follow).
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={testDailyReport}
            disabled={reportTesting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={14} />
            {reportTesting ? "Đang gửi..." : "Gửi thử báo cáo ngay"}
          </button>
          {reportMsg && (
            <span className={`text-sm font-medium ${reportMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {reportMsg}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Báo cáo thử được gửi ngay đến email đăng nhập của bạn (dùng để kiểm tra).
        </p>
      </div>

      {/* ── Auto Reminder (nhắc chấm công tự động) ── */}
      <AutoReminderPanel zaloConnected={zaloConnected} />

      {/* ── Late Reminder (nhắc trễ theo ca) ── */}
      <LateReminderPanel zaloConnected={zaloConnected} />

      {/* ── Auto Payslip ── */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail size={20} className="text-green-500" />
          <h2 className="text-base font-bold text-gray-800">Tự động gửi phiếu lương</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Hệ thống sẽ tự động gửi phiếu lương qua email cho toàn bộ nhân viên vào ngày đã chọn mỗi tháng.
          Phiếu lương tháng trước sẽ được gửi (VD: ngày 5/7 → phiếu lương tháng 6).
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ngày phát lương hàng tháng</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Ngày</span>
              <input
                type="number"
                min={1}
                max={31}
                value={payday}
                onChange={e => setPayday(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-green-400"
              />
              <span className="text-sm text-gray-500">hàng tháng</span>
            </div>
          </div>
          <button
            onClick={savePayday}
            disabled={paydaySaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {paydaySaving ? "Đang lưu..." : "Lưu"}
          </button>
          {paydayMsg && (
            <span className={`text-sm font-medium ${paydayMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {paydayMsg}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Chỉ gửi đến nhân viên đã có địa chỉ email trong hồ sơ. Kiểm tra email ở trang Nhân viên.
        </p>
      </div>
      </>}

      {activeSection === "kiosk" && <>
      {/* ── Kiosk Messages ── */}
      <PlanGate requiredPlan="pro" feature="Tùy chỉnh lời chào kiosk" className="mt-8">
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={20} className="text-indigo-500" />
          <h2 className="text-base font-bold text-gray-800">Lời chào trên màn hình kiosk</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Tùy chỉnh lời chào hiển thị trên kiosk chấm công. Dùng <code className="bg-gray-100 px-1 rounded">{"{name}"}</code> cho tên nhân viên, <code className="bg-gray-100 px-1 rounded">{"{minutes}"}</code> cho số phút trễ.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {([
            { key: "welcome",       label: "Màn hình chờ",        placeholder: "Xin chào! Nhìn vào camera để chấm công" },
            { key: "checkinOntime", label: "Check-in đúng giờ",   placeholder: "Chào {name}! Chúc bạn một ngày làm việc hiệu quả" },
            { key: "checkinLate",   label: "Check-in đi trễ",     placeholder: "Chào {name}! Bạn đến trễ {minutes} phút hôm nay" },
            { key: "checkout",      label: "Check-out về",        placeholder: "Tạm biệt {name}! Hẹn gặp lại" },
          ] as { key: keyof typeof kioskMsg; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={kioskMsg[key]}
                onChange={(e) => setKioskMsg((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={saveKioskMessages}
            disabled={kioskSaving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {kioskSaving ? "Đang lưu..." : "Lưu lời chào"}
          </button>
          {kioskSaveMsg && (
            <span className={`text-sm font-medium ${kioskSaveMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {kioskSaveMsg}
            </span>
          )}
        </div>
      </div>
      </PlanGate>
      </>}

      {activeSection === "signature" && <>
      {/* ── Chữ ký & Dấu công ty ── */}
      <PlanGate requiredPlan="business" feature="Chữ ký số & Dấu công ty" className="mt-8">
      <div className="border-t border-gray-100 pt-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <PenLine size={20} className="text-purple-500" />
          <h2 className="text-base font-bold text-gray-800">Chữ ký &amp; Dấu công ty</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Tự động chèn vào phiếu nghỉ phép khi duyệt. Upload ảnh PNG nền trong suốt, tối đa 300KB.</p>
        {sigMsg && (
          <p className={`text-sm font-medium mb-3 ${sigMsg.includes("thất bại") || sigMsg.includes("lớn") ? "text-red-500" : "text-green-600"}`}>{sigMsg}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Chữ ký */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Chữ ký admin</p>
            {sigUrl ? (
              <div className="mb-3 bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center justify-center min-h-[80px]">
                <img src={sigUrl} alt="Chữ ký" className="max-h-20 max-w-full object-contain" />
              </div>
            ) : (
              <div className="mb-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 min-h-[80px] flex items-center justify-center">
                Chưa có chữ ký
              </div>
            )}
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 ${sigSaving ? "opacity-50" : ""}`}>
                <Upload size={13} /> {sigUrl ? "Thay ảnh" : "Upload"}
                <input type="file" accept="image/*" className="hidden" disabled={sigSaving}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "signatureUrl"); e.target.value = ""; }}
                />
              </label>
              {sigUrl && (
                <button onClick={() => removeImage("signatureUrl")} disabled={sigSaving} className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Dấu công ty */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Dấu công ty</p>
            {stampUrl ? (
              <div className="mb-3 bg-gray-50 rounded-lg border border-gray-100 p-3 flex items-center justify-center min-h-[80px]">
                <img src={stampUrl} alt="Dấu công ty" className="max-h-20 max-w-full object-contain" />
              </div>
            ) : (
              <div className="mb-3 bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 min-h-[80px] flex items-center justify-center">
                Chưa có dấu
              </div>
            )}
            <div className="flex gap-2">
              <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 ${sigSaving ? "opacity-50" : ""}`}>
                <Upload size={13} /> {stampUrl ? "Thay ảnh" : "Upload"}
                <input type="file" accept="image/*" className="hidden" disabled={sigSaving}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "stampUrl"); e.target.value = ""; }}
                />
              </label>
              {stampUrl && (
                <button onClick={() => removeImage("stampUrl")} disabled={sigSaving} className="px-3 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </PlanGate>
      </>}

      {activeSection === "account" && <>
      {/* ── ĐỔI MẬT KHẨU ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Monitor className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Đổi mật khẩu</h2>
        </div>
        <div className="max-w-sm space-y-3">
          {(["current", "next", "confirm"] as const).map((k) => (
            <div key={k}>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {k === "current" ? "Mật khẩu hiện tại" : k === "next" ? "Mật khẩu mới" : "Xác nhận mật khẩu mới"}
              </label>
              <input
                type="password"
                value={pwForm[k]}
                onChange={(e) => setPwForm((f) => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          {pwMsg && (
            <p className={`text-sm font-medium ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>{pwMsg.text}</p>
          )}
          <button
            onClick={changePassword}
            disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {pwLoading ? "Đang lưu..." : "Đổi mật khẩu"}
          </button>
        </div>
      </div>

      {/* ── Thông tin gói dịch vụ ── */}
      <PlanInfoSection plan={plan} trialEndsAt={trialEndsAt} />

      {/* ── Vùng nguy hiểm ── */}
      {role === "owner" && (
        <div className="mt-8 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base font-bold text-red-600">Vùng nguy hiểm</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Xóa tài khoản sẽ xóa toàn bộ dữ liệu công ty, nhân viên, chấm công và không thể khôi phục.
          </p>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmSlug(""); setDeleteError(""); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Xóa tài khoản &amp; toàn bộ dữ liệu
          </button>
        </div>
      )}

      </>}

      {activeSection === "referral" && (
        <ReferralSection slug={company.slug} stats={referralStats} />
      )}

      </div>
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-bold text-red-600 mb-2">Xác nhận xóa tài khoản</h2>
            <p className="text-sm text-gray-600 mb-4">
              Hành động này không thể hoàn tác. Toàn bộ dữ liệu công ty, nhân viên và chấm công sẽ bị xóa vĩnh viễn.
            </p>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Nhập slug công ty để xác nhận:{" "}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono">{company.slug}</code>
            </p>
            <input
              type="text"
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              placeholder={company.slug}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400"
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-red-500 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmSlug(""); setDeleteError(""); }}
                disabled={deleteLoading}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteLoading || deleteConfirmSlug !== company.slug}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Đang xóa..." : "Xóa vĩnh viễn"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanInfoSection({ plan, trialEndsAt }: { plan: string; trialEndsAt: string | null }) {
  const planLabel = plan === "business" ? "Business" : plan === "pro" ? "Pro" : "Starter (Miễn phí)";

  let trialInfo: { daysLeft: number; isExpired: boolean } | null = null;
  if (trialEndsAt && plan === "starter") {
    const now = new Date();
    const endsAt = new Date(trialEndsAt);
    const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86400000);
    trialInfo = { daysLeft, isExpired: daysLeft <= 0 };
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={18} className="text-blue-600" />
        <h2 className="text-base font-bold text-gray-800">Thông tin gói dịch vụ</h2>
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Gói hiện tại */}
        <div className="flex-1 min-w-[140px] bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wide">Gói hiện tại</p>
          <p className="text-lg font-bold text-gray-800">{planLabel}</p>
        </div>

        {/* Thông tin dùng thử */}
        {trialInfo !== null && (
          <div className={`flex-1 min-w-[160px] rounded-xl border p-4 ${
            trialInfo.isExpired
              ? "bg-red-50 border-red-100"
              : trialInfo.daysLeft <= 3
              ? "bg-orange-50 border-orange-100"
              : "bg-blue-50 border-blue-100"
          }`}>
            <p className="text-xs font-medium mb-1 uppercase tracking-wide text-gray-400">Thời gian dùng thử</p>
            {trialInfo.isExpired ? (
              <p className="text-base font-bold text-red-600">Đã hết hạn</p>
            ) : (
              <p className={`text-lg font-bold ${trialInfo.daysLeft <= 3 ? "text-orange-600" : "text-blue-600"}`}>
                Còn {trialInfo.daysLeft} ngày
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              Hết hạn: {new Date(trialEndsAt!).toLocaleDateString("vi-VN")}
            </p>
          </div>
        )}

        {/* Nút nâng cấp */}
        {plan === "starter" && (
          <div className="flex-1 min-w-[160px] bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 flex flex-col justify-between">
            <p className="text-xs text-blue-100 font-medium mb-2">Mở khóa toàn bộ tính năng</p>
            <a
              href="/dashboard/billing"
              className="inline-block text-center px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              Nâng cấp lên Pro
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralSection({ slug, stats }: { slug: string; stats?: { registered: number; converted: number; companies?: { name: string; slug: string; plan: string; joinedAt: string }[] } }) {
  const [copied, setCopied] = useState(false);
  const referralLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${slug}`
    : `https://timio.vn/register?ref=${slug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const companies = stats?.companies ?? [];
  // Tính thẳng từ danh sách để UI và logic luôn khớp nhau
  const rewardDays = companies.filter((c) => c.plan === "pro" || c.plan === "business").length * 30;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Gift size={18} className="text-green-600" />
        <h2 className="text-base font-bold text-gray-800">Giới thiệu nhận thưởng</h2>
      </div>

      {/* Cơ chế */}
      <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4 text-sm text-green-800 leading-relaxed">
        Chia sẻ link của bạn với các doanh nghiệp khác. Khi họ đăng ký và <strong>nâng cấp lên Pro</strong> lần đầu tiên,
        {" "}<strong>cả hai bên đều được tặng +30 ngày Pro miễn phí</strong> — tự động, không cần làm gì thêm.
      </div>

      {/* Referral link */}
      <p className="text-xs text-gray-500 font-medium mb-1.5 uppercase tracking-wide">Link giới thiệu của bạn</p>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono truncate select-all">
          {referralLink}
        </div>
        <button
          onClick={copyLink}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            copied ? "bg-green-100 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          }`}
        >
          {copied ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Copy</>}
        </button>
      </div>

      {/* Stats — mỗi gói một ô riêng */}
      {(() => {
        const countFree = companies.filter((c) => c.plan === "starter").length;
        const countPro  = companies.filter((c) => c.plan === "pro").length;
        const countBiz  = companies.filter((c) => c.plan === "business").length;
        // Thưởng: mỗi công ty mua Pro hoặc Business lần đầu → +30 ngày
        // rewardDays đã tính đúng = (pro + biz) * 30 ở trên
        return (
          <div className="grid grid-cols-5 gap-2 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <p className="text-xl font-bold text-gray-700">{companies.length}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Tổng</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
              <p className="text-xl font-bold text-orange-500">{countFree}</p>
              <p className="text-[10px] text-orange-400 mt-0.5 font-medium">Miễn phí</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <p className="text-xl font-bold text-blue-700">{countPro}</p>
              <p className="text-[10px] text-blue-500 mt-0.5 font-medium">Gói Pro</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
              <p className="text-xl font-bold text-purple-700">{countBiz}</p>
              <p className="text-[10px] text-purple-500 mt-0.5 font-medium">Business</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <p className="text-xl font-bold text-green-700">+{rewardDays}</p>
              <p className="text-[10px] text-green-600 mt-0.5 font-medium">Ngày thưởng</p>
            </div>
          </div>
        );
      })()}

      {/* Danh sách công ty — hiện rõ từng gói */}
      {companies.length > 0 ? (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">Danh sách công ty đăng ký qua link của bạn</p>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>Công ty</span>
              <span className="text-center w-28">Gói đang dùng</span>
              <span className="text-right w-24">Thưởng của bạn</span>
            </div>
            {companies.map((c, i) => {
              const date = new Date(c.joinedAt).toLocaleDateString("vi-VN");
              const planBadge = (() => {
                if (c.plan === "business") return { label: "Business", cls: "bg-purple-100 text-purple-700" };
                if (c.plan === "pro")      return { label: "Pro",      cls: "bg-blue-100 text-blue-700" };
                return                           { label: "Miễn phí",  cls: "bg-gray-100 text-gray-500" };
              })();
              const hasPaid = c.plan === "pro" || c.plan === "business";
              return (
                <div key={c.slug} className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-4 py-3 ${i > 0 ? "border-t border-gray-50" : ""} ${hasPaid ? "bg-green-50/30" : "bg-white"}`}>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">Đăng ký {date}</p>
                  </div>
                  <span className={`w-28 text-center text-[11px] font-bold px-2.5 py-1 rounded-full ${planBadge.cls}`}>
                    {planBadge.label}
                  </span>
                  <span className={`w-24 text-right text-xs font-semibold ${hasPaid ? "text-green-600" : "text-gray-300"}`}>
                    {hasPaid ? "+30 ngày ✓" : "Chờ nâng cấp"}
                  </span>
                </div>
              );
            })}
          </div>
          {rewardDays > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <Users size={14} />
              Tổng cộng bạn đã nhận <strong className="mx-1">+{rewardDays} ngày Pro</strong> từ giới thiệu!
            </div>
          )}
          {companies.some((c) => c.plan === "starter") && (
            <p className="text-xs text-orange-500 mt-2">
              {companies.filter((c) => c.plan === "starter").length} công ty đang dùng gói miễn phí —
              khi họ nâng cấp lên Pro, bạn sẽ tự động nhận thêm ngày thưởng.
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-5 border border-dashed border-gray-200 rounded-xl">
          <Users size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Chưa có ai đăng ký qua link của bạn</p>
          <p className="text-xs text-gray-400 mt-0.5">Copy link ở trên và chia sẻ để bắt đầu nhận thưởng</p>
        </div>
      )}
    </div>
  );
}
