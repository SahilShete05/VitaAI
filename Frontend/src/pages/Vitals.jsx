
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  HeartPulse,
  Plus,
  RefreshCw,
  Scale,
  Thermometer,
  Trash2,
  Droplets,
  Wind,
  X,
} from "lucide-react";
import api from "../components/lib/api";

const VITAL_TYPES = {
  blood_pressure: {
    label: "Blood pressure",
    icon: HeartPulse,
    unit: "mmHg",
    color: "text-rose-600 dark:text-rose-300",
    badge: "bg-rose-100 dark:bg-rose-500/15",
    description: "Record systolic and diastolic pressure.",
  },
  blood_glucose: {
    label: "Blood glucose",
    icon: Droplets,
    unit: "mg/dL",
    color: "text-amber-600 dark:text-amber-300",
    badge: "bg-amber-100 dark:bg-amber-500/15",
    description: "Record your blood glucose level.",
  },
  heart_rate: {
    label: "Heart rate",
    icon: HeartPulse,
    unit: "bpm",
    color: "text-pink-600 dark:text-pink-300",
    badge: "bg-pink-100 dark:bg-pink-500/15",
    description: "Record your heart rate.",
  },
  temperature: {
    label: "Temperature",
    icon: Thermometer,
    unit: "°C",
    color: "text-orange-600 dark:text-orange-300",
    badge: "bg-orange-100 dark:bg-orange-500/15",
    description: "Record your body temperature.",
  },
  weight: {
    label: "Weight",
    icon: Scale,
    unit: "kg",
    color: "text-violet-600 dark:text-violet-300",
    badge: "bg-violet-100 dark:bg-violet-500/15",
    description: "Record your body weight.",
  },
  spo2: {
    label: "Blood oxygen (SpO₂)",
    icon: Wind,
    unit: "%",
    color: "text-sky-600 dark:text-sky-300",
    badge: "bg-sky-100 dark:bg-sky-500/15",
    description: "Record your oxygen saturation.",
  },
};

const UNIT_OPTIONS = {
  blood_pressure: ["mmHg"],
  blood_glucose: ["mg/dL", "mmol/L"],
  heart_rate: ["bpm"],
  temperature: ["°C", "°F"],
  weight: ["kg", "lb"],
  spo2: ["%"],
};

const formatDateTime = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getVitals = (response) => {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.vitals)) return body.vitals;
  return [];
};

const Card = ({ children, className = "" }) => (
  <section
    className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171526] ${className}`}
  >
    {children}
  </section>
);

const SectionHeading = ({ icon: Icon, title, subtitle }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
      <Icon size={20} />
    </div>
    <div>
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

const initialForm = {
  type: "blood_pressure",
  value: "",
  secondaryValue: "",
  unit: "mmHg",
  recordedAt: new Date().toISOString().slice(0, 16),
  notes: "",
};

const Vitals = () => {
  const [vitals, setVitals] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(initialForm);

  const loadVitals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [historyResult, summaryResult] = await Promise.allSettled([
        api.get("/vitals", { params: { limit: 100 } }),
        api.get("/vitals/summary"),
      ]);

      if (historyResult.status === "rejected") {
        throw historyResult.reason;
      }

      setVitals(getVitals(historyResult.value));

      if (summaryResult.status === "fulfilled") {
        const data = summaryResult.value?.data?.data;
        setSummary(Array.isArray(data) ? data : []);
      } else {
        setSummary([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load your vital signs. Please try again."
      );
      setVitals([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVitals();
  }, [loadVitals, refreshKey]);

  const filteredVitals = useMemo(
    () =>
      filter === "all"
        ? vitals
        : vitals.filter((vital) => vital.type === filter),
    [vitals, filter]
  );

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const changeType = (type) => {
    setForm((current) => ({
      ...current,
      type,
      value: "",
      secondaryValue: "",
      unit: UNIT_OPTIONS[type][0],
    }));
  };

  const submitVital = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const value = Number(form.value);
    const secondaryValue =
      form.type === "blood_pressure"
        ? Number(form.secondaryValue)
        : undefined;

    if (!form.value || !Number.isFinite(value) || value <= 0) {
      setError("Enter a valid value greater than zero.");
      return;
    }

    if (
      form.type === "blood_pressure" &&
      (!form.secondaryValue ||
        !Number.isFinite(secondaryValue) ||
        secondaryValue <= 0)
    ) {
      setError("Enter valid systolic and diastolic pressure values.");
      return;
    }

    if (!form.recordedAt || Number.isNaN(new Date(form.recordedAt).getTime())) {
      setError("Choose a valid date and time for this reading.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        type: form.type,
        value,
        unit: form.unit,
        recordedAt: new Date(form.recordedAt).toISOString(),
        notes: form.notes.trim() || undefined,
        ...(form.type === "blood_pressure" ? { secondaryValue } : {}),
      };

      const response = await api.post("/vitals", payload);
      const created = response?.data?.data;

      setNotice(response?.data?.message || "Vital reading saved successfully.");
      setShowForm(false);
      setForm({
        ...initialForm,
        recordedAt: new Date().toISOString().slice(0, 16),
      });

      if (created?.id) {
        setVitals((current) => [
          created,
          ...current.filter((item) => item.id !== created.id),
        ]);
      }

      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to save this reading. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteVital = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this vital reading? This cannot be undone.")) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingId(id);

    try {
      await api.delete(`/vitals/${id}`);
      setVitals((current) => current.filter((item) => item.id !== id));
      setNotice("Vital reading deleted.");
      setRefreshKey((value) => value + 1);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to delete this reading. Please try again."
      );
    } finally {
      setDeletingId("");
    }
  };

  const getVitalDisplay = (vital) => {
    if (vital.type === "blood_pressure") {
      return `${vital.value}/${vital.secondaryValue ?? "—"} ${vital.unit || "mmHg"}`;
    }

    return `${vital.value} ${vital.unit || VITAL_TYPES[vital.type]?.unit || ""}`;
  };

  const getSummaryDisplay = (item) => {
    if (!item?.latest) return "No readings yet";

    const latest = item.latest;
    if (item.type === "blood_pressure") {
      return `${latest.value}/${latest.secondaryValue ?? "—"} ${latest.unit || "mmHg"}`;
    }

    return `${latest.value} ${latest.unit || VITAL_TYPES[item.type]?.unit || ""}`;
  };

  const getChangeDisplay = (item) => {
    const change = item?.change;
    if (!change || change.value === null || change.value === undefined) {
      return "No previous reading";
    }

    const primary = Number(change.value);
    if (!Number.isFinite(primary)) return "Change unavailable";

    if (item.type === "blood_pressure") {
      const secondary =
        change.secondaryValue === null || change.secondaryValue === undefined
          ? ""
          : ` / ${Number(change.secondaryValue) > 0 ? "+" : ""}${change.secondaryValue}`;

      return `${primary > 0 ? "+" : ""}${primary}${secondary} ${item.latest?.unit || "mmHg"}`;
    }

    return `${primary > 0 ? "+" : ""}${primary} ${item.latest?.unit || VITAL_TYPES[item.type]?.unit || ""}`;
  };

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-slate-800 dark:bg-[#0d0c19] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-300">
              <Activity size={17} />
              VitaAI Health Insights
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Vital Signs
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Record and review your vital measurements over time. Your readings
              help you keep a personal health log, but do not replace clinical
              advice.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-[#171526] dark:text-slate-200 dark:hover:bg-white/5"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
                setShowForm((current) => !current);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              {showForm ? <X size={17} /> : <Plus size={17} />}
              {showForm ? "Close form" : "Add reading"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {notice && !error && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}

        {showForm && (
          <Card>
            <SectionHeading
              icon={Plus}
              title="Add a vital reading"
              subtitle="Enter the measurement exactly as shown by your device or healthcare professional."
            />

            <form onSubmit={submitVital} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                    Vital type
                  </span>
                  <select
                    value={form.type}
                    onChange={(event) => changeType(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  >
                    {Object.entries(VITAL_TYPES).map(([type, item]) => (
                      <option key={type} value={type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                    {form.type === "blood_pressure"
                      ? "Systolic (top number)"
                      : "Value"}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0.01"
                    required
                    value={form.value}
                    onChange={(event) => updateForm("value", event.target.value)}
                    placeholder={
                      form.type === "blood_pressure" ? "e.g. 120" : "Enter value"
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  />
                </label>

                {form.type === "blood_pressure" && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                      Diastolic (bottom number)
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0.01"
                      required
                      value={form.secondaryValue}
                      onChange={(event) =>
                        updateForm("secondaryValue", event.target.value)
                      }
                      placeholder="e.g. 80"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                    Unit
                  </span>
                  <select
                    value={form.unit}
                    onChange={(event) => updateForm("unit", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  >
                    {UNIT_OPTIONS[form.type].map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                    Date and time
                  </span>
                  <input
                    type="datetime-local"
                    required
                    value={form.recordedAt}
                    onChange={(event) =>
                      updateForm("recordedAt", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  />
                </label>

                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                    Notes (optional)
                  </span>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="Add context, such as fasting, after exercise, or how you were feeling."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  />
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <RefreshCw size={16} className="animate-spin" />}
                  {saving ? "Saving..." : "Save reading"}
                </button>
              </div>
            </form>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-white/10 dark:bg-[#171526] dark:text-slate-400">
            <RefreshCw size={18} className="animate-spin text-violet-500" />
            Loading your vital signs...
          </div>
        ) : (
          <>
            <section>
              <SectionHeading
                icon={Activity}
                title="Latest measurements"
                subtitle="The most recent reading for each vital type, when available."
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Object.entries(VITAL_TYPES).map(([type, item]) => {
                  const Icon = item.icon;
                  const itemSummary = summary.find((entry) => entry.type === type);
                  const latest = itemSummary?.latest;

                  return (
                    <Card key={type}>
                      <div className="flex items-start justify-between gap-3">
                        <div className={`rounded-xl p-3 ${item.badge} ${item.color}`}>
                          <Icon size={22} />
                        </div>
                        <span className="text-right text-xs text-slate-500 dark:text-slate-400">
                          {latest?.recordedAt
                            ? formatDateTime(latest.recordedAt)
                            : "No reading yet"}
                        </span>
                      </div>

                      <h3 className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {item.label}
                      </h3>
                      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        {getSummaryDisplay(itemSummary)}
                      </p>

                      {itemSummary?.previous && (
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Previous: {getVitalDisplay(itemSummary.previous)}
                        </p>
                      )}

                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
                        Change: {getChangeDisplay(itemSummary)}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <Card>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <SectionHeading
                  icon={CalendarDays}
                  title="Reading history"
                  subtitle={`${filteredVitals.length} reading(s) displayed`}
                />

                <label className="block sm:min-w-56">
                  <span className="sr-only">Filter readings by type</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
                  >
                    <option value="all">All vital types</option>
                    {Object.entries(VITAL_TYPES).map(([type, item]) => (
                      <option key={type} value={type}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredVitals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-white/15">
                  <Activity size={32} className="mx-auto text-slate-400" />
                  <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">
                    No vital readings found
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Add a reading to start keeping track of your measurements.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus size={16} />
                    Add first reading
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVitals.map((vital, index) => {
                    const item = VITAL_TYPES[vital.type];
                    const Icon = item?.icon || Activity;

                    return (
                      <article
                        key={vital.id || `${vital.recordedAt}-${index}`}
                        className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 dark:border-white/10 dark:hover:border-violet-500/40"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <div
                              className={`h-fit rounded-xl p-2.5 ${item?.badge || "bg-slate-100"} ${item?.color || "text-slate-600"}`}
                            >
                              <Icon size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {item?.label || vital.type || "Vital reading"}
                                </h3>
                                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                  {vital.unit || item?.unit || ""}
                                </span>
                              </div>
                              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                                {getVitalDisplay(vital)}
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <Clock3 size={13} />
                                {formatDateTime(vital.recordedAt)}
                              </p>
                              {vital.notes && (
                                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                                  {vital.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => deleteVital(vital.id)}
                            disabled={!vital.id || deletingId === vital.id}
                            aria-label="Delete vital reading"
                            className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-500/20 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          >
                            {deletingId === vital.id ? (
                              <RefreshCw size={15} className="animate-spin" />
                            ) : (
                              <Trash2 size={15} />
                            )}
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
              <AlertCircle size={18} className="mt-1 shrink-0" />
              <p>
                VitaAI stores readings for personal tracking and does not
                diagnose conditions. A single measurement may not tell the
                whole story. Seek urgent medical care for severe symptoms or
                readings that concern you.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Vitals;
