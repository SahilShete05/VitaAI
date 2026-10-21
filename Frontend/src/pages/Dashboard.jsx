import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Bell,
  BellRing,
  CalendarDays,
  ChevronRight,
  ClipboardPlus,
  Clock3,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Pill,
  RefreshCw,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import api from "../components/lib/api";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", active: true },
  { label: "AI Health Chat", icon: MessageCircle, path: "/health-chat" },
  { label: "Health Assessments", icon: ClipboardPlus, path: "/assessments" },
  { label: "Symptom Tracking", icon: Activity, path: "/symptom-tracking" },
  { label: "Healthcare Locator", icon: MapPin, path: "/healthcare-locator" },
  { label: "Medications", icon: Pill, path: "/medications" },
  { label: "Medicine Information", icon: Pill, path: "/medicine-info" },
  { label: "Lab Report Analysis", icon: FlaskConical, path: "/lab-reports" },
  { label: "Family Members", icon: Users, path: "/family-members" },
  { label: "Reminders", icon: CalendarDays, path: "/reminders" },
  { label: "Vitals", icon: HeartPulse, path: "/vitals" },
  { label: "Health Reports", icon: FileText, path: "/health-reports" },
  { label: "Doctor Summaries", icon: Stethoscope, path: "/doctor-summaries" },
  { label: "Voice Transcription", icon: Mic, path: "/voice-transcription" },
  {
    label: "Notifications & Follow-ups",
    icon: BellRing,
    path: "/notifications-follow-ups",
  },
  { label: "Profile Settings", icon: UserRound, path: "/profile" },
  { label: "Privacy Controls", icon: Settings, path: "/privacy" },
];

const workspaceCards = [
  {
    title: "AI Health Chat",
    description: "Ask health questions and discuss your symptoms.",
    icon: MessageCircle,
    color: "from-purple-500 to-violet-600",
    path: "/health-chat",
  },
  {
    title: "New Assessment",
    description: "Record symptoms and get AI-powered health information.",
    icon: ClipboardPlus,
    color: "from-blue-500 to-indigo-600",
    path: "/assessments",
  },
  {
    title: "Healthcare Locator",
    description: "Find nearby hospitals, clinics and pharmacies.",
    icon: MapPin,
    color: "from-emerald-500 to-teal-600",
    path: "/healthcare-locator",
  },
  {
    title: "Medications",
    description: "Manage medicines and dose schedules.",
    icon: Pill,
    color: "from-violet-500 to-blue-600",
    path: "/medications",
  },
  {
    title: "Medicine Information",
    description: "Explore common uses, side effects and precautions.",
    icon: Pill,
    color: "from-purple-500 to-fuchsia-600",
    path: "/medicine-info",
  },
  {
    title: "Lab Report Analysis",
    description: "Understand lab report values and reference ranges.",
    icon: FlaskConical,
    color: "from-cyan-500 to-blue-600",
    path: "/lab-reports",
  },
  {
    title: "Health Reports",
    description: "Review your health history and reports.",
    icon: FileText,
    color: "from-cyan-500 to-blue-600",
    path: "/health-reports",
  },
  {
    title: "Doctor Summaries",
    description: "Prepare a summary of your symptoms for a doctor.",
    icon: Stethoscope,
    color: "from-emerald-500 to-teal-600",
    path: "/doctor-summaries",
  },
  {
    title: "Voice Transcription",
    description: "Record or upload voice notes about your health.",
    icon: Mic,
    color: "from-pink-500 to-rose-600",
    path: "/voice-transcription",
  },
  {
    title: "Notifications & Follow-ups",
    description: "Review notifications and follow-up items.",
    icon: BellRing,
    color: "from-amber-500 to-orange-600",
    path: "/notifications-follow-ups",
  },
  {
    title: "Vitals",
    description: "Keep track of your recorded health measurements.",
    icon: HeartPulse,
    color: "from-rose-500 to-pink-600",
    path: "/vitals",
  },
  {
    title: "Symptom Tracking",
    description: "Review and track changes in your symptoms.",
    icon: Activity,
    color: "from-indigo-500 to-purple-600",
    path: "/symptom-tracking",
  },
  {
    title: "Family Members",
    description: "Manage family health profiles.",
    icon: Users,
    color: "from-sky-500 to-cyan-600",
    path: "/family-members",
  },
  {
    title: "Reminders",
    description: "View your upcoming health reminders.",
    icon: CalendarDays,
    color: "from-orange-500 to-amber-600",
    path: "/reminders",
  },
  {
    title: "Profile Settings",
    description: "Update your name, email address, and account details.",
    icon: UserRound,
    color: "from-violet-500 to-purple-700",
    path: "/profile",
  },
  {
    title: "Privacy Controls",
    description: "Review your health-data privacy settings.",
    icon: Settings,
    color: "from-slate-500 to-slate-700",
    path: "/privacy",
  },
];

function getList(response, possibleKeys = []) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;

  for (const key of possibleKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;

  return null;
}

function formatDate(value) {
  if (!value) return "None yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SummaryCard({ title, value, description, icon: Icon, color }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <p className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}
        >
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-3 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <RefreshCw size={17} className="animate-spin" />
        Loading dashboard…
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [assessments, setAssessments] = useState([]);
  const [familyCount, setFamilyCount] = useState(null);
  const [reminderCount, setReminderCount] = useState(null);
  const [unreadCount, setUnreadCount] = useState(null);

  const navigateTo = useCallback(
    (path) => {
      setSidebarOpen(false);
      navigate(path);
    },
    [navigate]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/assessments"),
        api.get("/family-members"),
        api.get("/reminders"),
        api.get("/notifications"),
      ]);

      const [
        assessmentResult,
        familyResult,
        reminderResult,
        notificationResult,
      ] = results;

      if (assessmentResult.status === "fulfilled") {
        const list = getList(assessmentResult.value, ["assessments"]);
        setAssessments(list || []);

        if (!list) {
          console.warn("Unrecognized assessments response format.");
        }
      } else {
        console.error(
          "Failed to load assessments:",
          assessmentResult.reason
        );
        setAssessments([]);
        setError("Some dashboard information could not be loaded.");
      }

      if (familyResult.status === "fulfilled") {
        const members = getList(familyResult.value, [
          "familyMembers",
          "members",
        ]);
        setFamilyCount(members ? members.length : null);
      } else {
        console.warn("Family member information is unavailable.");
        setFamilyCount(null);
      }

      if (reminderResult.status === "fulfilled") {
        const reminders = getList(reminderResult.value, ["reminders"]);

        if (reminders) {
          const now = Date.now();

          const pending = reminders.filter((reminder) => {
            const completed =
              reminder.isCompleted === true ||
              reminder.completed === true;

            if (completed) return false;

            const dateValue =
              reminder.scheduledAt ||
              reminder.reminderDate ||
              reminder.date ||
              reminder.dueDate;

            if (!dateValue) return true;

            const reminderDate = new Date(dateValue).getTime();

            return !Number.isNaN(reminderDate) && reminderDate >= now;
          });

          setReminderCount(pending.length);
        } else {
          setReminderCount(null);
        }
      } else {
        console.warn("Reminder information is unavailable.");
        setReminderCount(null);
      }

      if (notificationResult.status === "fulfilled") {
        const notificationResponse = notificationResult.value;
        const notifications = getList(notificationResponse, [
          "notifications",
          "items",
        ]);
        const reportedUnreadCount =
          notificationResponse.data?.unreadCount;

        if (Number.isFinite(reportedUnreadCount)) {
          setUnreadCount(reportedUnreadCount);
        } else if (notifications) {
          setUnreadCount(
            notifications.filter((item) => {
              if (item.notificationReadAt) return false;
              if (item.readAt) return false;
              if (item.isRead === true || item.read === true) return false;
              if (item.read === false || item.isRead === false) return true;

              return (
                item.notificationReadAt === null ||
                item.readAt === null
              );
            }).length
          );
        } else {
          setUnreadCount(null);
        }
      } else {
        console.warn("Notification information is unavailable.");
        setUnreadCount(null);
      }
    } catch (err) {
      console.error("Dashboard loading failed:", err);
      setError("Unable to load dashboard information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  }

  const sortedAssessments = [...assessments].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );

  const latestAssessment = sortedAssessments[0];

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-[#17172b] dark:bg-[#0d0c19] dark:text-white">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 bg-white/90 p-5 backdrop-blur-xl transition-transform dark:border-white/10 dark:bg-[#151225]/95 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c32e8] via-[#4935d4] to-[#253fe0] text-white shadow-lg shadow-purple-500/20">
            <HeartPulse size={25} />
          </div>

          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">VitaAI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Healthcare assistant
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-white/10 md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navigation.map(({ label, icon: Icon, path, active }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigateTo(path)}
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-[#7029d9]/10 to-[#253fe0]/10 text-[#7029d9] dark:text-purple-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>

              {label === "Notifications & Follow-ups" &&
                unreadCount !== null &&
                unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}

              {active && (
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-[#8c32e8] to-[#253fe0]" />
              )}
            </button>
          ))}
        </nav>

        <div className="mt-4 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-blue-50 p-4 dark:border-white/10 dark:from-purple-400/10 dark:to-blue-400/10">
          <div className="mb-2 flex items-center gap-2 text-[#7029d9] dark:text-purple-300">
            <ShieldCheck size={18} />
            <span className="text-xs font-semibold">Your health matters</span>
          </div>
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
            Keep your health information organized in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-red-400/10 dark:hover:text-red-300"
        >
          <LogOut size={19} />
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </aside>

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d0c19]/80 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 md:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <h2 className="text-lg font-bold">Dashboard</h2>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                Your personal health overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Refresh dashboard"
              title="Refresh dashboard"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RefreshCw
                size={19}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <button
              type="button"
              aria-label="Open notifications"
              title="Open notifications"
              onClick={() => navigateTo("/notifications-follow-ups")}
              className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <Bell size={19} />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              title="Open profile settings"
              aria-label="Open profile settings"
              onClick={() => navigateTo("/profile")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8c32e8] to-[#253fe0] font-bold text-white transition hover:opacity-90"
            >
              {(user?.name || "U").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-8 p-4 sm:p-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7029d9] via-[#4935d4] to-[#253fe0] p-7 text-white shadow-xl shadow-purple-900/10 sm:p-10">
            <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/15" />
            <div className="pointer-events-none absolute -right-4 -top-16 h-56 w-56 rounded-full border border-white/15" />

            <div className="relative max-w-2xl">
              <p className="mb-3 text-sm font-medium text-white/75">
                Your health, at a glance
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back{user?.name ? `, ${user.name}` : ""}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                Keep your health information organized, review your recent
                assessments, and find the right VitaAI tool when you need it.
              </p>
            </div>

            <div className="relative mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigateTo("/health-chat")}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#4935d4] shadow-lg transition hover:-translate-y-0.5"
              >
                <MessageCircle size={18} />
                Open health chat
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/healthcare-locator")}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <MapPin size={18} />
                Find nearby care
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/profile")}
                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <UserRound size={18} />
                Profile settings
                <ChevronRight size={16} />
              </button>
            </div>
          </section>

          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Health overview</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  A quick summary of your health information.
                </p>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/5"
              >
                <RefreshCw
                  size={16}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            {error && (
              <div
                role="status"
                className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <p>{error} Some cards may show unavailable values.</p>
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <LoadingCard key={index} />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  title="Total assessments"
                  value={assessments.length}
                  description="Your recorded assessment history"
                  icon={ClipboardPlus}
                  color="bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300"
                />

                <SummaryCard
                  title="Family members"
                  value={familyCount === null ? "—" : familyCount}
                  description="Profiles in your family health space"
                  icon={Users}
                  color="bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300"
                />

                <SummaryCard
                  title="Latest assessment"
                  value={
                    latestAssessment
                      ? formatDate(latestAssessment.createdAt)
                      : "None yet"
                  }
                  description={
                    latestAssessment?.symptoms
                      ? `Symptoms: ${latestAssessment.symptoms}`
                      : "Your most recent recorded assessment"
                  }
                  icon={Clock3}
                  color="bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300"
                />

                <SummaryCard
                  title="Upcoming reminders"
                  value={reminderCount === null ? "—" : reminderCount}
                  description="Pending reminders scheduled for later"
                  icon={CalendarDays}
                  color="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                />
              </div>
            )}
          </section>

          <section>
            <div className="mb-5">
              <h3 className="text-lg font-bold">Quick actions</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Open your health tools and records.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {workspaceCards.map(
                ({ title, description, icon: Icon, color, path }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => navigateTo(path)}
                    className="group rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-900/5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-purple-400/30"
                  >
                    <div
                      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}
                    >
                      <Icon size={23} />
                    </div>

                    <h4 className="font-semibold">{title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {description}
                    </p>

                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#7029d9] dark:text-purple-300">
                      Open section
                      <ChevronRight
                        size={16}
                        className="transition group-hover:translate-x-1"
                      />
                    </span>
                  </button>
                )
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-5 dark:border-white/10 dark:from-purple-400/10 dark:to-blue-400/10 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm dark:bg-white/10 dark:text-purple-300">
                <ShieldCheck size={21} />
              </div>
              <div>
                <h3 className="font-semibold">A helpful health reminder</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  VitaAI provides general health information and does not
                  replace a qualified healthcare professional. Seek urgent
                  medical care for severe or rapidly worsening symptoms.
                </p>
              </div>
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200/70 pt-6 text-xs text-slate-400 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <span>VitaAI · Your personal health companion</span>
            <span>
              Health information is not a substitute for professional medical
              advice.
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
