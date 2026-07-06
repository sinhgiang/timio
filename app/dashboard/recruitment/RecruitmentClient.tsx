"use client";
import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Pencil, Trash2, Briefcase, UserPlus, X, Check, Clock, Star, ExternalLink, Link2, HelpCircle, ChevronDown, ChevronUp, Share2, Inbox, FileText, UserCheck } from "lucide-react";

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
  appliedAt: string;
  job: { id: string; title: string; department: string | null };
};

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

const CANDIDATE_STATUS_ICONS: Record<string, React.ReactNode> = {
  new: <Clock size={12} />,
  reviewing: <Star size={12} />,
  interview: <Users size={12} />,
  offer: <Check size={12} />,
  hired: <Check size={12} />,
  rejected: <X size={12} />,
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Giới thiệu",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  other: "Khác",
};

export default function RecruitmentClient({ companySlug, branches }: { companySlug: string; branches: Branch[] }) {
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
    await fetch(`/api/recruitment/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCandidates(selectedJob?.id);
    fetchJobs();
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

      {/* Candidates tab */}
      {activeTab === "candidates" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-700">
                {selectedJob ? `Ứng viên — ${selectedJob.title}` : "Tất cả ứng viên"}
              </h2>
              {selectedJob && (
                <button onClick={() => { setSelectedJob(null); fetchCandidates(); }} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Xem tất cả
                </button>
              )}
            </div>
            <button
              onClick={() => setCandForm({ jobId: selectedJob?.id || jobs[0]?.id || "", name: "", email: null, phone: null, source: null, notes: null })}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={14} /> Thêm ứng viên
            </button>
          </div>

          {displayedCandidates.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={32} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-gray-500 text-sm">Chưa có ứng viên nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Ứng viên</th>
                    <th className="text-left px-4 py-3">Vị trí</th>
                    <th className="text-left px-4 py-3">Nguồn</th>
                    <th className="text-left px-4 py-3">Ngày nộp</th>
                    <th className="text-left px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedCandidates.map(cand => (
                    <tr key={cand.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{cand.name}</p>
                        <p className="text-xs text-gray-400">{cand.email || cand.phone || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{cand.job?.title || "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{cand.source ? SOURCE_LABELS[cand.source] || cand.source : "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(cand.appliedAt).toLocaleDateString("vi-VN")}</td>
                      <td className="px-4 py-3">
                        <select
                          value={cand.status}
                          onChange={e => updateCandStatus(cand.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 font-medium outline-none cursor-pointer ${CANDIDATE_STATUS_COLORS[cand.status]}`}
                        >
                          {Object.entries(CANDIDATE_STATUS_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <button onClick={() => setCandForm({ ...cand })} className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteCandidate(cand.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Job form modal */}
      {jobForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{jobForm.id ? "Chỉnh sửa vị trí" : "Thêm vị trí tuyển dụng"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên vị trí *</label>
                <input type="text" value={jobForm.title || ""} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Senior Developer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                  <input type="text" value={jobForm.department || ""} onChange={e => setJobForm({ ...jobForm, department: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Kỹ thuật" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                  <input type="text" value={jobForm.location || ""} onChange={e => setJobForm({ ...jobForm, location: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none" placeholder="VD: Hà Nội" />
                </div>
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
                <textarea rows={3} value={jobForm.description || ""} onChange={e => setJobForm({ ...jobForm, description: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="Mô tả ngắn về công việc..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yêu cầu</label>
                <textarea rows={3} value={jobForm.requirements || ""} onChange={e => setJobForm({ ...jobForm, requirements: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="Kinh nghiệm, kỹ năng yêu cầu..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quyền lợi</label>
                <textarea rows={2} value={jobForm.benefits || ""} onChange={e => setJobForm({ ...jobForm, benefits: e.target.value || null })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none resize-none" placeholder="VD: Bao ăn ca, thưởng chuyên cần, môi trường trẻ trung..." />
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
    </div>
  );
}
