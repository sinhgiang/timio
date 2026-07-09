"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { ClipboardCheck, Plus, CheckSquare, Square, Trash2, Pencil, ChevronDown, ChevronUp, UserPlus, UserMinus, X, ScanFace, ExternalLink, Copy, Check, Download, HelpCircle } from "lucide-react";

type Employee = { id: string; name: string; code: string; department: string | null; status: string };
type ChecklistTask = { title: string; done: boolean; doneAt: string | null };
type Template = { id: string; type: string; name: string; tasks: string };
type Checklist = {
  id: string;
  employeeId: string;
  type: string;
  tasks: string;
  status: string;
  dueDate: string | null;
  confirmedAt: string | null;
  createdAt: string;
  template: Template;
  employee: Employee;
};

const DEFAULT_ONBOARDING = [
  "Nộp bản sao CCCD/CMND",
  "Nộp bản sao sổ hộ khẩu",
  "Cung cấp thông tin tài khoản ngân hàng",
  "Ký hợp đồng lao động",
  "Nhận tài sản bàn giao (laptop, thẻ từ...)",
  "Hoàn tất đăng ký BHXH/BHYT",
  "Được hướng dẫn nội quy công ty",
  "Tham gia buổi định hướng nhân viên mới",
];

const DEFAULT_OFFBOARDING = [
  "Bàn giao công việc cho người thay thế",
  "Trả tài sản công ty (laptop, thẻ từ, chìa khóa...)",
  "Xóa tài khoản hệ thống nội bộ",
  "Thanh toán lương tháng cuối và các khoản phụ lợi",
  "Ký biên bản bàn giao",
  "Phỏng vấn thôi việc",
  "Hoàn tất thủ tục BHXH",
];

export default function OnboardingClient({ employees, companySlug }: { employees: Employee[]; companySlug: string }) {
  const [activeTab, setActiveTab] = useState<"onboarding" | "offboarding">("onboarding");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showHelp, setShowHelp] = useState(false);

  // Kiosk quét mặt nhận bàn giao
  const [kioskUrl, setKioskUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && companySlug) {
      setKioskUrl(`${window.location.origin}/checklist/${companySlug}`);
    }
  }, [companySlug]);

  useEffect(() => {
    if (!kioskUrl || !qrCanvasRef.current) return;
    import("qrcode").then(({ toCanvas }) => {
      if (qrCanvasRef.current) {
        toCanvas(qrCanvasRef.current, kioskUrl, { width: 150, margin: 1 }).catch(() => {});
      }
    });
  }, [kioskUrl]);

  const copyKioskUrl = async () => {
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const downloadQr = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `qr-ban-giao-${companySlug}.png`;
    link.href = qrCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  // Template form
  const [tplForm, setTplForm] = useState<{ id?: string; name: string; tasks: string[] } | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // Assign form
  const [assignForm, setAssignForm] = useState<{ templateId: string; employeeId: string; dueDate: string } | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);
  // Bàn giao khi nghỉ việc (offboarding): người kế nhiệm + tài sản
  const [successorId, setSuccessorId] = useState("");
  const [empAssets, setEmpAssets] = useState<{ id: string; code: string; name: string; include: boolean; action: "transfer" | "recall" }[]>([]);

  useEffect(() => {
    if (!assignForm || activeTab !== "offboarding") { setEmpAssets([]); return; }
    fetch(`/api/assets?employeeId=${assignForm.employeeId}`).then((r) => (r.ok ? r.json() : [])).then((rows) => {
      const arr = Array.isArray(rows) ? rows : [];
      setEmpAssets(arr.filter((a: { returnedAt: string | null }) => !a.returnedAt).map((a: { id: string; code: string; name: string }) => ({ id: a.id, code: a.code, name: a.name, include: true, action: "transfer" as const })));
    }).catch(() => setEmpAssets([]));
  }, [assignForm, activeTab]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [tplRes, clRes] = await Promise.all([
      fetch(`/api/checklists?templates=1&type=${activeTab}`),
      fetch(`/api/checklists?type=${activeTab}`),
    ]);
    const tpls = await tplRes.json();
    const cls = await clRes.json();
    setTemplates(Array.isArray(tpls) ? tpls : []);
    setChecklists(Array.isArray(cls) ? cls : []);
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function saveTpl() {
    if (!tplForm?.name || !tplForm.tasks.length) return;
    setSavingTpl(true);
    const method = tplForm.id ? "PATCH" : "POST";
    const url = tplForm.id ? `/api/checklists/${tplForm.id}` : "/api/checklists";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isTemplate: true, type: activeTab, name: tplForm.name, tasks: tplForm.tasks }),
    });
    setSavingTpl(false);
    setTplForm(null);
    fetchAll();
  }

  async function assign() {
    if (!assignForm?.templateId || !assignForm.employeeId) return;
    setSavingAssign(true);
    const body: { employeeId: string; templateId: string; dueDate: string | null; handoverToEmployeeId?: string; assets?: { assetId: string; action: string }[] } = {
      employeeId: assignForm.employeeId, templateId: assignForm.templateId, dueDate: assignForm.dueDate || null,
    };
    if (activeTab === "offboarding" && successorId) {
      body.handoverToEmployeeId = successorId;
      body.assets = empAssets.filter((a) => a.include).map((a) => ({ assetId: a.id, action: a.action }));
    }
    await fetch("/api/checklists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSavingAssign(false);
    setAssignForm(null); setSuccessorId(""); setEmpAssets([]);
    fetchAll();
  }

  async function toggleTask(cl: Checklist, idx: number) {
    let tasks: ChecklistTask[];
    try { tasks = JSON.parse(cl.tasks); } catch { return; }
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done, doneAt: !tasks[idx].done ? new Date().toISOString() : null };
    await fetch(`/api/checklists/${cl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks }),
    });
    fetchAll();
  }

  async function delChecklist(id: string) {
    if (!confirm("Xóa checklist này?")) return;
    await fetch(`/api/checklists/${id}?isTemplate=false`, { method: "DELETE" });
    fetchAll();
  }

  async function delTemplate(id: string) {
    if (!confirm("Xóa mẫu này? Tất cả checklist dùng mẫu này cũng bị xóa.")) return;
    await fetch(`/api/checklists/${id}?isTemplate=true`, { method: "DELETE" });
    fetchAll();
  }

  const tabChecklists = checklists.filter(c => c.type === activeTab);
  const tabTemplates = templates.filter(t => t.type === activeTab);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardCheck size={20} className="text-teal-600" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Bàn giao nhân viên</h1>
            <p className="text-sm text-gray-500">Danh sách việc cần làm khi nhân viên <strong>mới vào</strong> hoặc <strong>nghỉ việc</strong></p>
          </div>
        </div>
        <button onClick={() => setShowHelp(v => !v)}
          className="flex items-center gap-1.5 text-sm text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors shrink-0">
          <HelpCircle size={15} /> Hướng dẫn
        </button>
      </div>

      {/* Hướng dẫn 3 bước */}
      {showHelp && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 mb-6">
          <p className="text-sm font-semibold text-teal-800 mb-3">Trang này hoạt động thế nào?</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { n: "1", t: "Tạo mẫu", d: "Liệt kê các việc/tài sản cần bàn giao (VD: nhận laptop, ký hợp đồng...). Làm 1 lần, dùng lại nhiều lần." },
              { n: "2", t: "Giao cho nhân viên", d: "Chọn mẫu → gán cho một nhân viên cụ thể. Nhân viên đó sẽ có một danh sách cần xác nhận." },
              { n: "3", t: "Nhân viên quét mặt xác nhận", d: "Nhân viên ra máy quét mặt (hoặc mở link trên điện thoại), tự tích từng món đã nhận, rồi bấm Xác nhận. Xong sẽ hiện “Đã xác nhận”." },
            ].map(s => (
              <div key={s.n} className="bg-white rounded-xl p-3.5 border border-teal-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{s.n}</span>
                  <p className="font-semibold text-gray-800 text-sm">{s.t}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Màn hình quét mặt nhận bàn giao */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 p-5 flex flex-col sm:flex-row items-center gap-5">
        <div className="bg-gray-50 rounded-xl p-2 border border-gray-100 shrink-0">
          <canvas ref={qrCanvasRef} className="block" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
            <ScanFace size={18} className="text-teal-600" />
            <h2 className="font-semibold text-gray-800">Màn hình quét mặt nhận bàn giao</h2>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Đặt màn hình này ở văn phòng, hoặc gửi link cho nhân viên. Họ quét mặt → tự tích các món đã nhận → xác nhận.
          </p>
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
            <a href={kioskUrl || "#"} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700 transition-colors">
              <ExternalLink size={14} /> Mở màn hình
            </a>
            <button onClick={copyKioskUrl}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              {copied ? <><Check size={14} className="text-green-600" /> Đã chép</> : <><Copy size={14} /> Chép link</>}
            </button>
            <button onClick={downloadQr}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              <Download size={14} /> Tải mã QR
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(["onboarding", "offboarding"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "onboarding" ? <UserPlus size={14} /> : <UserMinus size={14} />}
            {t === "onboarding" ? "Nhân viên mới vào" : "Nhân viên nghỉ việc"}
          </button>
        ))}
      </div>

      {/* Templates section */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">Mẫu danh sách bàn giao ({tabTemplates.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">Danh sách các việc/tài sản cần bàn giao. Bấm "Giao cho NV" để gán cho một nhân viên.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTplForm({
                name: `Mẫu ${activeTab === "onboarding" ? "nhân viên mới" : "thôi việc"}`,
                tasks: activeTab === "onboarding" ? [...DEFAULT_ONBOARDING] : [...DEFAULT_OFFBOARDING],
              })}
              className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-teal-700 transition-colors"
            >
              <Plus size={14} /> Tạo mẫu
            </button>
          </div>
        </div>
        {tabTemplates.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Chưa có mẫu. Tạo mẫu mặc định để bắt đầu.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tabTemplates.map(tpl => {
              let tasks: string[] = [];
              try { tasks = JSON.parse(tpl.tasks); } catch { tasks = []; }
              return (
                <div key={tpl.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-700">{tpl.name}</p>
                    <p className="text-xs text-gray-400">{tasks.length} mục</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAssignForm({ templateId: tpl.id, employeeId: employees[0]?.id || "", dueDate: "" })}
                      className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg hover:bg-teal-100 transition-colors"
                    >
                      <UserPlus size={12} /> Giao cho NV
                    </button>
                    <button onClick={() => setTplForm({ id: tpl.id, name: tpl.name, tasks })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => delTemplate(tpl.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Employee checklists */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Nhân viên đang thực hiện ({tabChecklists.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : tabChecklists.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chưa có nhân viên nào đang thực hiện checklist</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tabChecklists.map(cl => {
              let tasks: ChecklistTask[] = [];
              try { tasks = JSON.parse(cl.tasks); } catch { tasks = []; }
              const doneCount = tasks.filter(t => t.done).length;
              const isExpanded = expanded.has(cl.id);
              const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

              return (
                <div key={cl.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{cl.employee?.name}</p>
                        <span className="text-xs text-gray-400">{cl.template?.name}</span>
                        {cl.status === "done" && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Hoàn thành</span>}
                        {cl.confirmedAt && (
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ScanFace size={11} /> NV đã quét mặt xác nhận · {new Date(cl.confirmedAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{doneCount}/{tasks.length}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => delChecklist(cl.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(cl.id) ? s.delete(cl.id) : s.add(cl.id); return s; })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 space-y-1.5 pl-2">
                      {tasks.map((task, idx) => (
                        <button key={idx} onClick={() => toggleTask(cl, idx)} className="flex items-center gap-2.5 text-sm w-full text-left group">
                          {task.done ? <CheckSquare size={16} className="text-teal-500 shrink-0" /> : <Square size={16} className="text-gray-300 shrink-0 group-hover:text-gray-400" />}
                          <span className={task.done ? "line-through text-gray-400" : "text-gray-700"}>{task.title}</span>
                          {task.done && task.doneAt && <span className="text-xs text-gray-400 ml-auto">{new Date(task.doneAt).toLocaleDateString("vi-VN")}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template form modal */}
      {tplForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{tplForm.id ? "Chỉnh sửa mẫu" : "Tạo mẫu checklist"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẫu</label>
                <input type="text" value={tplForm.name} onChange={e => setTplForm({ ...tplForm, name: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Các mục ({tplForm.tasks.length})</label>
                  <button onClick={() => setTplForm({ ...tplForm, tasks: [...tplForm.tasks, ""] })} className="text-xs text-teal-600 hover:text-teal-700">+ Thêm mục</button>
                </div>
                <div className="space-y-2">
                  {tplForm.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}.</span>
                      <input
                        type="text"
                        value={task}
                        onChange={e => {
                          const tasks = [...tplForm.tasks];
                          tasks[i] = e.target.value;
                          setTplForm({ ...tplForm, tasks });
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none"
                      />
                      <button onClick={() => setTplForm({ ...tplForm, tasks: tplForm.tasks.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setTplForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={saveTpl} disabled={savingTpl} className="flex-1 bg-teal-600 text-white rounded-xl py-2.5 text-sm hover:bg-teal-700 disabled:opacity-60">
                {savingTpl ? "Đang lưu..." : "Lưu mẫu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{activeTab === "offboarding" ? "Bàn giao khi nghỉ việc" : "Giao checklist cho nhân viên"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{activeTab === "offboarding" ? "Người nghỉ việc" : "Nhân viên"}</label>
                <select value={assignForm.employeeId} onChange={e => setAssignForm({ ...assignForm, employeeId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.status === "active" ? "Đang làm" : "Đã nghỉ"})</option>)}
                </select>
              </div>

              {activeTab === "offboarding" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Người kế nhiệm (nhận bàn giao) <span className="text-gray-400 font-normal">— sẽ quét mặt xác nhận</span></label>
                    <select value={successorId} onChange={e => setSuccessorId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none">
                      <option value="">— Không có (chỉ tự xác nhận) —</option>
                      {employees.filter(e => e.status === "active" && e.id !== assignForm.employeeId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>

                  {successorId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tài sản đang giữ — chọn cách xử lý</label>
                      {empAssets.length === 0 ? (
                        <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">Nhân viên này không giữ tài sản nào.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {empAssets.map((a, i) => (
                            <div key={a.id} className="flex items-center gap-2 border border-gray-100 rounded-lg px-2.5 py-2">
                              <input type="checkbox" checked={a.include} onChange={e => setEmpAssets(prev => prev.map((x, j) => j === i ? { ...x, include: e.target.checked } : x))} className="accent-teal-600" />
                              <span className="flex-1 text-sm text-gray-700 truncate">{a.name} <span className="text-xs text-gray-400 font-mono">{a.code}</span></span>
                              <select value={a.action} disabled={!a.include} onChange={e => setEmpAssets(prev => prev.map((x, j) => j === i ? { ...x, action: e.target.value as "transfer" | "recall" } : x))} className="text-xs border border-gray-200 rounded-md px-1.5 py-1 disabled:opacity-40">
                                <option value="transfer">Chuyển cho người kế nhiệm</option>
                                <option value="recall">Thu hồi về công ty</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạn hoàn thành</label>
                <input type="date" value={assignForm.dueDate} onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAssignForm(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={assign} disabled={savingAssign} className="flex-1 bg-teal-600 text-white rounded-xl py-2.5 text-sm hover:bg-teal-700 disabled:opacity-60">
                {savingAssign ? "Đang giao..." : "Giao checklist"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
