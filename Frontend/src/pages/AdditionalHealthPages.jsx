
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Languages,
  LoaderCircle,
  Mic,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Upload,
} from "lucide-react";
import api from "../components/lib/api";

const styles = {
  page: "min-h-screen bg-[#f8f9fc] px-4 py-6 text-[#17172b] dark:bg-[#0d0c19] dark:text-white sm:px-8",
  card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]",
  button:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#7029d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/5",
  input:
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-white/10 dark:bg-[#151326] dark:text-white dark:focus:ring-purple-900",
};

const panel =
  "rounded-xl border border-slate-200 p-4 dark:border-white/10";
const muted = "text-sm text-slate-500 dark:text-slate-400";
const sectionTitle = "mb-4 text-lg font-bold";

function PageShell({
  eyebrow = "VitaAI health workspace",
  title,
  description,
  icon: Icon = FileText,
  children,
  onRefresh,
  loading = false,
}) {
  const HeaderIcon = Icon || FileText;

  return (
    <main className={styles.page}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
              {eyebrow}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                <HeaderIcon size={25} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h1>
            </div>

            {description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>

          {onRefresh && (
            <button
              type="button"
              className={styles.button}
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}

function Notice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
      }`}
    >
      {error ? <AlertCircle size={18} /> : <Check size={18} />}
      <span>{error || success}</span>
    </div>
  );
}

function getMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getItems(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.followUps)) return payload.followUps;
  if (Array.isArray(payload?.summaries)) return payload.summaries;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.notifications)) {
    return payload.data.notifications;
  }
  if (Array.isArray(payload?.data?.reports)) {
    return payload.data.reports;
  }

  return [];
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function EmptyState({ message = "Nothing to show yet" }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center dark:border-white/15">
      <FileText className="mx-auto mb-3 text-slate-400" size={30} />
      <h3 className="font-semibold">{message}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Records will appear here when available from your account.
      </p>
    </div>
  );
}

function RecordList({ items, loading, emptyMessage }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
        <LoaderCircle className="animate-spin" size={18} />
        Loading records…
      </div>
    );
  }

  if (!items.length) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/10">
      {items.map((item, index) => (
        <article
          key={item.id || item._id || index}
          className="py-4 first:pt-0 last:pb-0"
        >
          <h3 className="font-semibold">
            {item.title ||
              item.name ||
              item.fileName ||
              item.type ||
              item.subject ||
              `Record ${index + 1}`}
          </h3>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-400">
            {[
              item.summary,
              item.description,
              item.message,
              item.status,
            ]
              .filter(Boolean)
              .join(" · ") ||
              "Record details are available in the saved record."}
          </p>
          {formatDate(item.createdAt || item.created_at) && (
            <p className="mt-2 text-xs text-slate-400">
              {formatDate(item.createdAt || item.created_at)}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function DataPage({ config }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(config.endpoint);
      setItems(getItems(response));
    } catch (err) {
      setError(
        getMessage(err, `Unable to load ${config.title.toLowerCase()}.`)
      );
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, config.title]);

  useEffect(() => {
    load();
  }, [load]);

  async function downloadPdf() {
    if (!config.pdfEndpoint) return;

    setError("");
    let url;

    try {
      const response = await api.get(config.pdfEndpoint, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers?.["content-type"] || "application/pdf",
      });

      url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vitaai-health-report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(getMessage(err, "Unable to download the report PDF."));
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  }

  return (
    <PageShell
      title={config.title}
      description={config.description}
      icon={config.icon}
      onRefresh={load}
      loading={loading}
    >
      <Notice error={error} />
      <section className={styles.card}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              {config.listTitle || "Your records"}
            </h2>
            <p className={`mt-1 ${muted}`}>
              {items.length} item{items.length === 1 ? "" : "s"}
            </p>
          </div>

          {config.pdfEndpoint && (
            <button
              type="button"
              className={styles.secondary}
              onClick={downloadPdf}
              disabled={loading}
            >
              <Download size={16} />
              Download PDF
            </button>
          )}
        </div>
        <RecordList
          items={items}
          loading={loading}
          emptyMessage={config.emptyMessage}
        />
      </section>
    </PageShell>
  );
}

/* -------------------- HEALTH REPORTS -------------------- */

function AnalysisList({ items, emptyMessage }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className={muted}>{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="rounded-xl bg-slate-50 p-4 dark:bg-white/[0.04]">
          {item !== null && typeof item === "object" ? (
            <div className="space-y-2">
              {Object.entries(item).map(([key, value]) => (
                <div key={key}>
                  <h4 className="text-sm font-semibold capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {value == null
                      ? "Not available"
                      : typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {String(item ?? "Not available")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HealthReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/health-report");
      const data = response?.data?.data;

      if (!data || typeof data !== "object") {
        throw new Error("The server returned an invalid health report.");
      }

      setReport(data);
    } catch (err) {
      setError(getMessage(err, "Unable to load your health report."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    let url;

    try {
      const response = await api.get("/health-report/pdf", {
        responseType: "blob",
      });

      const contentType = response.headers?.["content-type"] || "";

      if (contentType.includes("application/json")) {
        throw new Error("The server returned an error instead of a PDF.");
      }

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "vitaai-health-report.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setError(getMessage(err, "Unable to download the health report PDF."));
    } finally {
      if (url) URL.revokeObjectURL(url);
      setDownloading(false);
    }
  }

  const summary = report?.summary || {};
  const analysis = report?.detailedAnalysis || {};
  const assessments = Array.isArray(report?.assessments)
    ? report.assessments
    : [];
  const riskDistribution = summary.riskDistribution || {};
  const severityDistribution = summary.severityDistribution || {};

  return (
    <PageShell
      title="Health Reports"
      description="Review your saved assessments, health trends, AI analysis, recommendations, and warning signs."
      icon={FileText}
      onRefresh={loadReport}
      loading={loading}
    >
      <Notice error={error} />

      {loading ? (
        <section className={styles.card}>
          <div className="flex items-center gap-3 py-8">
            <LoaderCircle size={22} className="animate-spin text-purple-600" />
            <p>Loading your health report…</p>
          </div>
        </section>
      ) : report ? (
        <div className="space-y-5">
          <section className={styles.card}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold">Your Health Report</h2>
                <p className={`mt-2 ${muted}`}>
                  Generated: {formatDate(report.generatedAt) || "Just now"}
                </p>
                <p className={`mt-1 ${muted}`}>
                  Period: {report.period?.from || "All available dates"}
                  {" – "}
                  {report.period?.to || "Present"}
                </p>
              </div>

              <button
                type="button"
                className={styles.button}
                onClick={downloadPdf}
                disabled={downloading}
              >
                {downloading ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Download size={17} />
                )}
                {downloading ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>Report overview</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className={panel}>
                <Activity className="mb-3 text-purple-600" size={22} />
                <p className={muted}>Total assessments</p>
                <p className="mt-1 text-2xl font-bold">
                  {summary.totalAssessments ?? assessments.length}
                </p>
              </div>
              <div className={panel}>
                <CalendarDays className="mb-3 text-purple-600" size={22} />
                <p className={muted}>Average numeric severity</p>
                <p className="mt-1 text-2xl font-bold">
                  {summary.averageSeverity ?? "N/A"}
                </p>
                <p className={`mt-1 ${muted}`}>
                  Only numeric severity values are averaged.
                </p>
              </div>
              <div className={panel}>
                <ShieldCheck className="mb-3 text-purple-600" size={22} />
                <p className={muted}>Records with numeric severity</p>
                <p className="mt-1 text-2xl font-bold">
                  {summary.recordsWithNumericSeverity ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 font-semibold">Risk distribution</h3>
                {Object.keys(riskDistribution).length ? (
                  <ul className="space-y-2">
                    {Object.entries(riskDistribution).map(([risk, count]) => (
                      <li key={risk} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/[0.04]">
                        <span className="capitalize">{risk.replace(/[_-]/g, " ")}</span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={muted}>No risk data available.</p>
                )}
              </div>

              <div>
                <h3 className="mb-2 font-semibold">Severity distribution</h3>
                {Object.keys(severityDistribution).length ? (
                  <ul className="space-y-2">
                    {Object.entries(severityDistribution).map(([severity, count]) => (
                      <li key={severity} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-white/[0.04]">
                        <span className="capitalize">{severity}</span>
                        <span className="font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={muted}>
                    No text-based severity distribution was returned.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>AI health overview</h2>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
              {analysis.overview ||
                "AI overview is not available for this report."}
            </p>
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>
              Assessment history ({assessments.length})
            </h2>
            {assessments.length === 0 ? (
              <EmptyState message="No saved assessments found for this period" />
            ) : (
              <div className="space-y-3">
                {assessments.map((item, index) => (
                  <article key={item.id || index} className={panel}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Assessment {index + 1}</h3>
                        <p className={`mt-1 ${muted}`}>
                          {formatDate(item.createdAt) || "Date unavailable"}
                        </p>
                      </div>
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold capitalize text-purple-800 dark:bg-purple-400/10 dark:text-purple-200">
                        Risk: {item.riskLevel || "Unknown"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold">Reported symptoms</h4>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {item.symptoms || "Not provided"}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">Severity</h4>
                        <p className={`mt-1 ${muted}`}>
                          {item.severity || "Not provided"}
                        </p>
                      </div>
                      {item.aiSummary && (
                        <div>
                          <h4 className="text-sm font-semibold">AI summary</h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.aiSummary}
                          </p>
                        </div>
                      )}
                      {item.recommendations && (
                        <div>
                          <h4 className="text-sm font-semibold">Recommendations</h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {item.recommendations}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>Possible explanations</h2>
            <AnalysisList
              items={analysis.possibleExplanations}
              emptyMessage="No possible explanations were returned. Your records may be insufficient."
            />
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>Recommendations</h2>
            <AnalysisList
              items={analysis.recommendations}
              emptyMessage="No additional recommendations are available."
            />
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>Warning signs</h2>
            <AnalysisList
              items={analysis.warningSigns}
              emptyMessage="No warning signs were returned by the analysis."
            />
          </section>

          <section className={styles.card}>
            <h2 className={sectionTitle}>Questions for your doctor</h2>
            <AnalysisList
              items={analysis.questionsForDoctor}
              emptyMessage="No questions were generated."
            />
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <AlertCircle size={18} />
              Important health information
            </div>
            {analysis.disclaimer ||
              report.disclaimer ||
              "This report summarizes recorded information and is not a medical diagnosis."}
            <p className="mt-2">
              AI-generated information can be inaccurate. Do not use a risk
              label or this report to rule out an emergency. Seek urgent
              medical care for severe, sudden, or rapidly worsening symptoms.
            </p>
          </section>
        </div>
      ) : (
        <section className={styles.card}>
          <EmptyState message="Your health report could not be loaded" />
          <button
            type="button"
            className={`${styles.button} mt-4`}
            onClick={loadReport}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      )}
    </PageShell>
  );
}

/* -------------------- LAB REPORTS -------------------- */

export function LabReports() {
  return (
    <DataPage
      config={{
        title: "Lab Reports",
        description: "Review your available laboratory report records.",
        endpoint: "/lab-reports",
        icon: Activity,
        listTitle: "Your lab reports",
        emptyMessage: "No lab reports available yet",
      }}
    />
  );
}

/* -------------------- DOCTOR SUMMARIES -------------------- */

export function DoctorSummaries() {
  const [form, setForm] = useState({
    symptoms: "",
    duration: "",
    severity: "mild",
    additionalInformation: "",
    language: "en",
  });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function generateSummary(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSummary(null);

    const symptoms = form.symptoms.trim();

    if (!symptoms) {
      setError("Please enter your symptoms.");
      return;
    }
    if (symptoms.length > 3000) {
      setError("Symptoms must not exceed 3000 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/doctor-summary", {
        symptoms,
        duration: form.duration.trim(),
        severity: form.severity,
        additionalInformation: form.additionalInformation.trim(),
        language: form.language,
      });

      const data = response?.data?.data;
      if (!data) throw new Error("The server did not return a summary.");

      setSummary(data);
      setSuccess("Doctor-ready summary generated successfully.");
    } catch (err) {
      setError(getMessage(err, "Unable to generate the summary."));
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (!summary) return;

    const text = [
      summary.title,
      ...(summary.sections || []).map(
        (section) => `${section.label}: ${section.value}`
      ),
      summary.disclaimer,
    ].filter(Boolean).join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setSuccess("Summary copied to clipboard.");
      setError("");
    } catch {
      setError("Unable to copy the summary. Please copy it manually.");
    }
  }

  return (
    <PageShell
      title="Doctor Summaries"
      description="Create a concise summary of your reported symptoms for discussion with a qualified clinician."
      icon={Stethoscope}
    >
      <Notice error={error} success={success} />

      <section className={styles.card}>
        <h2 className="text-lg font-bold">Generate a summary</h2>
        <p className={`mt-2 ${muted}`}>
          Enter the information you want to share with your healthcare professional.
        </p>

        <form onSubmit={generateSummary} className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="summary-symptoms">
              Symptoms <span className="text-red-500">*</span>
            </label>
            <textarea
              id="summary-symptoms"
              name="symptoms"
              value={form.symptoms}
              onChange={updateField}
              maxLength={3000}
              required
              rows={4}
              className={styles.input}
              placeholder="Describe the symptoms you are experiencing..."
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {form.symptoms.length}/3000
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="summary-duration">
                Duration
              </label>
              <input
                id="summary-duration"
                name="duration"
                value={form.duration}
                onChange={updateField}
                className={styles.input}
                placeholder="e.g. Since yesterday"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="summary-severity">
                Severity
              </label>
              <select
                id="summary-severity"
                name="severity"
                value={form.severity}
                onChange={updateField}
                className={styles.input}
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="summary-history">
              Additional information
            </label>
            <textarea
              id="summary-history"
              name="additionalInformation"
              value={form.additionalInformation}
              onChange={updateField}
              rows={3}
              className={styles.input}
              placeholder="Relevant medical history, medicines, allergies, or other details..."
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium" htmlFor="summary-language">
              <Languages size={16} />
              Summary language
            </label>
            <select
              id="summary-language"
              name="language"
              value={form.language}
              onChange={updateField}
              className={styles.input}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Stethoscope size={17} />
            )}
            {loading ? "Generating summary…" : "Generate doctor summary"}
          </button>
        </form>
      </section>

      {summary && (
        <section className={`${styles.card} mt-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {summary.title || "Doctor-Ready Health Summary"}
              </h2>
              {summary.generatedAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Generated {formatDate(summary.generatedAt)}
                </p>
              )}
            </div>
            <button type="button" className={styles.secondary} onClick={copySummary}>
              <Copy size={16} />
              Copy summary
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {(summary.sections || []).map((section, index) => (
              <div key={`${section.label || "section"}-${index}`} className="rounded-xl bg-slate-50 p-4 dark:bg-white/[0.04]">
                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {section.label}
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {section.value}
                </p>
              </div>
            ))}
          </div>

          {summary.disclaimer && (
            <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              {summary.disclaimer}
            </p>
          )}
        </section>
      )}
    </PageShell>
  );
}

/* -------------------- NOTIFICATIONS -------------------- */

export function NotificationsFollowUps() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/notifications");
      setNotifications(getItems(response));
    } catch (err) {
      setError(getMessage(err, "Unable to load notifications."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function isRead(notification) {
    return Boolean(notification.read || notification.isRead || notification.readAt);
  }

  async function markRead(notification) {
    const id = notification.id || notification._id;
    if (!id) {
      setError("This notification has no ID.");
      return;
    }

    setBusyId(id);
    setError("");
    setSuccess("");

    try {
      await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
      setNotifications((current) =>
        current.map((item) =>
          (item.id || item._id) === id
            ? { ...item, isRead: true, read: true }
            : item
        )
      );
      setSuccess("Notification marked as read.");
    } catch (err) {
      setError(getMessage(err, "Unable to mark the notification as read."));
    } finally {
      setBusyId("");
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    setError("");
    setSuccess("");

    try {
      await api.patch("/notifications/read-all");
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true, read: true }))
      );
      setSuccess("All notifications marked as read.");
    } catch (err) {
      setError(getMessage(err, "Unable to mark all notifications as read."));
    } finally {
      setMarkingAll(false);
    }
  }

  const unreadCount = notifications.filter((item) => !isRead(item)).length;

  return (
    <PageShell
      title="Notifications & Follow-ups"
      description="Review your account notifications and mark completed notifications as read."
      icon={Bell}
      onRefresh={load}
      loading={loading}
    >
      <Notice error={error} success={success} />

      <section className={styles.card}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className={`mt-1 ${muted}`}>
              {notifications.length} total · {unreadCount} unread
            </p>
          </div>
          <button
            type="button"
            className={styles.secondary}
            onClick={markAllRead}
            disabled={loading || markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <CheckCheck size={16} />
            )}
            Mark all read
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" />
            Loading notifications…
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState message="No notifications yet" />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const id = notification.id || notification._id || index;
              const read = isRead(notification);

              return (
                <article key={id} className={`rounded-xl border p-4 ${
                  read
                    ? "border-slate-200 dark:border-white/10"
                    : "border-purple-200 bg-purple-50/70 dark:border-purple-400/20 dark:bg-purple-400/[0.06]"
                }`}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row">
                    <div className="flex gap-3">
                      <Bell size={19} className="mt-0.5 text-purple-600 dark:text-purple-300" />
                      <div>
                        <h3 className="font-semibold">
                          {notification.title || notification.subject || notification.type || "Notification"}
                        </h3>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-400">
                          {notification.message || notification.description || notification.body || "No additional details."}
                        </p>
                        {formatDate(notification.createdAt || notification.created_at || notification.date) && (
                          <p className="mt-2 text-xs text-slate-400">
                            {formatDate(notification.createdAt || notification.created_at || notification.date)}
                          </p>
                        )}
                      </div>
                    </div>

                    {!read && (notification.id || notification._id) && (
                      <button
                        type="button"
                        className={`${styles.secondary} self-start`}
                        onClick={() => markRead(notification)}
                        disabled={busyId === id}
                      >
                        {busyId === id ? (
                          <LoaderCircle size={15} className="animate-spin" />
                        ) : (
                          <Check size={15} />
                        )}
                        Mark read
                      </button>
                    )}
                    {read && (
                      <span className="self-start text-xs font-medium text-emerald-600 dark:text-emerald-300">
                        Read
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={`${styles.card} mt-5`}>
        <div className="flex items-start gap-3">
          <CalendarDays className="mt-1 text-purple-600 dark:text-purple-300" size={20} />
          <div>
            <h2 className="font-semibold">Follow-up reminders</h2>
            <p className={`mt-1 ${muted}`}>
              Follow-up records are managed separately from notifications. Use the Reminders page to view scheduled reminders.
            </p>
            <a href="/reminders" className="mt-3 inline-flex text-sm font-semibold text-purple-700 hover:underline dark:text-purple-300">
              Open reminders
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* -------------------- PRIVACY CONTROLS -------------------- */

export function PrivacyControls() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/privacy");
      const data = response?.data?.data ?? response?.data;

      if (typeof data?.privateMode !== "boolean") {
        throw new Error("Invalid privacy settings returned by the server.");
      }

      setSettings(data);
    } catch (err) {
      setError(getMessage(err, "Unable to load privacy settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const togglePrivateMode = async () => {
    if (updating || loading || typeof settings?.privateMode !== "boolean") {
      return;
    }

    const nextValue = !settings.privateMode;
    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch("/privacy", {
        privateMode: nextValue,
      });

      const data = response?.data?.data ?? response?.data;

      if (typeof data?.privateMode !== "boolean") {
        throw new Error("The server did not confirm the updated setting.");
      }

      setSettings(data);
      setSuccess(
        response?.data?.message || "Privacy settings updated successfully."
      );
    } catch (err) {
      setError(getMessage(err, "Unable to update privacy settings."));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <PageShell
      title="Privacy Controls"
      eyebrow="Account & data"
      description="Review and manage the privacy settings available for your VitaAI account."
      icon={ShieldCheck}
      onRefresh={load}
      loading={loading}
    >
      <Notice error={error} />

      {success && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {success}
        </div>
      )}

      <section className={styles.card}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Privacy settings</h2>
            <p className={`mt-2 text-sm ${muted}`}>
              Choose whether your conversation history is passed to the
              VitaAI health assistant.
            </p>
          </div>

          <ShieldCheck
            className="shrink-0 text-violet-600 dark:text-violet-400"
            size={25}
          />
        </div>

        {loading ? (
          <p className={`mt-5 text-sm ${muted}`}>
            Loading privacy settings…
          </p>
        ) : settings ? (
          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Private Mode</p>
                <p className={`mt-1 text-sm ${muted}`}>
                  {settings.privateMode
                    ? "Enabled — submitted chat history is omitted from the assistant's history input."
                    : "Disabled — submitted chat history may be passed to the assistant."}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.privateMode}
                aria-label="Toggle Private Mode"
                disabled={updating}
                onClick={togglePrivateMode}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-[#171526] ${
                  settings.privateMode
                    ? "bg-violet-600"
                    : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    settings.privateMode
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {updating && (
              <p className={`mt-3 text-sm ${muted}`} role="status">
                Saving privacy settings…
              </p>
            )}

            <p className={`mt-4 text-xs leading-5 ${muted}`}>
              Private Mode does not necessarily prevent database storage,
              application logs, or retention by other services. Those
              behaviors must be handled separately by the backend.
            </p>
          </div>
        ) : (
          <p className={`mt-4 text-sm ${muted}`}>
            No privacy settings were returned by the server. Use Refresh to
            try again.
          </p>
        )}
      </section>
    </PageShell>
  );
}


/* -------------------- VOICE TRANSCRIPTION -------------------- */

export function VoiceTranscription() {
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recorder, setRecorder] = useState(null);

  async function startRecording() {
    setError("");
    setSuccess("");

    let stream;

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeCandidates = ["audio/webm", "audio/mp4", "audio/ogg"];
      const supportedMime = mimeCandidates.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const mediaRecorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onerror = () => {
        setError("An error occurred while recording audio.");
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setRecorder(null);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const extension = mimeType.includes("mp4")
          ? "m4a"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";

        setFile(new File(chunks, `voice-recording.${extension}`, { type: mimeType }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setRecorder(null);
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      setError(getMessage(err, "Could not access your microphone. Check browser permissions."));
    }
  }

  async function transcribe() {
    if (!file) {
      setError("Record audio or select an audio file first.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Audio file must be 10 MB or smaller.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    setTranscript("");

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await api.post("/voice/transcribe", formData);
      const payload = response?.data;
      const text =
        payload?.data?.transcript ||
        payload?.data?.text ||
        payload?.transcript ||
        payload?.text ||
        "";

      if (typeof text !== "string" || !text.trim()) {
        throw new Error("The server did not return a transcript. Check the backend transcription service.");
      }

      setTranscript(text.trim());
      setSuccess(payload?.message || "Audio transcribed successfully.");
    } catch (err) {
      setError(getMessage(err, "Transcription failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function copyTranscript() {
    try {
      await navigator.clipboard.writeText(transcript);
      setSuccess("Transcript copied to clipboard.");
      setError("");
    } catch {
      setError("Unable to copy the transcript. Please copy it manually.");
    }
  }

  return (
    <PageShell
      title="Voice Transcription"
      eyebrow="Voice tools"
      description="Record a spoken symptom description or upload an audio file to turn speech into text."
      icon={Mic}
    >
      <Notice error={error} success={success} />

      <section className={styles.card}>
        <h2 className="text-lg font-bold">Add audio</h2>
        <p className={`mt-2 ${muted}`}>
          Audio uploads are limited to 10 MB. The backend must support the selected audio format. Microphone access usually requires localhost or HTTPS.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {!recording ? (
            <button type="button" className={styles.button} onClick={startRecording} disabled={busy}>
              <Mic size={17} />
              Start recording
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                if (recorder && recorder.state !== "inactive") recorder.stop();
              }}
            >
              Stop recording
            </button>
          )}

          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-white/10 ${busy || recording ? "pointer-events-none opacity-50" : ""}`}>
            <Upload size={17} />
            Choose audio
            <input
              className="hidden"
              type="file"
              accept="audio/*,.webm,.wav,.mp3,.m4a,.ogg,.flac,.aac"
              disabled={busy || recording}
              onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                setFile(selected);
                setTranscript("");
                setError("");
                setSuccess("");
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {file && (
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/[0.04]">
            <p className="break-all font-medium">{file.name}</p>
            <p className="mt-1 text-xs text-slate-500">
              {Math.ceil(file.size / 1024)} KB
            </p>
          </div>
        )}

        <button
          type="button"
          className={`${styles.button} mt-5`}
          onClick={transcribe}
          disabled={busy || recording || !file}
        >
          {busy ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Mic size={17} />
          )}
          {busy ? "Transcribing…" : "Transcribe audio"}
        </button>
      </section>

      <section className={`${styles.card} mt-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Transcript</h2>
          {transcript && (
            <button type="button" className={styles.secondary} onClick={copyTranscript}>
              <Copy size={16} />
              Copy transcript
            </button>
          )}
        </div>

        {transcript ? (
          <p className="mt-4 whitespace-pre-wrap break-words leading-7">{transcript}</p>
        ) : (
          <p className={`mt-3 ${muted}`}>
            Your transcription will appear here after the backend successfully processes the audio.
          </p>
        )}
      </section>
    </PageShell>
  );
}
