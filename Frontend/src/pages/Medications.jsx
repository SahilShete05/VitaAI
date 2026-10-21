
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  History,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
  X,
  CalendarClock,
  ClipboardList,
} from "lucide-react";
import api from "../components/lib/api";

const EMPTY_FORM = {
  name: "",
  dosage: "",
  frequency: "Once daily",
  scheduleTimes: ["09:00"],
  instructions: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
};

const DOSE_STATUSES = ["taken", "missed", "skipped", "pending"];

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusClass(status) {
  switch (status) {
    case "taken":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "missed":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
    case "skipped":
      return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300";
    default:
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  }
}

function getDoseDateInput(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return localDateString(date);
}

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [doseHistory, setDoseHistory] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyDoseId, setBusyDoseId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [medicationFilter, setMedicationFilter] = useState("active");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyDate, setHistoryDate] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const today = localDateString();

  const loadMedications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/medications"),
        api.get("/medications/doses/history"),
        api.get("/medications/doses/summary"),
        api.get("/medications/doses/weekly-summary"),
      ]);

      const [medsResult, historyResult, summaryResult, weeklyResult] = results;

      if (medsResult.status === "fulfilled") {
        setMedications(
          Array.isArray(medsResult.value.data?.data)
            ? medsResult.value.data.data
            : []
        );
      } else {
        throw medsResult.reason;
      }

      if (historyResult.status === "fulfilled") {
        setDoseHistory(
          Array.isArray(historyResult.value.data?.data)
            ? historyResult.value.data.data
            : []
        );
      } else {
        setDoseHistory([]);
      }

      if (summaryResult.status === "fulfilled") {
        setTodaySummary(summaryResult.value.data?.data || null);
      } else {
        setTodaySummary(null);
      }

      if (weeklyResult.status === "fulfilled") {
        setWeeklySummary(weeklyResult.value.data?.data || null);
      } else {
        setWeeklySummary(null);
      }

      const failedSections = results
        .slice(1)
        .filter((result) => result.status === "rejected").length;

      if (failedSections) {
        setError(
          "Medications loaded, but some dose insights could not be retrieved. Try refreshing."
        );
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to load medications."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const filteredMedications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return medications.filter((medication) => {
      const active = medication.isActive !== false;

      if (medicationFilter === "active" && !active) return false;
      if (medicationFilter === "inactive" && active) return false;

      if (query) {
        const searchable = [
          medication.name,
          medication.dosage,
          medication.frequency,
          medication.instructions,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }, [medications, medicationFilter, search]);

  const filteredHistory = useMemo(() => {
    return doseHistory.filter((dose) => {
      if (historyFilter !== "all" && dose.status !== historyFilter) {
        return false;
      }

      if (historyDate && getDoseDateInput(dose.scheduledFor) !== historyDate) {
        return false;
      }

      return true;
    });
  }, [doseHistory, historyFilter, historyDate]);

  const activeMedicationCount = medications.filter(
    (medication) => medication.isActive !== false
  ).length;

  function openCreateForm() {
    setEditingMedication(null);
    setForm({
      ...EMPTY_FORM,
      scheduleTimes: ["09:00"],
      startDate: today,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(medication) {
    setEditingMedication(medication);
    setForm({
      name: medication.name || "",
      dosage: medication.dosage || "",
      frequency: medication.frequency || "Once daily",
      scheduleTimes:
        Array.isArray(medication.scheduleTimes) &&
        medication.scheduleTimes.length
          ? [...medication.scheduleTimes]
          : ["09:00"],
      instructions: medication.instructions || "",
      startDate: getDoseDateInput(medication.startDate),
      endDate: medication.endDate
        ? getDoseDateInput(medication.endDate)
        : "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditingMedication(null);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function changeScheduleTime(index, value) {
    setForm((current) => ({
      ...current,
      scheduleTimes: current.scheduleTimes.map((time, i) =>
        i === index ? value : time
      ),
    }));
  }

  function addScheduleTime() {
    setForm((current) => ({
      ...current,
      scheduleTimes: [...current.scheduleTimes, "18:00"],
    }));
  }

  function removeScheduleTime(index) {
    setForm((current) => ({
      ...current,
      scheduleTimes: current.scheduleTimes.filter((_, i) => i !== index),
    }));
  }

  async function handleSaveMedication(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.name.trim() ||
      !form.dosage.trim() ||
      !form.frequency.trim() ||
      !form.startDate
    ) {
      setError("Name, dosage, frequency, and start date are required.");
      return;
    }

    if (
      form.scheduleTimes.length === 0 ||
      form.scheduleTimes.some(
        (time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      )
    ) {
      setError("Add at least one valid scheduled time.");
      return;
    }

    if (
      form.endDate &&
      new Date(form.endDate).getTime() < new Date(form.startDate).getTime()
    ) {
      setError("End date cannot be before start date.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      frequency: form.frequency.trim(),
      scheduleTimes: [...new Set(form.scheduleTimes)],
      instructions: form.instructions.trim(),
      startDate: new Date(`${form.startDate}T00:00:00`).toISOString(),
      endDate: form.endDate
        ? new Date(`${form.endDate}T23:59:59`).toISOString()
        : null,
    };

    setSaving(true);

    try {
      if (editingMedication) {
        const response = await api.patch(
          `/medications/${editingMedication.id}`,
          payload
        );

        const updated = response.data?.data;

        setMedications((current) =>
          current.map((item) =>
            item.id === editingMedication.id
              ? { ...item, ...updated }
              : item
          )
        );

        setSuccess("Medication updated successfully.");
      } else {
        const response = await api.post("/medications", payload);
        const created = response.data?.data;

        if (created) {
          setMedications((current) => [created, ...current]);
        }

        setSuccess("Medication added successfully.");
      }

      setShowForm(false);
      setEditingMedication(null);
      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to save this medication."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleMedicationActive(medication) {
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(`/medications/${medication.id}`, {
        isActive: medication.isActive === false,
      });

      const updated = response.data?.data;

      setMedications((current) =>
        current.map((item) =>
          item.id === medication.id ? { ...item, ...updated } : item
        )
      );

      setSuccess(
        updated?.isActive === false
          ? "Medication deactivated."
          : "Medication activated."
      );

      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to update medication status."));
    }
  }

  async function deleteMedication(medication) {
    const confirmed = window.confirm(
      `Delete ${medication.name}? This also deletes its dose history.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/medications/${medication.id}`);
      setMedications((current) =>
        current.filter((item) => item.id !== medication.id)
      );
      setDoseHistory((current) =>
        current.filter((dose) => dose.medicationId !== medication.id)
      );
      setSuccess("Medication and its dose history deleted.");
      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to delete medication."));
    }
  }

  async function generateDoses() {
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/medications/generate-doses");
      const result = response.data?.data;

      setSuccess(
        result
          ? "Scheduled doses generated successfully."
          : "Dose scheduling completed."
      );

      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to generate scheduled doses."));
    } finally {
      setGenerating(false);
    }
  }

  async function updateDoseStatus(dose, status) {
    setBusyDoseId(dose.id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/medications/doses/${dose.id}/status`, { status });

      setDoseHistory((current) =>
        current.map((item) =>
          item.id === dose.id
            ? {
                ...item,
                status,
                takenAt: status === "taken" ? new Date().toISOString() : null,
              }
            : item
        )
      );

      setMedications((current) =>
        current.map((medication) => ({
          ...medication,
          doses: medication.doses?.map((item) =>
            item.id === dose.id
              ? {
                  ...item,
                  status,
                  takenAt:
                    status === "taken" ? new Date().toISOString() : null,
                }
              : item
          ),
        }))
      );

      setSuccess(`Dose marked as ${status}.`);
      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to update this dose."));
    } finally {
      setBusyDoseId(null);
    }
  }

  async function recordNewDose(medication) {
    const scheduledFor = window.prompt(
      "Enter the scheduled date and time in ISO format, for example 2026-10-18T09:00:00+05:30:"
    );

    if (!scheduledFor) return;

    const parsed = new Date(scheduledFor);

    if (Number.isNaN(parsed.getTime())) {
      setError("That date and time is invalid.");
      return;
    }

    const status = window.prompt(
      "Enter dose status: taken, missed, skipped, or pending",
      "taken"
    );

    if (!status || !DOSE_STATUSES.includes(status.toLowerCase())) {
      setError("Choose taken, missed, skipped, or pending.");
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.post(`/medications/${medication.id}/doses`, {
        scheduledFor: parsed.toISOString(),
        status: status.toLowerCase(),
      });

      setSuccess("Dose record saved successfully.");
      await loadMedications();
    } catch (err) {
      setError(errorMessage(err, "Unable to save this dose record."));
    }
  }

  const stats = [
    {
      label: "Active medications",
      value: activeMedicationCount,
      icon: Pill,
      style:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    },
    {
      label: "Doses scheduled today",
      value: todaySummary?.totalScheduled ?? "—",
      icon: CalendarClock,
      style:
        "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    {
      label: "Doses taken today",
      value: todaySummary?.taken ?? "—",
      icon: CheckCircle2,
      style:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    {
      label: "Adherence this week",
      value:
        weeklySummary?.adherencePercentage == null
          ? "—"
          : `${weeklySummary.adherencePercentage}%`,
      icon: TrendingUp,
      style:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
  ];

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-slate-800 dark:bg-[#0d0c19] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400">
              <Pill size={17} />
              Medication organizer
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Medications
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Manage your medication schedule and keep track of your dose
              history and adherence.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadMedications}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#171526] dark:text-slate-200 dark:hover:bg-white/5"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={generateDoses}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CalendarClock size={16} />
              )}
              Generate doses
            </button>
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus size={18} />
              Add medication
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
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
            <button onClick={() => setSuccess("")} aria-label="Dismiss message">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => {
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
                  <div className={`rounded-xl p-3 ${stat.style}`}>
                    <Icon size={21} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {showForm && (
          <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm dark:border-violet-500/20 dark:bg-[#171526] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editingMedication ? "Edit medication" : "Add medication"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enter the schedule exactly as prescribed by your healthcare
                  professional.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Close medication form"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Medication name" required>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFieldChange}
                    required
                    maxLength={150}
                    placeholder="e.g. Medication name"
                    className={inputClass}
                  />
                </Field>

                <Field label="Dosage" required>
                  <input
                    name="dosage"
                    value={form.dosage}
                    onChange={handleFieldChange}
                    required
                    placeholder="e.g. 1 tablet, 500 mg"
                    className={inputClass}
                  />
                </Field>

                <Field label="Frequency" required>
                  <select
                    name="frequency"
                    value={form.frequency}
                    onChange={handleFieldChange}
                    required
                    className={inputClass}
                  >
                    <option>Once daily</option>
                    <option>Twice daily</option>
                    <option>Three times daily</option>
                    <option>Four times daily</option>
                    <option>Every 4 hours</option>
                    <option>Every 6 hours</option>
                    <option>Every 8 hours</option>
                    <option>Every 12 hours</option>
                    <option>As prescribed</option>
                    <option>As needed</option>
                    <option>Other</option>
                  </select>
                </Field>

                <Field label="Start date" required>
                  <input
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleFieldChange}
                    required
                    className={inputClass}
                  />
                </Field>

                <Field label="End date (optional)">
                  <input
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={handleFieldChange}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Daily schedule times <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={addScheduleTime}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
                  >
                    <Plus size={15} />
                    Add time
                  </button>
                </div>

                <div className="flex flex-wrap gap-3">
                  {form.scheduleTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(event) =>
                          changeScheduleTime(index, event.target.value)
                        }
                        required
                        aria-label={`Schedule time ${index + 1}`}
                        className={`${inputClass} w-36`}
                      />
                      {form.scheduleTimes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleTime(index)}
                          aria-label={`Remove schedule time ${index + 1}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Times use 24-hour format. These times are sent to your backend
                  as HH:mm values.
                </p>
              </div>

              <Field label="Instructions (optional)">
                <textarea
                  name="instructions"
                  value={form.instructions}
                  onChange={handleFieldChange}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add prescribed instructions, such as take with food..."
                  className={inputClass}
                />
              </Field>

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingMedication
                    ? "Save changes"
                    : "Add medication"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Medication list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#171526]">
          <div className="border-b border-slate-100 p-4 dark:border-white/10 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  My medications
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filteredMedications.length} medication
                  {filteredMedications.length === 1 ? "" : "s"} shown
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search medications..."
                    aria-label="Search medications"
                    className={`${inputClass} pl-9 sm:w-64`}
                  />
                </div>

                <select
                  value={medicationFilter}
                  onChange={(event) => setMedicationFilter(event.target.value)}
                  aria-label="Filter medications"
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="all">All medications</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading medications and dose history..." />
          ) : filteredMedications.length === 0 ? (
            <EmptyState
              title="No medications found"
              description={
                search || medicationFilter !== "active"
                  ? "Try another search or filter."
                  : "Add a medication to begin organizing your schedule."
              }
              onAction={
                !search && medicationFilter === "active"
                  ? openCreateForm
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 sm:p-5">
              {filteredMedications.map((medication) => {
                const active = medication.isActive !== false;

                return (
                  <article
                    key={medication.id}
                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-violet-200 dark:border-white/10 dark:hover:border-violet-500/30 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                        <Pill size={22} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words font-bold text-slate-900 dark:text-white">
                            {medication.name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              active
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-300">
                          {medication.dosage}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(medication)}
                          title="Edit medication"
                          aria-label={`Edit ${medication.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
                        >
                          <Edit3 size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMedication(medication)}
                          title="Delete medication"
                          aria-label={`Delete ${medication.name}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoItem
                        icon={Clock3}
                        label="Frequency"
                        value={medication.frequency}
                      />
                      <InfoItem
                        icon={CalendarDays}
                        label="Start date"
                        value={formatDate(medication.startDate)}
                      />
                      <InfoItem
                        icon={CalendarClock}
                        label="Schedule"
                        value={
                          Array.isArray(medication.scheduleTimes)
                            ? medication.scheduleTimes.join(", ")
                            : "Not specified"
                        }
                      />
                      <InfoItem
                        icon={CalendarDays}
                        label="End date"
                        value={
                          medication.endDate
                            ? formatDate(medication.endDate)
                            : "Not set"
                        }
                      />
                    </div>

                    {medication.instructions && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-white/[0.03] dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          Instructions:{" "}
                        </span>
                        {medication.instructions}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleMedicationActive(medication)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      >
                        {active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => recordNewDose(medication)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
                      >
                        <Plus size={14} />
                        Record dose
                      </button>
                    </div>

                    {Array.isArray(medication.doses) &&
                      medication.doses.length > 0 && (
                        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Recent doses
                          </p>
                          <div className="space-y-2">
                            {medication.doses.slice(0, 3).map((dose) => (
                              <div
                                key={dose.id}
                                className="flex flex-wrap items-center justify-between gap-2 text-sm"
                              >
                                <span className="text-slate-600 dark:text-slate-300">
                                  {formatDateTime(dose.scheduledFor)}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                    dose.status
                                  )}`}
                                >
                                  {dose.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Today's adherence */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171526] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <Activity size={19} />
                  <span className="text-sm font-semibold">Today's adherence</span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Daily dose summary
                </h2>
              </div>
              <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                {todaySummary?.date || today}
              </span>
            </div>

            {todaySummary ? (
              <>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {todaySummary.adherencePercentage == null
                        ? "—"
                        : `${todaySummary.adherencePercentage}%`}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {todaySummary.adherencePercentage == null
                        ? "No eligible doses yet"
                        : "Doses taken out of those scheduled"}
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {todaySummary.taken}/{todaySummary.totalScheduled} taken
                  </p>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
                    style={{
                      width: `${todaySummary.adherencePercentage ?? 0}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Taken", todaySummary.taken, "text-emerald-600 dark:text-emerald-400"],
                    ["Pending", todaySummary.pending, "text-amber-600 dark:text-amber-400"],
                    ["Missed", todaySummary.missed, "text-red-600 dark:text-red-400"],
                    ["Skipped", todaySummary.skipped, "text-slate-600 dark:text-slate-300"],
                  ].map(([label, value, color]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]"
                    >
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Daily adherence data is not available right now.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171526] sm:p-6">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <TrendingUp size={19} />
              <span className="text-sm font-semibold">Last seven days</span>
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
              Weekly adherence
            </h2>

            {weeklySummary ? (
              <>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {weeklySummary.adherencePercentage == null
                        ? "—"
                        : `${weeklySummary.adherencePercentage}%`}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Overall adherence
                    </p>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {weeklySummary.taken}/{weeklySummary.totalScheduled} taken
                  </p>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
                    style={{
                      width: `${weeklySummary.adherencePercentage ?? 0}%`,
                    }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-7 gap-2">
                  {(weeklySummary.days || []).map((day) => (
                    <div
                      key={day.date}
                      className="min-w-0 text-center"
                      title={`${day.date}: ${
                        day.adherencePercentage == null
                          ? "No eligible doses"
                          : `${day.adherencePercentage}% adherence`
                      }`}
                    >
                      <div className="flex h-24 items-end justify-center rounded-lg bg-slate-50 p-1.5 dark:bg-white/[0.03]">
                        <div
                          className="w-full max-w-5 rounded-md bg-gradient-to-t from-violet-600 to-indigo-500"
                          style={{
                            height: `${
                              day.adherencePercentage == null
                                ? 4
                                : Math.max(day.adherencePercentage, 5)
                            }%`,
                            opacity:
                              day.adherencePercentage == null ? 0.2 : 1,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 sm:text-xs">
                        {new Date(`${day.date}T12:00:00`).toLocaleDateString(
                          undefined,
                          { weekday: "short" }
                        )}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 sm:text-xs">
                        {day.adherencePercentage == null
                          ? "—"
                          : `${day.adherencePercentage}%`}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                Weekly adherence data is not available right now.
              </p>
            )}
          </div>
        </section>

        {/* Dose history */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#171526]">
          <div className="border-b border-slate-100 p-4 dark:border-white/10 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <History size={18} />
                  <span className="text-sm font-semibold">Medication activity</span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">
                  Dose history
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Showing up to 100 dose records from your backend.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="date"
                  value={historyDate}
                  onChange={(event) => setHistoryDate(event.target.value)}
                  aria-label="Filter dose history by date"
                  className={inputClass}
                />
                <select
                  value={historyFilter}
                  onChange={(event) => setHistoryFilter(event.target.value)}
                  aria-label="Filter dose history by status"
                  className={inputClass}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="taken">Taken</option>
                  <option value="missed">Missed</option>
                  <option value="skipped">Skipped</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState message="Loading dose history..." />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              title="No dose records found"
              description="Dose records will appear here after your schedule generates doses or you record them."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Medication</th>
                    <th className="px-5 py-3 font-semibold">Scheduled for</th>
                    <th className="px-5 py-3 font-semibold">Dosage</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Update status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredHistory.map((dose) => (
                    <tr key={dose.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {dose.medication?.name || "Medication"}
                        </p>
                        {dose.medication?.frequency && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {dose.medication.frequency}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {formatDateTime(dose.scheduledFor)}
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {dose.medication?.dosage || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                            dose.status
                          )}`}
                        >
                          {dose.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={dose.status}
                            disabled={busyDoseId === dose.id}
                            onChange={(event) =>
                              updateDoseStatus(dose, event.target.value)
                            }
                            aria-label={`Update status for ${
                              dose.medication?.name || "dose"
                            }`}
                            className="max-w-32 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 outline-none focus:border-violet-500 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-slate-200"
                          >
                            {DOSE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          {busyDoseId === dose.id && (
                            <Loader2
                              size={15}
                              className="animate-spin text-violet-600"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="px-1 text-xs leading-5 text-slate-400 dark:text-slate-500">
          Use medications only as prescribed by your clinician or pharmacist.
          VitaAI tracks the schedule you enter; it does not determine the
          appropriate medication or dosage for you.
        </p>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-[#0f0e1b] dark:text-white";

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-violet-500" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-700 dark:text-slate-200">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

function LoadingState({ message }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-8">
      <Loader2 size={26} className="animate-spin text-violet-600" />
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  );
}

function EmptyState({ title, description, onAction }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-3 rounded-2xl bg-violet-100 p-4 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
        <ClipboardList size={27} />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} />
          Add medication
        </button>
      )}
    </div>
  );
}
