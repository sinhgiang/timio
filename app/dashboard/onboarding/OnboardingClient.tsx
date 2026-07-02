"use client";
import { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Plus, CheckSquare, Square, Trash2, Pencil, ChevronDown, ChevronUp, UserPlus, UserMinus, X } from "lucide-react";

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

export default function OnboardingClient({ employees }: { employees: Employee[] }) {
  const [activeTab, setActiveTab] = useState<"onboarding" | "offboarding">("onboarding");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Template form
  const [tplForm, setTplForm] = useState<{ id?: string; name: string; tasks: string[] } | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // Assign form
  const [assignForm, setAssignForm] = useState<{ templateId: string; employeeId: string; dueDate: string } | null>(null);
  const [savingAssign, setSavingAssign] = useState(false);

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
    await fetch("/api/checklists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: assignForm.employeeId, templateId: assignForm.templateId, dueDate: assignForm.dueDate || null }),
    });
    setSavingAssign(false);
    setAssignForm(null);
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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
          <ClipboardCheck size={20} className="text-teal-600" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Onboarding / Offboarding</h1>
          <p className="text-sm text-gray-500">Checklist bàn giao khi nhân viên mới vào / nghỉ việc</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(["onboarding", "offboarding"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${activeTab === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "onboarding" ? <UserPlus size={14} /> : <UserMinus size={14} />}
            {t === "onboarding" ? "Onboarding" : "Offboarding"}
          </button>
        ))}
      </div>

      {/* Templates section */}
      <div className="bg-white rounded-2xl border border-gray-200 mb-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mẫu checklist ({tabTemplates.length})</h2>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Giao checklist cho nhân viên</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                <select value={assignForm.employeeId} onChange={e => setAssignForm({ ...assignForm, employeeId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.status === "active" ? "Đang làm" : "Đã nghỉ"})</option>)}
                </select>
              </div>
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
