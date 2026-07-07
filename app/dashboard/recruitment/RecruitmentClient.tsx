"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Pencil, Trash2, Briefcase, UserPlus, X, Check, Clock, ExternalLink, Link2, HelpCircle, ChevronDown, ChevronUp, Share2, Inbox, FileText, UserCheck, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import ComboField from "@/components/ui/ComboField";
import VoiceInput from "@/components/ui/VoiceInput";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";

type Branch = { id: string; name: string };

type Job = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  description: string | null;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  status: string;
  branchId: string | null;
  quantity: number | null;
  workTime: string | null;
  benefits: string | null;
  isPublic: boolean;
  createdAt: string;
  _count: { candidates: number };
};

type Candidate = {
  id: string;
  jobId: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  source: string | null;
  experience: string | null;
  cvUrl: string | null;
  aiScore: number | null;
  aiSummary: string | null;
  hiredEmpId: string | null;
  appliedAt: string;
  job: { id: string; title: string; department: string | null; branchId?: string | null };
};

// Thứ tự các cột pipeline (rejected để cuối, tách riêng)
const PIPELINE: string[] = ["new", "reviewing", "interview", "offer", "hired"];
const PIPELINE_ALL: string[] = [...PIPELINE, "rejected"];

// Màu điểm AI: xanh ≥70, vàng 40-69, xám thiếu dữ liệu
function aiScoreStyle(score: number | null): { cls: string; label: string } {
  if (score == null) return { cls: "bg-gray-100 text-gray-500", label: "—" };
  if (score >= 70) return { cls: "bg-green-100 text-green-700", label: String(score) };
  if (score >= 40) return { cls: "bg-amber-100 text-amber-700", label: String(score) };
  return { cls: "bg-gray-200 text-gray-600", label: String(score) };
}

const JOB_STATUS_LABELS: Record<string, string> = {
  open: "Đang tuyển",
  closed: "Đã đóng",
  filled: "Đã tuyển được",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
  filled: "bg-blue-100 text-blue-700",
};

const CANDIDATE_STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  reviewing: "Đang xem xét",
  interview: "Phỏng vấn",
  offer: "Đề nghị nhận việc",
  hired: "Đã tuyển",
  rejected: "Từ chối",
};

const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-600",
  reviewing: "bg-yellow-100 text-yellow-700",
  interview: "bg-blue-100 text-blue-700",
  offer: "bg-purple-100 text-purple-700",
  hired: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Giới thiệu",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  other: "Khác",
};

export default function RecruitmentClient({
  companySlug, plan, branches, allDepartments, customDepartments, allPositions, customPositions, allLocations,
}: {
  companySlug: string;
  plan: string;
  branches: Branch[];
  allDepartments: string[];
  customDepartments: string[];
  allPositions: string[];
  customPositions: string[];
  allLocations: string[];
}) {
  const isBusiness = plan === "business";
  const saveCustomOption = async (type: "department" | "position", name: string) => {
    await fetch("/api/company/custom-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    }).catch(() => {});
  };

  const [localDepts, setLocalDepts] = useState<string[]>(allDepartments);
  const [customDepts, setCustomDepts] = useState<Set<string>>(new Set(customDepartments));
  const addDept = (v: string) => {
    setLocalDepts((p) => (p.includes(v) ? p : [v, ...p]));
    setCustomDepts((p) => new Set(Array.from(p).concat(v)));
    void saveCustomOption("department", v);
  };

  const [localPositions, setLocalPositions] = useState<string[]>(allPositions);
  const [customPos, setCustomPos] = useState<Set<string>>(new Set(customPositions));
  const addPosition = (v: string) => {
    setLocalPositions((p) => (p.includes(v) ? p : [v, ...p]));
    setCustomPos((p) => new Set(Array.from(p).concat(v)));
    void saveCustomOption("position", v);
  };

  const [localLocations, setLocalLocations] = useState<string[]>(allLocations);
  const addLocation = (v: string) => setLocalLocations((p) => (p.includes(v) ? p : [v, ...p]));

  const publicUrl =
    typeof window !== "undefined" && companySlug
      ? `${window.location.origin}/tuyendung/${companySlug}`
      : `/tuyendung/${companySlug}`;
  const [copiedLink, setCopiedLink] = useState(false);
  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };
  const branchName = (id: string | null) => (id ? branches.find((b) => b.id === id)?.name ?? null : null);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"jobs" | "candidates">("jobs");
  const [showGuide, setShowGuide] = useState(false);

  // Job form
  const [jobForm, setJobForm] = useState<Partial<Job> | null>(null);
  const [savingJob, setSavingJob] = useState(false);

  // Candidate form
  const [candForm, setCandForm] = useState<Partial<Candidate> | null>(null);
  const [savingCand, setSavingCand] = useState(false);

  // Kanban drag + tuyển-1-chạm + xem chi tiết
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [viewCand, setViewCand] = useState<Candidate | null>(null);
  const [hireCand, setHireCand] = useState<Candidate | null>(null);
  const [hireForm, setHireForm] = useState({ branchId: "", department: "", position: "", code: "", baseSalary: "", joinDate: "", pin: "" });
  const [hiring, setHiring] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [hireResult, setHireResult] = useState<{ empName: string; empCode: string; faceUrl: string } | null>(null);
  const [copiedFace, setCopiedFace] = useState(false);

  const openHire = (cand: Candidate) => {
    setHireError(null);
    setHireResult(null);
    setHireForm({
      branchId: branches.length === 1 ? branches[0].id : (cand.job?.branchId || ""),
      department: cand.job?.department || "",
      position: cand.job?.title || "",
      code: "",
      baseSalary: "",
      joinDate: new Date().toISOString().slice(0, 10),
      pin: "",
    });
    setHireCand(cand);
  };

  async function submitHire() {
    if (!hireCand) return;
    setHireError(null);
    if (!hireForm.branchId) { setHireError("Vui lòng chọn chi nhánh."); return; }
    if (!hireForm.code.trim()) { setHireError("Vui lòng nhập mã nhân viên."); return; }
    setHiring(true);
    try {
      const res = await fetch(`/api/recruitment/candidates/${hireCand.id}/hire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hireForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setHireError(data?.error || "Không tạo được hồ sơ nhân viên."); setHiring(false); return; }
      const faceUrl = typeof window !== "undefined" ? `${window.location.origin}${data.faceRegisterPath}` : data.faceRegisterPath;
      setHireResult({ empName: data.employee.name, empCode: data.employee.code, faceUrl });
      fetchCandidates(selectedJob?.id);
      fetchJobs();
    } catch {
      setHireError("Lỗi kết nối. Vui lòng thử lại.");
    }
    setHiring(false);
  }

  const copyFaceUrl = () => {
    if (!hireResult) return;
    navigator.clipboard.writeText(hireResult.faceUrl).catch(() => {});
    setCopiedFace(true);
    setTimeout(() => setCopiedFace(false), 2000);
  };

  // ─── Đợt 3: AI ──────────────────────────────────────────────
  // AI viết tin tuyển dụng
  const [aiHint, setAiHint] = useState("");
  const [aiJdLoading, setAiJdLoading] = useState(false);
  const [aiJdError, setAiJdError] = useState<string | null>(null);
  async function aiWriteJD(hintArg?: string) {
    const hint = (hintArg ?? aiHint).trim();
    if (!hint) return;
    if (hintArg) setAiHint(hintArg);
    setAiJdLoading(true); setAiJdError(null);
    try {
      const res = await fetch("/api/recruitment/ai/jd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAiJdError(data?.error || "AI viết không thành công."); setAiJdLoading(false); return; }
      const jd = data.jd;
      // Khớp tên chi nhánh AI trả về với chi nhánh công ty (không phân biệt hoa/thường)
      const norm = (s: string) => s.trim().toLowerCase();
      const matchedBranch = jd.branchName
        ? branches.find((b) => norm(b.name) === norm(jd.branchName)) || branches.find((b) => norm(b.name).includes(norm(jd.branchName)) || norm(jd.branchName).includes(norm(b.name)))
        : null;
      // Nếu AI điền phòng ban/địa điểm mới → thêm vào danh sách gợi ý
      if (jd.department && !localDepts.includes(jd.department)) setLocalDepts((p) => [jd.department, ...p]);
      if (jd.location && !localLocations.includes(jd.location)) setLocalLocations((p) => [jd.location, ...p]);
      setJobForm((f) => ({
        ...(f || {}),
        title: jd.title || f?.title || "",
        department: jd.department || f?.department || null,
        location: (matchedBranch ? matchedBranch.name : jd.location) || f?.location || null,
        branchId: matchedBranch ? matchedBranch.id : (f?.branchId ?? null),
        description: jd.description || null,
        requirements: jd.requirements || null,
        benefits: jd.benefits || null,
        workTime: jd.workTime || null,
        quantity: typeof jd.quantity === "number" ? jd.quantity : (f?.quantity ?? null),
        salaryMin: typeof jd.salaryMin === "number" ? jd.salaryMin : (f?.salaryMin ?? null),
        salaryMax: typeof jd.salaryMax === "number" ? jd.salaryMax : (f?.salaryMax ?? null),
        isPublic: f?.isPublic ?? true,
      }));
    } catch { setAiJdError("Lỗi kết nối."); }
    setAiJdLoading(false);
  }

  // Modal content Facebook/Zalo
  const [socialJob, setSocialJob] = useState<Job | null>(null);
  const [socialContent, setSocialContent] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [copiedSocial, setCopiedSocial] = useState(false);
  async function openSocial(job: Job) {
    setSocialJob(job); setSocialContent(""); setSocialError(null); setSocialLoading(true);
    try {
      const res = await fetch("/api/recruitment/ai/social", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, origin: typeof window !== "undefined" ? window.location.origin : "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSocialError(data?.error || "AI soạn nội dung không thành công."); setSocialLoading(false); return; }
      setSocialContent(data.content || "");
    } catch { setSocialError("Lỗi kết nối."); }
    setSocialLoading(false);
  }
  const copySocial = () => {
    navigator.clipboard.writeText(socialContent).catch(() => {});
    setCopiedSocial(true);
    setTimeout(() => setCopiedSocial(false), 2000);
  };

  // Chấm điểm lại 1 ứng viên
  const [scoringId, setScoringId] = useState<string | null>(null);
  async function rescore(cand: Candidate) {
    setScoringId(cand.id);
    try {
      const res = await fetch(`/api/recruitment/candidates/${cand.id}/score`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCandidates((prev) => prev.map((c) => (c.id === cand.id ? { ...c, aiScore: data.aiScore, aiSummary: data.aiSummary } : c)));
        setViewCand((v) => (v && v.id === cand.id ? { ...v, aiScore: data.aiScore, aiSummary: data.aiSummary } : v));
      } else {
        alert(data?.error || "Chấm điểm không thành công.");
      }
    } catch { /* noop */ }
    setScoringId(null);
  }

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/recruitment/jobs");
    const data = await res.json();
    setJobs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const fetchCandidates = useCallback(async (jobId?: string) => {
    const url = jobId ? `/api/recruitment/candidates?jobId=${jobId}` : "/api/recruitment/candidates";
    const res = await fetch(url);
    const data = await res.json();
    setCandidates(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { fetchJobs(); fetchCandidates(); }, [fetchJobs, fetchCandidates]);

  async function saveJob() {
    setSavingJob(true);
    const method = jobForm?.id ? "PATCH" : "POST";
    const url = jobForm?.id ? `/api/recruitment/jobs/${jobForm.id}` : "/api/recruitment/jobs";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobForm),
    });
    setSavingJob(false);
    setJobForm(null);
    fetchJobs();
  }

  async function deleteJob(id: string) {
    if (!confirm("Xóa vị trí này? Tất cả ứng viên liên quan cũng bị xóa.")) return;
    await fetch(`/api/recruitment/jobs/${id}`, { method: "DELETE" });
    if (selectedJob?.id === id) setSelectedJob(null);
    fetchJobs();
    fetchCandidates();
  }

  async function updateJobStatus(id: string, status: string) {
    await fetch(`/api/recruitment/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchJobs();
  }

  async function saveCandidate() {
    setSavingCand(true);
    const method = candForm?.id ? "PATCH" : "POST";
    const url = candForm?.id ? `/api/recruitment/candidates/${candForm.id}` : "/api/recruitment/candidates";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(candForm),
    });
    setSavingCand(false);
    setCandForm(null);
    fetchCandidates(selectedJob?.id);
    fetchJobs();
  }

  async function updateCandStatus(id: string, status: string) {
    // Cập nhật lạc quan để kéo-thả mượt
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    await fetch(`/api/recruitment/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    fetchJobs();
  }

  // Di chuyển ứng viên theo mũi tên (trong pipeline chính)
  function moveCandidate(cand: Candidate, dir: -1 | 1) {
    const idx = PIPELINE.indexOf(cand.status);
    if (idx === -1) {
      // đang ở rejected → đưa về cột đầu khi bấm tiến
      if (dir === 1) updateCandStatus(cand.id, "new");
      return;
    }
    const next = idx + dir;
    if (next < 0 || next >= PIPELINE.length) return;
    updateCandStatus(cand.id, PIPELINE[next]);
  }

  function onDropColumn(status: string) {
    if (draggedId) {
      const cand = candidates.find((c) => c.id === draggedId);
      if (cand && cand.status !== status) updateCandStatus(draggedId, status);
    }
    setDraggedId(null);
    setDragOverCol(null);
  }

  async function deleteCandidate(id: string) {
    if (!confirm("Xóa ứng viên này?")) return;
    await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" });
    fetchCandidates(selectedJob?.id);
    fetchJobs();
  }

  const displayedCandidates = selectedJob
    ? candidates.filter(c => c.jobId === selectedJob.id)
    : candidates;

  const openJobs = jobs.filter(j => j.status === "open").length;
  const totalCandidates = candidates.length;
  const hiredCount = candidates.filter(c => c.status === "hired").length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Briefcase size={20} className="text-blue-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Tuyển dụng</h1>
            <p className="text-sm text-gray-500">Quản lý vị trí tuyển dụng và ứng viên</p>
          </div>
        </div>
        {companySlug && (
          <div className="flex items-center gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <ExternalLink size={14} /> Xem trang tuyển dụng
            </a>
            <button
              onClick={copyPublicUrl}
              title="Sao chép link trang tuyển dụng"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${copiedLink ? "bg-green-50 border-green-200 text-green-600" : "bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600"}`}
            >
              {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
              {copiedLink ? "Đã chép" : "Chép link"}
            </button>
          </div>
        )}
      </div>

      {/* Banner giới thiệu trang công khai */}
      {companySlug && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Link2 size={18} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800">Trang tuyển dụng công khai của bạn đã sẵn sàng</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Chia sẻ link này lên Facebook/Zalo để ứng viên tự nộp đơn — đơn về thẳng mục Ứng viên.
              </p>
              <code className="inline-block mt-1.5 text-[11px] bg-white border border-blue-100 px-2 py-1 rounded text-blue-700 break-all">
                {publicUrl}
              </code>
            </div>
            <button
              onClick={() => setShowGuide((v) => !v)}
              className="shrink-0 flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <HelpCircle size={15} /> Cách dùng
              {(showGuide || (!loading && jobs.length === 0)) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Hướng dẫn nhanh 4 bước — tự mở khi chưa có vị trí nào */}
      {companySlug && (showGuide || (!loading && jobs.length === 0)) && (
        <div className="mb-6 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Tuyển dụng hoạt động thế nào?</h3>
            <span className="text-xs text-gray-400">4 bước đơn giản</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                n: 1, Icon: FileText, color: "blue",
                title: "Đăng vị trí tuyển",
                desc: 'Bấm "Thêm vị trí", điền công việc/lương/ca làm. Nhớ bật "Hiện trên trang tuyển dụng công khai".',
              },
              {
                n: 2, Icon: Share2, color: "indigo",
                title: "Chia sẻ link / QR",
                desc: 'Bấm "Chép link" hoặc lấy QR trong Cài đặt → QR & Link, đăng lên Facebook/Zalo hoặc in dán trước cửa hàng.',
              },
              {
                n: 3, Icon: Inbox, color: "orange",
                title: "Ứng viên tự nộp đơn",
                desc: "Người xem bấm link → chọn vị trí → điền tên/SĐT/kinh nghiệm. Bạn nhận email báo ngay khi có đơn mới.",
              },
              {
                n: 4, Icon: UserCheck, color: "green",
                title: "Xem & liên hệ",
                desc: 'Mọi đơn hiện ở tab "Ứng viên". Bấm để xem thông tin, gọi điện, đổi trạng thái theo tiến trình tuyển.',
              },
            ].map((s) => {
              const c = {
                blue: "bg-blue-50 text-blue-600 border-blue-100",
                indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
                orange: "bg-orange-50 text-orange-600 border-orange-100",
                green: "bg-green-50 text-green-600 border-green-100",
              }[s.color]!;
              return (
                <div key={s.n} className={`rounded-xl border p-3.5 ${c.split(" ")[2]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.split(" ").slice(0, 2).join(" ")}`}>
                      <s.Icon size={16} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-bold text-gray-400">Bước {s.n}</span>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setActiveTab("jobs"); setJobForm({ title: "", department: null, location: null, description: null, requirements: null, salaryMin: null, salaryMax: null, branchId: null, quantity: null, workTime: null, benefits: null, isPublic: true }); }}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={15} /> Đăng vị trí đầu tiên
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-lg text-sm hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              <ExternalLink size={15} /> Xem thử trang tuyển dụng
            </a>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Vị trí đang tuyển", value: openJobs, color: "text-green-600", bg: "bg-green-50" },
          { label: "Tổng ứng viên", value: totalCandidates, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Đã tuyển được", value: hiredCount, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {(["jobs", "candidates"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab === "jobs" ? `Vị trí tuyển (${jobs.length})` : `Ứng viên (${candidates.length})`}
          </button>
        ))}
      </div>

      {/* Jobs tab */}
      {activeTab === "jobs" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Vị trí tuyển dụng</h2>
            <button
              onClick={() => setJobForm({ title: "", department: null, location: null, description: null, requirements: null, salaryMin: null, salaryMax: null, branchId: null, quantity: null, workTime: null, benefits: null, isPublic: true })}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} /> Thêm vị trí
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Đang tải...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Briefcase size={32} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm">Chưa có vị trí tuyển dụng nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {jobs.map(job => (
                <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3
                          className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => { setSelectedJob(job); setActiveTab("candidates"); fetchCandidates(job.id); }}
                        >
                          {job.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLORS[job.status]}`}>
                          {JOB_STATUS_LABELS[job.status]}
                        </span>
                        {job.status === "open" && (
                          job.isPublic ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600">Công khai</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Nội bộ</span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {job.department && <span>{job.department}</span>}
                        {branchName(job.branchId) && <span>· {branchName(job.branchId)}</span>}
                        {job.location && !branchName(job.branchId) && <span>· {job.location}</span>}
                        {job.workTime && <span>· {job.workTime}</span>}
                        {job.quantity ? <span>· Cần {job.quantity}</span> : null}
                        {(job.salaryMin || job.salaryMax) && (
                          <span>· {job.salaryMin ? job.salaryMin.toLocaleString("vi-VN") : "?"} — {job.salaryMax ? job.salaryMax.toLocaleString("vi-VN") : "?"} ₫</span>
                        )}
                        <span className="text-blue-600 font-medium cursor-pointer" onClick={() => { setSelectedJob(job); setActiveTab("candidates"); fetchCandidates(job.id); }}>
                          {job._count.candidates} ứng viên →
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isBusiness && (
                        <button
                          onClick={() => openSocial(job)}
                          title="AI soạn bài đăng Facebook/Zalo"
                          className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
                        >
                          <Sparkles size={12} /> Đăng FB/Zalo
                        </button>
                      )}
                      <select
                        value={job.status}
                        onChange={e => updateJobStatus(job.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                      >
                        <option value="open">Đang tuyển</option>
                        <option value="closed">Đóng tuyển</option>
                        <option value="filled">Đã tuyển được</option>
                      </select>
                      <button onClick={() => setJobForm({ ...job })} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteJob(job.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Candidates tab — Kanban pipeline */}
      {activeTab === "candidates" && (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-700">
                {selectedJob ? `Ứng viên — ${selectedJob.title}` : "Tất cả ứng viên"}
              </h2>
              {selectedJob && (
                <button onClick={() => { setSelectedJob(null); fetchCandidates(); }} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Xem tất cả
                </button>
              )}
              <span className="text-xs text-gray-400">· Kéo thẻ để đổi trạng thái</span>
            </div>
            <button
              onClick={() => setCandForm({ jobId: selectedJob?.id || jobs[0]?.id || "", name: "", email: null, phone: null, source: null, notes: null })}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={14} /> Thêm ứng viên
            </button>
          </div>

          {displayedCandidates.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Users size={32} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm">Chưa có ứng viên nào</p>
              <p className="text-xs text-gray-400 mt-1">Ứng viên nộp từ trang tuyển dụng sẽ tự hiện ở đây.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-3">
              {PIPELINE_ALL.map((status) => {
                const cands = displayedCandidates.filter((c) => c.status === status);
                const isRejected = status === "rejected";
                return (
                  <div
                    key={status}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
                    onDragLeave={() => setDragOverCol((s) => (s === status ? null : s))}
                    onDrop={() => onDropColumn(status)}
                    className={`shrink-0 w-64 rounded-2xl border transition-colors ${
                      dragOverCol === status ? "border-blue-400 bg-blue-50/60" : isRejected ? "border-gray-200 bg-gray-50" : "border-gray-200 bg-gray-50/60"
                    }`}
                  >
                    <div className="px-3 py-2.5 flex items-center justify-between sticky top-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CANDIDATE_STATUS_COLORS[status]}`}>
                        {CANDIDATE_STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{cands.length}</span>
                    </div>
                    <div className="px-2 pb-2 space-y-2 min-h-[80px]">
                      {cands.map((cand) => {
                        const ai = aiScoreStyle(cand.aiScore);
                        const pipeIdx = PIPELINE.indexOf(cand.status);
                        const canHire = (cand.status === "offer" || cand.status === "hired") && !cand.hiredEmpId;
                        return (
                          <div
                            key={cand.id}
                            draggable
                            onDragStart={() => setDraggedId(cand.id)}
                            onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                            className={`bg-white border border-gray-200 rounded-xl p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors ${draggedId === cand.id ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button onClick={() => setViewCand(cand)} className="min-w-0 text-left flex-1">
                                <p className="font-semibold text-gray-800 text-sm truncate">{cand.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">
                                  {cand.job?.title || "—"}
                                  {cand.source ? ` · ${SOURCE_LABELS[cand.source] || cand.source}` : ""}
                                </p>
                              </button>
                              <span
                                title={cand.aiScore != null ? `Điểm AI: ${cand.aiScore}/100` : "Chưa chấm điểm AI"}
                                className={`shrink-0 text-[11px] font-bold w-7 h-7 rounded-lg flex items-center justify-center ${ai.cls}`}
                              >
                                {ai.label}
                              </span>
                            </div>

                            {cand.phone && (
                              <a href={`tel:${cand.phone}`} className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:underline">
                                {cand.phone}
                              </a>
                            )}
                            {cand.experience && (
                              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-snug">{cand.experience}</p>
                            )}

                            {canHire && (
                              <button
                                onClick={() => openHire(cand)}
                                className="mt-2 w-full flex items-center justify-center gap-1 bg-green-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <UserCheck size={13} /> Tuyển & tạo hồ sơ
                              </button>
                            )}
                            {cand.hiredEmpId && (
                              <p className="mt-2 flex items-center gap-1 text-[11px] text-green-600 font-medium">
                                <Check size={12} /> Đã tạo hồ sơ nhân viên
                              </p>
                            )}

                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50">
                              <button
                                onClick={() => moveCandidate(cand, -1)}
                                disabled={pipeIdx <= 0}
                                title="Lùi bước"
                                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ChevronDown size={14} className="rotate-90" />
                              </button>
                              <button
                                onClick={() => moveCandidate(cand, 1)}
                                disabled={pipeIdx === PIPELINE.length - 1}
                                title="Tiến bước"
                                className="p-1 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                              >
                                <ChevronDown size={14} className="-rotate-90" />
                              </button>
                              <div className="flex-1" />
                              {!isRejected ? (
                                <button onClick={() => updateCandStatus(cand.id, "rejected")} title="Từ chối" className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500">
                                  <X size={14} />
                                </button>
                              ) : (
                                <button onClick={() => updateCandStatus(cand.id, "new")} title="Khôi phục" className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                                  <Clock size={14} />
                                </button>
                              )}
                              <button onClick={() => setCandForm({ ...cand })} title="Sửa" className="p-1 rounded text-gray-400 hover:bg-blue-50 hover:text-blue-600">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => deleteCandidate(cand.id)} title="Xóa" className="p-1 rounded text-gray-400 hover:bg-red-50 hover:text-red-500">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {cands.length === 0 && (
                        <div className="text-center text-[11px] text-gray-300 py-4 border-2 border-dashed border-gray-200 rounded-xl">
                          Kéo thẻ vào đây
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Job form modal */}
      {jobForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[95vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{jobForm.id ? "Chỉnh sửa vị trí" : "Thêm vị trí tuyển dụng"}</h3>

            {/* AI viết giúp — chỉ gói Business */}
            {isBusiness && (
              <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles size={15} className="text-purple-600" />
                  <span className="text-sm font-semibold text-purple-700">AI viết giúp</span>
                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Chuyên gia 15 năm</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Gõ hoặc <b>bấm micro nói</b> thoải mái (ngập ngừng cũng không sao) — <b>nói xong bấm “Dừng”</b> là AI viết thành bài tuyển dụng chuyên nghiệp. Bạn xem lại rồi sửa trước khi lưu.</p>
                <AutoGrowTextarea
                  value={aiHint}
                  onChange={(e) => setAiHint(e.target.value)}
                  minHeight={46}
                  maxHeight={160}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aiWriteJD(); } }}
                  placeholder="VD: tuyển 2 phục vụ ca tối, 25k/giờ, gần Cầu Giấy — hoặc bấm micro nói"
                  className="w-full border border-purple-200 rounded-lg px-3.5 py-2.5 text-sm leading-relaxed focus:ring-2 focus:ring-purple-300 outline-none"
                />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <VoiceInput
                    manualStop
                    title="Nhấn để nói yêu cầu tuyển dụng"
                    onInterim={(t) => setAiHint(t)}
                    onFinal={(t) => { setAiHint(t); aiWriteJD(t); }}
                  />
                  <button
                    onClick={() => aiWriteJD()}
                    disabled={aiJdLoading || !aiHint.trim()}
                    className="flex items-center gap-1.5 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {aiJdLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {aiJdLoading ? "Đang viết..." : "Viết bài tuyển dụng"}
                  </button>
                </div>
                {aiJdLoading && <p className="text-xs text-purple-600 mt-1.5 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Chuyên gia AI đang soạn bài tuyển dụng...</p>}
                {aiJdError && <p className="text-xs text-red-600 mt-1.5">{aiJdError}</p>}
              </div>
            )}

            <div className="space-y-4">
              <ComboField
                label="Tên vị trí *"
                value={jobForm.title || ""}
                onChange={(v) => setJobForm({ ...jobForm, title: v })}
                options={localPositions}
                onAddOption={addPosition}
                customEntries={customPos}
                placeholder="Chọn chức vụ hoặc gõ tên vị trí"
                entityName="chức vụ"
              />
              {jobForm.title && (
                <p className="-mt-2 text-xs text-gray-400">Bạn có thể gõ tên vị trí riêng, không bắt buộc chọn trong danh sách.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ComboField
                  label="Phòng ban"
                  value={jobForm.department || ""}
                  onChange={(v) => setJobForm({ ...jobForm, department: v || null })}
                  options={localDepts}
                  onAddOption={addDept}
                  customEntries={customDepts}
                  placeholder="Chọn hoặc gõ tên mới"
                  entityName="phòng ban"
                />
                <ComboField
                  label="Địa điểm"
                  value={jobForm.location || ""}
                  onChange={(v) => setJobForm({ ...jobForm, location: v || null })}
                  options={localLocations}
                  onAddOption={addLocation}
                  placeholder="Chọn chi nhánh hoặc gõ địa điểm"
                  entityName="địa điểm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương tối thiểu (₫)</label>
                  <input type="number" min="0" value={jobForm.salaryMin || ""} onChange={e => setJobForm({ ...jobForm, salaryMin: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: 15000000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lương tối đa (₫)</label>
                  <input type="number" min="0" value={jobForm.salaryMax || ""} onChange={e => setJobForm({ ...jobForm, salaryMax: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: 25000000" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc</label>
                <AutoGrowTextarea minHeight={130} value={jobForm.description || ""} onChange={e => setJobForm({ ...jobForm, description: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Mô tả công việc — mỗi ý một dòng..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yêu cầu</label>
                <AutoGrowTextarea minHeight={110} value={jobForm.requirements || ""} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Kinh nghiệm, kỹ năng yêu cầu — mỗi ý một dòng..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quyền lợi</label>
                <AutoGrowTextarea minHeight={100} value={jobForm.benefits || ""} onChange={e => setJobForm({ ...jobForm, benefits: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3.5 py-3 text-sm leading-relaxed focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Bao ăn ca, thưởng chuyên cần, môi trường trẻ trung..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ca / Giờ làm</label>
                  <input type="text" value={jobForm.workTime || ""} onChange={e => setJobForm({ ...jobForm, workTime: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Ca tối 17h-22h" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng cần tuyển</label>
                  <input type="number" min="1" value={jobForm.quantity || ""} onChange={e => setJobForm({ ...jobForm, quantity: e.target.value ? Number(e.target.value) : null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: 2" />
                </div>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
                  <select value={jobForm.branchId || ""} onChange={e => setJobForm({ ...jobForm, branchId: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                    <option value="">Toàn công ty</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2.5 cursor-pointer bg-gray-50 rounded-lg px-3 py-2.5">
                <input type="checkbox" checked={jobForm.isPublic ?? true} onChange={e => setJobForm({ ...jobForm, isPublic: e.target.checked })} className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-sm text-gray-700">
                  Hiện trên trang tuyển dụng công khai
                  <span className="block text-xs text-gray-400">Tắt nếu chỉ muốn quản lý nội bộ, không cho ứng viên tự nộp.</span>
                </span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setJobForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Hủy</button>
              <button onClick={saveJob} disabled={savingJob || !jobForm.title} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                {savingJob ? "Đang lưu..." : jobForm.id ? "Cập nhật" : "Tạo vị trí"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate form modal */}
      {candForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{candForm.id ? "Chỉnh sửa ứng viên" : "Thêm ứng viên mới"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí ứng tuyển</label>
                <select value={candForm.jobId || ""} onChange={e => setCandForm({ ...candForm, jobId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">-- Chọn vị trí --</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                <input type="text" value={candForm.name || ""} onChange={e => setCandForm({ ...candForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Nguyễn Văn A" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={candForm.email || ""} onChange={e => setCandForm({ ...candForm, email: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input type="tel" value={candForm.phone || ""} onChange={e => setCandForm({ ...candForm, phone: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="0912345678" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nguồn</label>
                <select value={candForm.source || ""} onChange={e => setCandForm({ ...candForm, source: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                  <option value="">-- Chọn nguồn --</option>
                  <option value="website">Website</option>
                  <option value="referral">Giới thiệu nội bộ</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kinh nghiệm / Giới thiệu</label>
                <textarea rows={3} value={candForm.experience || ""} onChange={e => setCandForm({ ...candForm, experience: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="Kinh nghiệm ứng viên tự khai..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link CV</label>
                <input type="url" value={candForm.cvUrl || ""} onChange={e => setCandForm({ ...candForm, cvUrl: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Link CV (nếu có)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú nội bộ</label>
                <textarea rows={2} value={candForm.notes || ""} onChange={e => setCandForm({ ...candForm, notes: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="Ghi chú về ứng viên..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCandForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Hủy</button>
              <button onClick={saveCandidate} disabled={savingCand || !candForm.name || !candForm.jobId} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700 transition-colors disabled:opacity-60">
                {savingCand ? "Đang lưu..." : candForm.id ? "Cập nhật" : "Thêm ứng viên"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xem chi tiết ứng viên */}
      {viewCand && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setViewCand(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewCand.name}</h3>
                <p className="text-sm text-gray-500">{viewCand.job?.title}</p>
              </div>
              <button onClick={() => setViewCand(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CANDIDATE_STATUS_COLORS[viewCand.status]}`}>{CANDIDATE_STATUS_LABELS[viewCand.status]}</span>
                {viewCand.source && <span className="text-xs text-gray-500">Nguồn: {SOURCE_LABELS[viewCand.source] || viewCand.source}</span>}
                <span className="text-xs text-gray-400">· {new Date(viewCand.appliedAt).toLocaleDateString("vi-VN")}</span>
              </div>
              {viewCand.aiScore != null ? (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold w-7 h-7 rounded-lg flex items-center justify-center ${aiScoreStyle(viewCand.aiScore).cls}`}>{viewCand.aiScore}</span>
                    <span className="text-xs font-semibold text-gray-600">Đánh giá AI</span>
                    {isBusiness && (
                      <button onClick={() => rescore(viewCand)} disabled={scoringId === viewCand.id} className="ml-auto flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50">
                        {scoringId === viewCand.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Chấm lại
                      </button>
                    )}
                  </div>
                  {viewCand.aiSummary && <p className="text-xs text-gray-600 leading-relaxed">{viewCand.aiSummary}</p>}
                </div>
              ) : isBusiness ? (
                <button onClick={() => rescore(viewCand)} disabled={scoringId === viewCand.id} className="w-full flex items-center justify-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl py-2 text-sm font-medium hover:bg-purple-100 disabled:opacity-50">
                  {scoringId === viewCand.id ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {scoringId === viewCand.id ? "Đang chấm..." : "Chấm điểm AI ứng viên này"}
                </button>
              ) : null}
              {viewCand.phone && <p><span className="text-gray-400">Điện thoại: </span><a href={`tel:${viewCand.phone}`} className="text-blue-600">{viewCand.phone}</a></p>}
              {viewCand.email && <p><span className="text-gray-400">Email: </span>{viewCand.email}</p>}
              {viewCand.experience && (
                <div>
                  <p className="text-gray-400 text-xs mb-1">Kinh nghiệm / Giới thiệu:</p>
                  <p className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-xl p-3 text-sm">{viewCand.experience}</p>
                </div>
              )}
              {viewCand.cvUrl && <p><span className="text-gray-400">CV: </span><a href={viewCand.cvUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{viewCand.cvUrl}</a></p>}
              {viewCand.notes && <p><span className="text-gray-400">Ghi chú: </span>{viewCand.notes}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              {(viewCand.status === "offer" || viewCand.status === "hired") && !viewCand.hiredEmpId && (
                <button onClick={() => { const c = viewCand; setViewCand(null); openHire(c); }} className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white rounded-xl py-2.5 text-sm hover:bg-green-700">
                  <UserCheck size={15} /> Tuyển & tạo hồ sơ
                </button>
              )}
              <button onClick={() => { const c = viewCand; setViewCand(null); setCandForm({ ...c }); }} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Sửa thông tin</button>
            </div>
          </div>
        </div>
      )}

      {/* Tuyển-1-chạm: tạo hồ sơ nhân viên */}
      {hireCand && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            {!hireResult ? (
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Tuyển {hireCand.name}</h3>
                <p className="text-xs text-gray-500 mb-4">Tạo hồ sơ nhân viên chấm công từ ứng viên này. Tên/SĐT/email được chuyển tự động.</p>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh *</label>
                    <select value={hireForm.branchId} onChange={(e) => setHireForm({ ...hireForm, branchId: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none bg-white">
                      <option value="">-- Chọn chi nhánh --</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên *</label>
                      <input type="text" value={hireForm.code} onChange={(e) => setHireForm({ ...hireForm, code: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: NV015" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mã PIN (4 số)</label>
                      <input type="text" inputMode="numeric" maxLength={4} value={hireForm.pin} onChange={(e) => setHireForm({ ...hireForm, pin: e.target.value.replace(/\D/g, "") })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="Mặc định 0000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                      <input type="text" value={hireForm.department} onChange={(e) => setHireForm({ ...hireForm, department: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Vận hành" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                      <input type="text" value={hireForm.position} onChange={(e) => setHireForm({ ...hireForm, position: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Phục vụ" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản (₫)</label>
                      <input type="number" min="0" value={hireForm.baseSalary} onChange={(e) => setHireForm({ ...hireForm, baseSalary: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: 6000000" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm</label>
                      <input type="date" value={hireForm.joinDate} onChange={(e) => setHireForm({ ...hireForm, joinDate: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
                    </div>
                  </div>
                  {hireError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{hireError}</p>
                  )}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setHireCand(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
                  <button onClick={submitHire} disabled={hiring} className="flex-1 bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                    {hiring ? "Đang tạo..." : "Tạo hồ sơ nhân viên"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <Check size={26} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">Đã tạo hồ sơ nhân viên!</h3>
                  <p className="text-sm text-gray-500 mt-1">{hireResult.empName} · Mã {hireResult.empCode}</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
                  <p className="text-sm font-medium text-gray-800 mb-1">Gửi link đăng ký khuôn mặt cho nhân viên mới</p>
                  <p className="text-xs text-gray-500 mb-2">Nhân viên mở link trên điện thoại, quét mặt là xong — sẵn sàng chấm công. Link hiệu lực 20 phút.</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] bg-white border border-blue-100 px-2 py-1.5 rounded text-blue-700 break-all">{hireResult.faceUrl}</code>
                    <button onClick={copyFaceUrl} className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border ${copiedFace ? "bg-green-50 border-green-200 text-green-600" : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"}`}>
                      {copiedFace ? "Đã chép" : "Chép"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <a href={hireResult.faceUrl} target="_blank" rel="noopener noreferrer" className="flex-1 text-center border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Mở link đăng ký</a>
                  <button onClick={() => setHireCand(null)} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm hover:bg-blue-700">Xong</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal content Facebook/Zalo (AI soạn) */}
      {socialJob && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSocialJob(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles size={18} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">Bài đăng Facebook/Zalo</h3>
                  <p className="text-xs text-gray-500">AI soạn cho vị trí “{socialJob.title}”</p>
                </div>
              </div>
              <button onClick={() => setSocialJob(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
            </div>

            {socialLoading ? (
              <div className="py-10 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" /> AI đang soạn nội dung...
              </div>
            ) : socialError ? (
              <div className="py-6 text-center">
                <p className="text-sm text-red-600 mb-3">{socialError}</p>
                <button onClick={() => openSocial(socialJob)} className="text-sm text-purple-600 font-medium">Thử lại</button>
              </div>
            ) : (
              <>
                <textarea
                  value={socialContent}
                  onChange={(e) => setSocialContent(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-purple-300 outline-none resize-none whitespace-pre-wrap"
                />
                <p className="text-xs text-gray-400 mt-1.5">Bạn có thể sửa lại nội dung trước khi đăng.</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={copySocial} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium ${copiedSocial ? "bg-green-600 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}>
                    {copiedSocial ? <Check size={16} /> : <FileText size={16} />} {copiedSocial ? "Đã chép!" : "Chép nội dung"}
                  </button>
                  <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <ExternalLink size={15} /> Mở Facebook
                  </a>
                  <a href="https://chat.zalo.me/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50">
                    <ExternalLink size={15} /> Mở Zalo
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-3">Mẹo: bấm “Chép nội dung” rồi dán vào nhóm/trang Facebook hoặc Zalo của bạn. Link ứng tuyển đã có sẵn trong bài.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
