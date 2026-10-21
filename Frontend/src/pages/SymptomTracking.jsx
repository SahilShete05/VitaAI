
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import api from "../components/lib/api";

const SEVERITIES = ["mild", "moderate", "severe"];

const SEVERITY_STYLES = {
  mild: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  moderate: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  severe: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    bar: "bg-rose-500",
  },
};

const toDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitialRange = () => {
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 29);

  return {
    from: toDateInput(start),
    to: toDateInput(today),
  };
};

const getRecords = (response) => {
  const body = response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.assessments)) return body.assessments;
  if (Array.isArray(body?.history)) return body.history;

  return [];
};

const formatDate = (value, options = {}) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: options.year === false ? undefined : "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizeSeverity = (severity) => {
  if (typeof severity !== "string") return "";
  const value = severity.trim().toLowerCase();
  return SEVERITIES.includes(value) ? value : "";
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

const SymptomTracking = () => {
  const initialRange = useMemo(() => getInitialRange(), []);

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [assessments, setAssessments] = useState([]);
  const [trendSummary, setTrendSummary] = useState(null);
  const [dailyTrends, setDailyTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTrackingData = useCallback(async () => {
    if (!from || !to) {
      setError("Please select both start and end dates.");
      setLoading(false);
      return;
    }

    if (from > to) {
      setError("The start date cannot be after the end date.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = { from, to };

      const [historyResult, trendsResult] = await Promise.allSettled([
        api.get("/assessments/history", { params }),
        api.get("/assessments/trends", { params }),
      ]);

      if (historyResult.status === "rejected") {
        throw historyResult.reason;
      }

      const records = getRecords(historyResult.value);
      setAssessments(records);

      if (trendsResult.status === "fulfilled") {
        const trendBody = trendsResult.value?.data;
        setTrendSummary(trendBody?.summary ?? null);
        setDailyTrends(
          Array.isArray(trendBody?.dailyTrends)
            ? trendBody.dailyTrends
            : []
        );
      } else {
        // History is still useful if the optional trends request fails.
        setTrendSummary(null);
        setDailyTrends([]);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to load symptom tracking data. Please try again."
      );
      setAssessments([]);
      setTrendSummary(null);
      setDailyTrends([]);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData, refreshKey]);

  const severityCounts = useMemo(() => {
    const counts = { mild: 0, moderate: 0, severe: 0, other: 0 };

    assessments.forEach((assessment) => {
      const severity = normalizeSeverity(assessment.severity);
      if (severity) {
        counts[severity] += 1;
      } else {
        counts.other += 1;
      }
    });

    return counts;
  }, [assessments]);

  const chartDays = useMemo(() => {
    const activityByDate = new Map();

    dailyTrends.forEach((day) => {
      if (day?.date) {
        activityByDate.set(String(day.date).slice(0, 10), Number(day.records) || 0);
      }
    });

    // Fill the selected range with zero-activity days so gaps are visible.
    const days = [];
    const cursor = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);

    if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }

    while (cursor <= end && days.length < 366) {
      const key = toDateInput(cursor);
      days.push({
        date: key,
        records: activityByDate.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [dailyTrends, from, to]);

  const maxDailyRecords = Math.max(
    1,
    ...chartDays.map((day) => day.records)
  );

  const totalAssessments = assessments.length;
  const severeCount = severityCounts.severe;
  const moderateCount = severityCounts.moderate;
  const mildCount = severityCounts.mild;

  const highestSeverity = severeCount
    ? "Severe"
    : moderateCount
      ? "Moderate"
      : mildCount
        ? "Mild"
        : "Not recorded";

  const numericAverage = trendSummary?.averageSeverity;
  const hasNumericAverage =
    numericAverage !== null &&
    numericAverage !== undefined &&
    Number.isFinite(Number(numericAverage));

  const hasRecords = assessments.length > 0;

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-slate-800 dark:bg-[#0d0c19] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-300">
              <Activity size={17} />
              VitaAI Health Insights
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Symptom Tracking
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Review your recorded symptoms, monitor assessment activity, and
              understand how your reported symptom severity changes over time.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#171526] dark:text-slate-200 dark:hover:bg-white/5 sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Date filters */}
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Reporting period
            </h2>
          </div>

          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              setRefreshKey((value) => value + 1);
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                From
              </span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">
                To
              </span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                max={toDateInput(new Date())}
                onChange={(event) => setTo(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-[#100f1d] dark:text-white"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="self-end rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply filters
            </button>
          </form>
        </Card>

        {/* Errors */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">{error}</div>
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="shrink-0 text-sm font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500 dark:border-white/10 dark:bg-[#171526] dark:text-slate-400">
            <RefreshCw size={18} className="animate-spin text-violet-500" />
            Loading your symptom history...
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Total assessments
                    </p>
                    <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                      {totalAssessments}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      In selected date range
                    </p>
                  </div>
                  <div className="rounded-xl bg-violet-100 p-3 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                    <Activity size={21} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Severe reports
                    </p>
                    <p className="mt-3 text-3xl font-bold text-rose-600 dark:text-rose-300">
                      {severeCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Marked severe by the user
                    </p>
                  </div>
                  <div className="rounded-xl bg-rose-100 p-3 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                    <ShieldAlert size={21} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Latest assessment
                    </p>
                    <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
                      {hasRecords
                        ? formatDate(assessments[0]?.createdAt)
                        : "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {hasRecords
                        ? formatDateTime(assessments[0]?.createdAt)
                        : "No records in this period"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-sky-100 p-3 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                    <Clock3 size={21} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Highest reported level
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                      {highestSeverity}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Based on recorded severity labels
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <TrendingUp size={21} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Activity chart and severity distribution */}
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <Card>
                <SectionHeading
                  icon={TrendingUp}
                  title="Daily assessment activity"
                  subtitle="Number of assessments recorded per day"
                />

                {chartDays.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No trend data available for this period.
                  </p>
                ) : (
                  <>
                    <div className="flex h-48 items-end gap-1.5 overflow-x-auto border-b border-slate-200 pb-2 dark:border-white/10 sm:gap-2">
                      {chartDays.map((day) => {
                        const height =
                          day.records === 0
                            ? 3
                            : Math.max(
                                8,
                                (day.records / maxDailyRecords) * 100
                              );

                        return (
                          <div
                            key={day.date}
                            title={`${day.date}: ${day.records} assessment(s)`}
                            className="flex h-full min-w-2 flex-1 flex-col items-center justify-end"
                          >
                            {day.records > 0 && (
                              <span className="mb-1 text-[10px] text-slate-500 dark:text-slate-400">
                                {day.records}
                              </span>
                            )}
                            <div
                              className={`w-full max-w-8 rounded-t-md ${
                                day.records > 0
                                  ? "bg-gradient-to-t from-violet-600 to-indigo-400"
                                  : "bg-slate-200 dark:bg-white/10"
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{chartDays[0]?.date}</span>
                      <span>{chartDays[chartDays.length - 1]?.date}</span>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Bars show assessment frequency, not medical improvement
                      or worsening.
                    </p>
                  </>
                )}
              </Card>

              <Card>
                <SectionHeading
                  icon={Activity}
                  title="Severity distribution"
                  subtitle="Based on the severity labels in your assessments"
                />

                <div className="space-y-5">
                  {SEVERITIES.map((severity) => {
                    const count = severityCounts[severity];
                    const percentage = totalAssessments
                      ? (count / totalAssessments) * 100
                      : 0;

                    return (
                      <div key={severity}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
                            {severity}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {count} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={`h-full rounded-full transition-all ${
                              SEVERITY_STYLES[severity].bar
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {severityCounts.other > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {severityCounts.other} assessment(s) have no recognized
                      severity label.
                    </p>
                  )}

                  <div className="rounded-xl bg-violet-50 p-3 text-sm leading-5 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">
                    These categories reflect what was recorded, not a clinical
                    risk assessment.
                  </div>
                </div>
              </Card>
            </div>

            {/* History */}
            <Card>
              <SectionHeading
                icon={CalendarDays}
                title="Symptom history"
                subtitle={`${assessments.length} record(s) in the selected period`}
              />

              {!hasRecords ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-white/15">
                  <CheckCircle2
                    size={32}
                    className="mx-auto text-slate-400"
                  />
                  <h3 className="mt-3 font-semibold text-slate-800 dark:text-white">
                    No assessments found
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                    Try a wider date range or create a health assessment to
                    start tracking your symptoms.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.map((assessment, index) => {
                    const severity = normalizeSeverity(assessment.severity);
                    const style = severity
                      ? SEVERITY_STYLES[severity]
                      : null;

                    return (
                      <article
                        key={assessment.id || `${assessment.createdAt}-${index}`}
                        className="rounded-xl border border-slate-200 p-4 transition hover:border-violet-300 dark:border-white/10 dark:hover:border-violet-500/40"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                {formatDateTime(assessment.createdAt)}
                              </span>
                              {severity ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${style.badge}`}
                                >
                                  {severity}
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                  Severity not recorded
                                </span>
                              )}
                            </div>

                            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                              {assessment.symptoms || "No symptom details recorded."}
                            </p>

                            {assessment.aiSummary && (
                              <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-white/[0.04]">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  AI summary
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                                  {assessment.aiSummary}
                                </p>
                              </div>
                            )}

                            {assessment.recommendations && (
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300">
                                  View recommendations
                                </summary>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                                  {assessment.recommendations}
                                </p>
                              </details>
                            )}
                          </div>

                          <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                            {assessment.riskLevel &&
                            assessment.riskLevel !== "unknown" ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 capitalize dark:bg-white/10">
                                <AlertCircle size={13} />
                                {assessment.riskLevel} risk
                              </span>
                            ) : (
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-white/10">
                                Risk not classified
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Numeric severity note */}
            {hasNumericAverage && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                <strong>Numeric severity average:</strong>{" "}
                {Number(numericAverage).toFixed(1)}
                <p className="mt-1 text-xs leading-5 opacity-80">
                  This metric is only meaningful when severity was entered as a
                  numeric score. Your current labels (mild, moderate, severe)
                  are shown separately above.
                </p>
              </div>
            )}

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              VitaAI provides informational support, not a medical diagnosis.
              Seek urgent medical care for severe or rapidly worsening symptoms.
              Do not rely on charts alone to determine whether a symptom is
              dangerous.
            </p>
          </>
        )}
      </div>
    </main>
  );
};

export default SymptomTracking;
