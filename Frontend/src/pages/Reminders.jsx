
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertCircle,
  CalendarDays,
  ListTodo,
} from "lucide-react";
import api from "../components/lib/api";

const emptyForm = {
  title: "",
  description: "",
  scheduledAt: "",
};

function toLocalDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value) {
  if (!value) return "No date set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/reminders");
      const result = response.data?.data;

      setReminders(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load reminders. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const now = Date.now();

  const stats = useMemo(() => {
    const pending = reminders.filter((item) => !item.isCompleted);
    const completed = reminders.filter((item) => item.isCompleted);
    const overdue = pending.filter(
      (item) => new Date(item.scheduledAt).getTime() < now
    );
    const upcoming = pending.filter(
      (item) => new Date(item.scheduledAt).getTime() >= now
    );

    return {
      total: reminders.length,
      pending: pending.length,
      completed: completed.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
    };
  }, [reminders, now]);

  const filteredReminders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...reminders]
      .filter((item) => {
        const date = new Date(item.scheduledAt).getTime();
        const overdue = !item.isCompleted && date < now;

        if (activeFilter === "upcoming" && (item.isCompleted || date < now)) {
          return false;
        }

        if (activeFilter === "overdue" && !overdue) return false;
        if (activeFilter === "completed" && !item.isCompleted) return false;
        if (activeFilter === "pending" && item.isCompleted) return false;

        if (query) {
          const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
          if (!text.includes(query)) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime()
      );
  }, [reminders, activeFilter, search, now]);

  function openCreateForm() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      scheduledAt: toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(reminder) {
    setEditingId(reminder.id);
    setForm({
      title: reminder.title || "",
      description: reminder.description || "",
      scheduledAt: toLocalDateTimeInput(reminder.scheduledAt),
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter a reminder title.");
      return;
    }

    if (!form.scheduledAt) {
      setError("Please select a date and time.");
      return;
    }

    const scheduledDate = new Date(form.scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      scheduledAt: scheduledDate.toISOString(),
    };

    setSaving(true);

    try {
      if (editingId) {
        const response = await api.put(`/reminders/${editingId}`, payload);
        const updated = response.data?.data;

        if (updated) {
          setReminders((current) =>
            current.map((item) => (item.id === editingId ? updated : item))
          );
        } else {
          await loadReminders();
        }

        setSuccess("Reminder updated successfully.");
      } else {
        const response = await api.post("/reminders", payload);
        const created = response.data?.data;

        if (created) {
          setReminders((current) => [...current, created]);
        } else {
          await loadReminders();
        }

        setSuccess("Reminder created successfully.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to save the reminder. Please try again.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(reminder) {
    setError("");
    setSuccess("");
    setBusyId(reminder.id);

    try {
      const response = await api.patch(
        `/reminders/${reminder.id}/complete`
      );
      const updated = response.data?.data;

      if (updated) {
        setReminders((current) =>
          current.map((item) => (item.id === reminder.id ? updated : item))
        );
      } else {
        await loadReminders();
      }

      setSuccess(
        updated?.isCompleted
          ? "Reminder marked as completed."
          : "Reminder marked as incomplete."
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to update reminder status.")
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteReminder(reminder) {
    const confirmed = window.confirm(
      `Delete "${reminder.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setBusyId(reminder.id);

    try {
      await api.delete(`/reminders/${reminder.id}`);
      setReminders((current) =>
        current.filter((item) => item.id !== reminder.id)
      );
      setSuccess("Reminder deleted successfully.");
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to delete the reminder.")
      );
    } finally {
      setBusyId(null);
    }
  }

  const filters = [
    { id: "all", label: "All reminders" },
    { id: "upcoming", label: "Upcoming" },
    { id: "overdue", label: "Overdue" },
    { id: "completed", label: "Completed" },
  ];

  const statCards = [
    {
      label: "Total reminders",
      value: stats.total,
      icon: Bell,
      iconStyle: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      icon: CalendarClock,
      iconStyle: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    {
      label: "Overdue",
      value: stats.overdue,
      icon: Clock3,
      iconStyle: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      iconStyle: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-slate-800 dark:bg-[#0d0c19] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page heading */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400">
              <Bell size={17} />
              Your personal health organizer
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Reminders
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Keep track of appointments, checkups, and other important health
              tasks in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadReminders}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#171526] dark:text-slate-200 dark:hover:bg-white/5"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={18} />
              New reminder
            </button>
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="flex-1">{success}</span>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171526] sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                      {stat.value}
                    </p>
                  </div>

                  <div className={`rounded-xl p-3 ${stat.iconStyle}`}>
                    <Icon size={21} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Form */}
        {showForm && (
          <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-500/20 dark:bg-[#171526] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingId ? "Edit reminder" : "Create a reminder"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Choose a title and the date and time you want to be reminded.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close reminder form"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="reminder-title"
                    className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Reminder title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reminder-title"
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    maxLength={150}
                    placeholder="e.g. Annual health checkup"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reminder-scheduled-at"
                    className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Date and time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reminder-scheduled-at"
                    name="scheduledAt"
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={handleFormChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reminder-description"
                  className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Description <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="reminder-description"
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  maxLength={1000}
                  rows={3}
                  placeholder="Add any helpful details..."
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-white"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Create reminder"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Reminder list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#171526]">
          <div className="border-b border-slate-100 p-4 dark:border-white/10 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Your reminders
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filteredReminders.length}{" "}
                  {filteredReminders.length === 1 ? "reminder" : "reminders"} shown
                </p>
              </div>

              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reminders..."
                  aria-label="Search reminders"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-white"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    activeFilter === filter.id
                      ? "bg-violet-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
              <Loader2 size={28} className="animate-spin text-violet-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading your reminders...
              </p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-5 py-12 text-center">
              <div className="mb-4 rounded-2xl bg-violet-100 p-4 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                {search || activeFilter !== "all" ? (
                  <Search size={28} />
                ) : (
                  <ListTodo size={28} />
                )}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {search || activeFilter !== "all"
                  ? "No matching reminders"
                  : "No reminders yet"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
                {search || activeFilter !== "all"
                  ? "Try a different search term or filter."
                  : "Create a reminder for your next appointment, health checkup, or important task."}
              </p>

              {!search && activeFilter === "all" && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <Plus size={17} />
                  Create your first reminder
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {filteredReminders.map((reminder) => {
                const isOverdue =
                  !reminder.isCompleted &&
                  new Date(reminder.scheduledAt).getTime() < now;

                const isBusy = busyId === reminder.id;

                return (
                  <article
                    key={reminder.id}
                    className={`p-4 transition hover:bg-slate-50/80 dark:hover:bg-white/[0.02] sm:p-5 ${
                      reminder.isCompleted ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => toggleCompleted(reminder)}
                        disabled={isBusy}
                        aria-label={
                          reminder.isCompleted
                            ? `Mark ${reminder.title} incomplete`
                            : `Mark ${reminder.title} completed`
                        }
                        title={
                          reminder.isCompleted
                            ? "Mark incomplete"
                            : "Mark completed"
                        }
                        className={`mt-0.5 shrink-0 rounded-full transition disabled:opacity-50 ${
                          reminder.isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-300 hover:text-violet-600 dark:text-slate-500 dark:hover:text-violet-400"
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 size={23} className="animate-spin" />
                        ) : reminder.isCompleted ? (
                          <CheckCircle2 size={23} />
                        ) : (
                          <Circle size={23} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            className={`break-words font-semibold ${
                              reminder.isCompleted
                                ? "text-slate-500 line-through dark:text-slate-400"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {reminder.title}
                          </h3>

                          {reminder.isCompleted ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                              Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                              Overdue
                            </span>
                          ) : (
                            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                              Upcoming
                            </span>
                          )}
                        </div>

                        {reminder.description && (
                          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                            {reminder.description}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={15} className="text-violet-500" />
                            {formatDate(reminder.scheduledAt)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={15} className="text-violet-500" />
                            {formatTime(reminder.scheduledAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(reminder)}
                          disabled={isBusy}
                          aria-label={`Edit ${reminder.title}`}
                          title="Edit reminder"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteReminder(reminder)}
                          disabled={isBusy}
                          aria-label={`Delete ${reminder.title}`}
                          title="Delete reminder"
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="px-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
          VitaAI reminders help you organize your schedule. Keep in mind that
          reminders displayed in this page do not guarantee that browser or
          device notifications will appear.
        </p>
      </div>
    </main>
  );
}
