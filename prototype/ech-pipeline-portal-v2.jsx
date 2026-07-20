import { useState, useMemo } from "react";
import {
  LayoutGrid, ClipboardList, Users, MessageSquare, FileText, Flag,
  Clock, AlertTriangle, CheckCircle2, X, Plus, LogOut, ChevronDown,
  Zap, ShieldCheck, Circle, CheckSquare, Square, ArrowRight, ArrowLeft,
  Home, ChevronRight,
} from "lucide-react";

// ---------- Brand tokens (from client brief) ----------
const BRAND = {
  darkGreen: "#036638",
  green: "#65BD6C",
  bgLight: "#EBF7EC",
  cream: "#FBE7B2",
  sand: "#EADEC0",
};

// ---------- Theme extracted from Phoenix HQ reference screenshot (now the active theme) ----------
const PHX = {
  sidebarBg: "#16181C",
  accent: "#E8792E",
  accentDark: "#C0392B",
  contentBg: "#F4F5F7",
  amber: "#F2A93B",
  red: "#E15C4E",
  blue: "#3B82C4",
  green: "#3FA66E",
  tint: "#FBEFE5",
};

// ---------- Domain constants ----------
const STAGES = [
  { key: "onboarding", label: "Onboarding", hint: "Scheduled on calendar" },
  { key: "visit_complete", label: "Visit complete", hint: "Encounter finished" },
  { key: "post_visit_docs", label: "Post-visit docs", hint: "Letter + labs sent" },
  { key: "chart_signed", label: "Chart signed", hint: "Optimantra finalized" },
  { key: "sent_to_billing", label: "Sent to billing", hint: "Claim submitted" },
  { key: "payment_posted", label: "Payment posted", hint: "Payment received" },
  { key: "reconciled", label: "Reconciled", hint: "Closed out" },
];
const STAGE_ORDER = STAGES.map((s) => s.key);

const CHECKLISTS = {
  post_visit_docs: [
    { id: "letter", label: "Patient instruction letter sent" },
    { id: "labs", label: "Labs sent" },
  ],
  chart_signed: [
    { id: "signed", label: "Optimantra note signed" },
    { id: "clawback", label: "Clawback check passed (CPT / ICD-10)" },
  ],
};

const USERS = [
  { id: "donna", name: "Donna Rhodes", role: "admin", initials: "DR", shift: null },
  { id: "jude", name: "Jude", role: "va", initials: "J", shift: "morning" },
  { id: "amanda", name: "Amanda", role: "va", initials: "A", shift: "evening" },
];

const STALE_MS = 48 * 60 * 60 * 1000;
const now = Date.now();
const hoursAgo = (h) => now - h * 60 * 60 * 1000;

// ---------- Seed data ----------
const seedPatients = () => [
  {
    id: "p1", name: "Maria Gonzalez", stage: "onboarding",
    assignedTo: "jude", notes: "Intake confirmed via ZocDoc.",
    checklistState: {}, isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(2), source: "webhook", platform: "zocdoc",
  },
  {
    id: "p2", name: "Ken Ostrowski", stage: "visit_complete",
    assignedTo: "amanda", notes: "",
    checklistState: {}, isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(60), source: "manual",
  },
  {
    id: "p3", name: "Priya Patel", stage: "post_visit_docs",
    assignedTo: "jude", notes: "Waiting on lab results from outside vendor.",
    checklistState: { post_visit_docs: { letter: true, labs: false } },
    isFlagged: true, flagReason: "Lab vendor hasn't responded in 3 days.",
    updatedAt: hoursAgo(5), source: "manual",
  },
  {
    id: "p4", name: "Devon Marsh", stage: "chart_signed",
    assignedTo: "amanda", notes: "",
    checklistState: { chart_signed: { signed: true, clawback: false } },
    isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(10), source: "manual",
  },
  {
    id: "p5", name: "Sarah Kim", stage: "sent_to_billing",
    assignedTo: "jude", notes: "Claim submitted to Headway.",
    checklistState: {}, isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(20), source: "manual",
  },
  {
    id: "p6", name: "Tom Reyes", stage: "payment_posted",
    assignedTo: "amanda", notes: "",
    checklistState: {}, isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(30), source: "manual",
  },
  {
    id: "p7", name: "Elena Novak", stage: "reconciled",
    assignedTo: "jude", notes: "Closed out, matches billed amount.",
    checklistState: {}, isFlagged: false, flagReason: "",
    updatedAt: hoursAgo(96), source: "manual",
  },
];

const seedLog = () => [
  { id: "l1", patientId: "p3", author: "Jude", type: "manual",
    message: "Flagged for Donna: Lab vendor hasn't responded in 3 days.",
    ts: hoursAgo(5) },
  { id: "l2", patientId: "p2", author: "system", type: "auto",
    message: "Moved from onboarding to visit_complete", ts: hoursAgo(60) },
  { id: "l3", patientId: "p1", author: "system", type: "auto",
    message: "New patient auto-created from booking email (ZocDoc)", ts: hoursAgo(2) },
];

// ---------- Helpers ----------
function relTime(ts) {
  const diffMs = now - ts;
  const h = Math.floor(diffMs / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function isStale(p) {
  return p.stage !== "reconciled" && now - p.updatedAt > STALE_MS;
}
function checklistFor(stageKey) {
  return CHECKLISTS[stageKey] || [];
}
function checklistComplete(p, stageKey) {
  const items = checklistFor(stageKey);
  if (items.length === 0) return true;
  const state = p.checklistState[stageKey] || {};
  return items.every((i) => state[i.id]);
}
function userById(id) {
  return USERS.find((u) => u.id === id);
}

// Confirmed client rule: appointment hour < 12:00 PM -> Jude (morning), else -> Amanda (evening).
// Default only — a VA/admin can always manually reassign afterward. Cutoff hour to be confirmed with Donna.
function autoAssignByTime(appointmentDateTime) {
  if (!appointmentDateTime) return null;
  const parsed = new Date(appointmentDateTime);
  if (isNaN(parsed.getTime())) return null;
  return parsed.getHours() < 12 ? "jude" : "amanda";
}

export default function EchPipelinePortal() {
  const [currentUser, setCurrentUser] = useState(null);
  const [patients, setPatients] = useState(seedPatients);
  const [log, setLog] = useState(seedLog);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [showIntake, setShowIntake] = useState(false);

  const staleCount = useMemo(() => patients.filter(isStale).length, [patients]);
  const flaggedCount = useMemo(
    () => patients.filter((p) => p.isFlagged).length,
    [patients]
  );

  function addLog(patientId, author, message, type = "manual") {
    setLog((l) => [{ id: "l" + Date.now(), patientId, author, message, type, ts: Date.now() }, ...l]);
  }

  function moveStage(patientId, targetKey) {
    setPatients((ps) =>
      ps.map((p) => {
        if (p.id !== patientId) return p;
        const curIdx = STAGE_ORDER.indexOf(p.stage);
        const tgtIdx = STAGE_ORDER.indexOf(targetKey);
        if (tgtIdx > curIdx && !checklistComplete(p, p.stage)) return p; // gated
        addLog(patientId, currentUser.name,
          `Moved from ${STAGES.find(s=>s.key===p.stage).label} to ${STAGES.find(s=>s.key===targetKey).label}`,
          "auto");
        return { ...p, stage: targetKey, updatedAt: Date.now() };
      })
    );
  }

  function toggleChecklist(patientId, stageKey, itemId) {
    setPatients((ps) =>
      ps.map((p) => {
        if (p.id !== patientId) return p;
        const stageState = { ...(p.checklistState[stageKey] || {}) };
        stageState[itemId] = !stageState[itemId];
        return {
          ...p,
          updatedAt: Date.now(),
          checklistState: { ...p.checklistState, [stageKey]: stageState },
        };
      })
    );
  }

  function assign(patientId, userId) {
    setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, assignedTo: userId, updatedAt: Date.now() } : p)));
  }

  function addNote(patientId, text) {
    if (!text.trim()) return;
    setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, notes: text, updatedAt: Date.now() } : p)));
    addLog(patientId, currentUser.name, `Note updated: "${text.slice(0, 60)}${text.length > 60 ? "…" : ""}"`);
  }

  function flag(patientId, reason) {
    if (!reason.trim()) return;
    setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, isFlagged: true, flagReason: reason, updatedAt: Date.now() } : p)));
    addLog(patientId, currentUser.name, `Flagged for Donna: ${reason}`);
  }

  function clearFlag(patientId) {
    setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, isFlagged: false, flagReason: "" } : p)));
    addLog(patientId, currentUser.name, "Flag cleared");
  }

  function simulateIntake(name, dateTime, platform) {
    const id = "p" + Date.now();
    const assignedTo = autoAssignByTime(dateTime);
    setPatients((ps) => [...ps, {
      id, name, stage: "onboarding", assignedTo, notes: "",
      checklistState: {}, isFlagged: false, flagReason: "",
      updatedAt: Date.now(), source: "webhook", platform, appointment: dateTime,
      assignedBy: assignedTo ? "auto" : null,
    }]);
    const assignee = assignedTo ? userById(assignedTo).name : null;
    addLog(id, "system",
      assignee
        ? `New patient auto-created from booking email (${platform}), auto-assigned to ${assignee} by appointment time`
        : `New patient auto-created from booking email (${platform}), left unassigned — no valid appointment time`,
      "auto");
    setShowIntake(false);
  }

  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const selected = patients.find((p) => p.id === selectedId) || null;
  const isAdmin = currentUser.role === "admin";

  return (
    <div className="w-full min-h-screen flex" style={{ background: PHX.contentBg }}>
      <Sidebar
        currentUser={currentUser}
        view={view}
        setView={setView}
        isAdmin={isAdmin}
        onLogout={() => setCurrentUser(null)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar currentUser={currentUser} staleCount={staleCount} flaggedCount={flaggedCount}
          onSimulate={() => setShowIntake(true)} />
        <div className="flex-1 overflow-auto p-6">
          {view === "dashboard" && (
            <DashboardHome currentUser={currentUser} patients={patients} isAdmin={isAdmin}
              setView={setView} onSimulate={() => setShowIntake(true)} />
          )}
          {view === "board" && (
            <Board patients={patients} onSelect={setSelectedId} />
          )}
          {view === "log" && <LogView log={log} patients={patients} />}
          {view === "sop" && <SopView />}
          {view === "admin" && isAdmin && (
            <AdminView patients={patients} onClearFlag={clearFlag} onSelect={setSelectedId} />
          )}
        </div>
      </div>
      {selected && (
        <PatientModal
          patient={selected}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onClose={() => setSelectedId(null)}
          onMove={moveStage}
          onToggleChecklist={toggleChecklist}
          onAssign={assign}
          onAddNote={addNote}
          onFlag={flag}
          onClearFlag={clearFlag}
        />
      )}
      {showIntake && (
        <IntakeSimModal onClose={() => setShowIntake(false)} onSubmit={simulateIntake} />
      )}
    </div>
  );
}

// ---------- Login ----------
function LoginScreen({ onLogin }) {
  return (
    <div className="w-full min-h-screen flex items-center justify-center" style={{ background: PHX.contentBg }}>
      <div className="bg-white rounded-lg shadow-sm p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: PHX.accent }}>
            <ShieldCheck size={18} color="#fff" />
          </div>
          <div>
            <div className="font-medium text-sm" style={{ color: PHX.sidebarBg }}>Elevated Core Health</div>
            <div className="text-xs text-gray-500">Patient Pipeline Portal</div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4 mb-4">Prototype — select a user to sign in</p>
        <div className="flex flex-col gap-2">
          {USERS.map((u) => (
            <button key={u.id} onClick={() => onLogin(u)}
              className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-3 hover:border-gray-400 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                  style={{ background: PHX.accent }}>{u.initials}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  <div className="text-xs text-gray-500">
                    {u.role === "admin" ? "Admin — owner" : `VA / contractor — ${u.shift} shift`}
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ currentUser, view, setView, isAdmin, onLogout }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "board", label: "Board", icon: LayoutGrid },
    { key: "log", label: "Handoff log", icon: MessageSquare },
    { key: "sop", label: "SOP reference", icon: FileText },
  ];
  if (isAdmin) items.push({ key: "admin", label: "Admin dashboard", icon: ShieldCheck });

  return (
    <div className="w-56 shrink-0 flex flex-col text-white" style={{ background: PHX.sidebarBg }}>
      <div className="p-4 border-b border-white/10">
        <div className="text-sm font-medium">Elevated Core Health</div>
        <div className="text-[11px] opacity-70">Pipeline Portal</div>
      </div>
      <div className="flex-1 p-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = view === it.key;
          return (
            <button key={it.key} onClick={() => setView(it.key)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 font-medium transition-colors"
              style={{ background: active ? PHX.accent : "transparent", color: "#fff" }}>
              <Icon size={16} />
              {it.label}
            </button>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
            style={{ background: PHX.accent }}>{currentUser.initials}</div>
          <div className="text-xs">
            <div>{currentUser.name}</div>
            <div className="opacity-60">{currentUser.role === "admin" ? "Admin" : "VA"}</div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 text-xs opacity-80 hover:opacity-100 px-3 py-1.5">
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );
}

// ---------- Top bar / status bar ----------
function TopBar({ currentUser, staleCount, flaggedCount, onSimulate }) {
  const allClear = staleCount === 0 && flaggedCount === 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <div className="text-lg font-medium text-gray-900">{greeting}, {currentUser.name.split(" ")[0]}.</div>
        <div className="flex items-center gap-2 mt-1">
          {allClear ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: PHX.tint, color: PHX.accentDark }}>
              <CheckCircle2 size={13} /> All caught up
            </span>
          ) : (
            <>
              {staleCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                  <Clock size={13} /> {staleCount} stale
                </span>
              )}
              {flaggedCount > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                  <Flag size={13} /> {flaggedCount} flagged
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <button onClick={onSimulate}
        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-gray-200 text-gray-600 hover:border-gray-400">
        <Zap size={14} /> Simulate Make.com intake
      </button>
    </div>
  );
}

// ---------- Dashboard home (layout pattern from reference screenshot, ECH's own brand colors) ----------
function DashboardHome({ currentUser, patients, isAdmin, setView, onSimulate }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const active = patients.filter((p) => p.stage !== "reconciled").length;
  const flagged = patients.filter((p) => p.isFlagged).length;
  const stale = patients.filter(isStale).length;
  const reconciledToday = patients.filter((p) => p.stage === "reconciled" && now - p.updatedAt < 24 * 3600000).length;

  const stats = [
    { label: "Active patients", value: active, accent: PHX.amber, icon: ClipboardList },
    { label: "Flagged", value: flagged, accent: "#E15C4E", icon: Flag },
    { label: "Stale 48h+", value: stale, accent: "#D98F2B", icon: Clock },
    { label: "Reconciled today", value: reconciledToday, accent: PHX.green, icon: CheckCircle2 },
  ];

  const modules = [
    { key: "board", title: "Board", subtitle: "7-stage patient pipeline", icon: LayoutGrid, tint: "#E8F1FC", iconColor: PHX.blue },
    { key: "log", title: "Handoff log", subtitle: "Shift history & notes", icon: MessageSquare, tint: "#E8F1FC", iconColor: "#3B82C4" },
    { key: "sop", title: "SOP reference", subtitle: "Stage-by-stage guide", icon: FileText, tint: "#FBF0DD", iconColor: "#B07A1B" },
    ...(isAdmin ? [{ key: "admin", title: "Admin dashboard", subtitle: "Flags, load, analytics", icon: ShieldCheck, tint: "#FBEAE8", iconColor: "#D95C4E" }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg p-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${PHX.sidebarBg}, #2b2e35)` }}>
        <div className="relative z-10">
          <div className="text-2xl font-medium">{greeting}, <span style={{ color: PHX.amber }}>{currentUser.name.split(" ")[0]}.</span></div>
          <div className="flex items-center gap-1.5 text-sm opacity-80 mt-1">
            <Clock size={14} /> {dateStr}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={onSimulate}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md"
              style={{ background: PHX.accent, color: "#fff" }}>
              <Plus size={15} /> Simulate new booking
            </button>
            <button onClick={() => setView("board")}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-md border border-white/30">
              View board <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-lg p-4 border-t-4" style={{ borderColor: s.accent }}>
              <div className="flex items-start justify-between">
                <div className="text-3xl font-medium text-gray-900">{s.value}</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: s.accent + "22" }}>
                  <Icon size={15} style={{ color: s.accent }} />
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 tracking-wide mb-2">MODULES</div>
        <div className="grid grid-cols-4 gap-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.key} onClick={() => setView(m.key)}
                className="bg-white rounded-lg p-4 border border-gray-100 hover:border-gray-300 text-left flex items-start justify-between transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: m.tint }}>
                    <Icon size={16} style={{ color: m.iconColor }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.subtitle}</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1.5" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Board ----------
function Board({ patients, onSelect }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const cards = patients.filter((p) => p.stage === stage.key);
        return (
          <div key={stage.key} className="shrink-0 w-64">
            <div className="mb-2 px-1">
              <div className="text-sm font-medium text-gray-900">{stage.label}</div>
              <div className="text-[11px] text-gray-500">{stage.hint} · {cards.length}</div>
            </div>
            <div className="flex flex-col gap-2">
              {cards.map((p) => (
                <PatientCard key={p.id} patient={p} onClick={() => onSelect(p.id)} />
              ))}
              {cards.length === 0 && (
                <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-md p-3 text-center">
                  No cards
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PatientCard({ patient, onClick }) {
  const stale = isStale(patient);
  const items = checklistFor(patient.stage);
  const state = patient.checklistState[patient.stage] || {};
  const doneCount = items.filter((i) => state[i.id]).length;
  const assignee = userById(patient.assignedTo);

  return (
    <button onClick={onClick}
      className="text-left bg-white rounded-md border p-3 hover:shadow-sm transition-shadow"
      style={{ borderColor: patient.isFlagged ? "#F09595" : stale ? "#FAC775" : "#e5e7eb" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-gray-900">{patient.name}</div>
        {assignee && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0"
            style={{ background: PHX.accent }}>{assignee.initials}</div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-wrap mt-2">
        {patient.isFlagged && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
            <Flag size={10} /> Flagged
          </span>
        )}
        {stale && (
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
            <Clock size={10} /> Stale
          </span>
        )}
        {items.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {doneCount}/{items.length} checklist
          </span>
        )}
      </div>
      <div className="text-[11px] text-gray-400 mt-2">Updated {relTime(patient.updatedAt)}</div>
    </button>
  );
}

// ---------- Patient modal ----------
function PatientModal({ patient, currentUser, isAdmin, onClose, onMove, onToggleChecklist, onAssign, onAddNote, onFlag, onClearFlag }) {
  const [noteDraft, setNoteDraft] = useState(patient.notes);
  const [flagReason, setFlagReason] = useState("");
  const [showFlagInput, setShowFlagInput] = useState(false);

  const curIdx = STAGE_ORDER.indexOf(patient.stage);
  const items = checklistFor(patient.stage);
  const state = patient.checklistState[patient.stage] || {};
  const canGoForward = curIdx < STAGE_ORDER.length - 1 && checklistComplete(patient, patient.stage);
  const canGoBack = curIdx > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" style={{ position: "fixed" }}>
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <div className="text-base font-medium text-gray-900">{patient.name}</div>
            <div className="text-xs text-gray-500">{STAGES.find((s) => s.key === patient.stage).label}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-4 flex flex-col gap-5">
          {patient.isFlagged && (
            <div className="bg-red-50 border border-red-100 rounded-md p-3 flex items-start justify-between gap-2">
              <div className="flex gap-2">
                <Flag size={15} className="text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">{patient.flagReason}</div>
              </div>
              {isAdmin && (
                <button onClick={() => onClearFlag(patient.id)} className="text-[11px] text-red-700 underline shrink-0">
                  Clear
                </button>
              )}
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">Assigned to</div>
            <select value={patient.assignedTo || ""} onChange={(e) => onAssign(patient.id, e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5">
              <option value="">Unassigned</option>
              {USERS.filter((u) => u.role === "va").map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                Checklist — required to advance
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map((item) => (
                  <button key={item.id} onClick={() => onToggleChecklist(patient.id, patient.stage, item.id)}
                    className="flex items-center gap-2 text-sm text-left">
                    {state[item.id] ? (
                      <CheckSquare size={16} style={{ color: PHX.accent }} />
                    ) : (
                      <Square size={16} className="text-gray-300" />
                    )}
                    <span className={state[item.id] ? "text-gray-500 line-through" : "text-gray-800"}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5">Operational notes</div>
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => onAddNote(patient.id, noteDraft)}
              rows={3} placeholder="Workflow status only — no clinical detail"
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5 resize-none" />
          </div>

          <div className="flex items-center gap-2">
            <button disabled={!canGoBack} onClick={() => onMove(patient.id, STAGE_ORDER[curIdx - 1])}
              className="flex-1 flex items-center justify-center gap-1 text-xs border border-gray-200 rounded-md py-2 disabled:opacity-30">
              <ArrowLeft size={13} /> Move back
            </button>
            <button disabled={!canGoForward} onClick={() => onMove(patient.id, STAGE_ORDER[curIdx + 1])}
              title={!canGoForward && curIdx < STAGE_ORDER.length - 1 ? "Complete checklist to advance" : ""}
              className="flex-1 flex items-center justify-center gap-1 text-xs rounded-md py-2 text-white disabled:opacity-30"
              style={{ background: PHX.sidebarBg }}>
              Advance stage <ArrowRight size={13} />
            </button>
          </div>
          {!canGoForward && curIdx < STAGE_ORDER.length - 1 && items.length > 0 && (
            <div className="text-[11px] text-amber-600 -mt-3">Complete all checklist items to advance.</div>
          )}

          {!patient.isFlagged && (
            <div>
              {!showFlagInput ? (
                <button onClick={() => setShowFlagInput(true)}
                  className="flex items-center gap-1.5 text-xs text-red-600">
                  <Flag size={13} /> Flag for Donna
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input value={flagReason} onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Reason (required)"
                    className="text-sm border border-gray-200 rounded-md px-2 py-1.5" />
                  <div className="flex gap-2">
                    <button onClick={() => { onFlag(patient.id, flagReason); setShowFlagInput(false); setFlagReason(""); }}
                      className="text-xs px-3 py-1.5 rounded-md text-white bg-red-600">Submit flag</button>
                    <button onClick={() => setShowFlagInput(false)} className="text-xs px-3 py-1.5 text-gray-500">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Log view ----------
function LogView({ log, patients }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 max-w-2xl">
      <div className="p-4 border-b border-gray-100 text-sm font-medium text-gray-900">Handoff log</div>
      <div className="divide-y divide-gray-100">
        {log.map((entry) => {
          const p = patients.find((pt) => pt.id === entry.patientId);
          return (
            <div key={entry.id} className="p-3 flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: entry.type === "auto" ? PHX.green : PHX.accent }} />
              <div className="flex-1 text-sm">
                <div className="text-gray-800">{entry.message}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {p ? p.name : "Unknown patient"} · {entry.author} · {relTime(entry.ts)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- SOP view ----------
function SopView() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 max-w-2xl p-5">
      <div className="text-sm font-medium text-gray-900 mb-3">Standard operating procedure</div>
      <div className="flex flex-col gap-3">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] text-white shrink-0"
              style={{ background: PHX.sidebarBg }}>{i + 1}</div>
            <div>
              <div className="text-sm font-medium text-gray-800">{s.label}</div>
              <div className="text-xs text-gray-500">{s.hint}</div>
              {checklistFor(s.key).length > 0 && (
                <ul className="text-xs text-gray-500 list-disc ml-4 mt-1">
                  {checklistFor(s.key).map((c) => <li key={c.id}>{c.label}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-gray-400 mt-4 pt-4 border-t border-gray-100">
        Optimantra remains the sole legal clinical record. This tool tracks workflow status only.
      </div>
    </div>
  );
}

// ---------- Admin dashboard ----------
function AdminView({ patients, onClearFlag, onSelect }) {
  const flagged = patients.filter((p) => p.isFlagged);
  const stale = patients.filter(isStale);
  const perVa = USERS.filter((u) => u.role === "va").map((u) => ({
    ...u, count: patients.filter((p) => p.assignedTo === u.id).length,
  }));
  const reconciledCount = patients.filter((p) => p.stage === "reconciled").length;

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Flagged cards" value={flagged.length} color={PHX.red} />
        <StatCard label="Stale cards" value={stale.length} color="#BA7517" />
        <StatCard label="Reconciled" value={reconciledCount} color={PHX.green} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100 text-sm font-medium text-gray-900">Flagged — needs Donna</div>
        <div className="divide-y divide-gray-100">
          {flagged.length === 0 && <div className="p-4 text-xs text-gray-400">No flagged cards.</div>}
          {flagged.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between gap-2">
              <button onClick={() => onSelect(p.id)} className="text-left">
                <div className="text-sm text-gray-800">{p.name}</div>
                <div className="text-xs text-red-600">{p.flagReason}</div>
              </button>
              <button onClick={() => onClearFlag(p.id)} className="text-xs text-gray-500 underline shrink-0">Clear</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100 text-sm font-medium text-gray-900">Stale — untouched 48h+</div>
        <div className="divide-y divide-gray-100">
          {stale.length === 0 && <div className="p-4 text-xs text-gray-400">Nothing stale.</div>}
          {stale.map((p) => (
            <button key={p.id} onClick={() => onSelect(p.id)} className="p-3 flex items-center justify-between w-full text-left">
              <div className="text-sm text-gray-800">{p.name}</div>
              <div className="text-xs text-gray-400">{relTime(p.updatedAt)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-100 text-sm font-medium text-gray-900">Load per VA</div>
        <div className="p-4 flex gap-6">
          {perVa.map((u) => (
            <div key={u.id}>
              <div className="text-2xl font-medium" style={{ color: PHX.accent }}>{u.count}</div>
              <div className="text-xs text-gray-500">{u.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-2xl font-medium" style={{ color }}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ---------- Simulate webhook intake ----------
function IntakeSimModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [platform, setPlatform] = useState("zocdoc");

  const previewAssignee = dateTime ? autoAssignByTime(dateTime) : null;
  const previewUser = previewAssignee ? userById(previewAssignee) : null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
            <Zap size={15} /> Simulate Make.com webhook
          </div>
          <button onClick={onClose} className="text-gray-400"><X size={16} /></button>
        </div>
        <div className="text-xs text-gray-500 mb-4">
          Mimics POST /api/patients/intake — the payload Make.com will send once the real backend exists.
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Patient name</div>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5" placeholder="Jane Doe" />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Appointment date/time</div>
            <input value={dateTime} onChange={(e) => setDateTime(e.target.value)} type="datetime-local"
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Booking platform</div>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-md px-2 py-1.5">
              <option value="zocdoc">ZocDoc</option>
              <option value="klarity">Klarity</option>
            </select>
          </div>
          <div className="text-xs rounded-md px-2 py-1.5" style={{ background: PHX.tint, color: PHX.accentDark }}>
            {dateTime
              ? previewUser
                ? `Will auto-assign to ${previewUser.name} (${previewAssignee === "jude" ? "morning" : "evening"} shift)`
                : "Invalid time — will be left unassigned"
              : "No time set — will be left unassigned"}
          </div>
          <button disabled={!name.trim()} onClick={() => onSubmit(name, dateTime, platform)}
            className="text-sm text-white rounded-md py-2 disabled:opacity-40"
            style={{ background: PHX.sidebarBg }}>
            Send simulated POST
          </button>
        </div>
      </div>
    </div>
  );
}
