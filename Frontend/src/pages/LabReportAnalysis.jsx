
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  Clipboard,
  FileText,
  Languages,
  LoaderCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import api from "../components/lib/api";

const styles = {
  page: "min-h-screen bg-[#f8f9fc] px-4 py-6 text-[#17172b] dark:bg-[#0d0c19] dark:text-white sm:px-8",
  card: "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-7",
  button:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#7029d9] px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5",
  input:
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-white/10 dark:bg-[#151326] dark:text-white dark:focus:ring-purple-900",
};

const muted = "text-sm text-slate-500 dark:text-slate-400";
const MAX_LENGTH = 15000;

function getMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
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

export default function LabReportAnalysis() {
  const [reportText, setReportText] = useState("");
  const [language, setLanguage] = useState("en");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function analyzeReport(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    const text = reportText.trim();

    if (!text) {
      setError("Please paste your laboratory report before analyzing it.");
      return;
    }

    if (text.length > MAX_LENGTH) {
      setError(`Your report must be ${MAX_LENGTH} characters or fewer.`);
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/lab-reports/analyze", {
        reportText: text,
        language,
      });

      const data = response?.data?.data;

      if (!data?.explanation) {
        throw new Error("The server did not return a report explanation.");
      }

      setResult(data);
      setSuccess("Your lab report has been analyzed successfully.");
    } catch (err) {
      setError(
        getMessage(err, "Unable to analyze the lab report. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        `${result.explanation}\n\n${result.disclaimer || ""}`
      );
      setSuccess("Analysis copied to clipboard.");
      setError("");
    } catch {
      setError("Unable to copy the analysis. Please copy it manually.");
    }
  }

  function resetForm() {
    setReportText("");
    setResult(null);
    setError("");
    setSuccess("");
  }

  return (
    <main className={styles.page}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
              VitaAI health workspace
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                <Activity size={25} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Lab Report Analysis
              </h1>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Understand laboratory results in simpler language. Review
              reported values, reference ranges, and questions you may want to
              discuss with your healthcare professional.
            </p>
          </div>
        </header>

        <Notice error={error} success={success} />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className={styles.card}>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Enter your lab results</h2>
                <p className={`mt-1 ${muted}`}>
                  Paste the text from your laboratory report below.
                </p>
              </div>
            </div>

            <form onSubmit={analyzeReport} className="space-y-5">
              <div>
                <label
                  htmlFor="lab-report-text"
                  className="mb-2 block text-sm font-semibold"
                >
                  Report contents <span className="text-red-500">*</span>
                </label>

                <textarea
                  id="lab-report-text"
                  value={reportText}
                  onChange={(event) => {
                    setReportText(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  rows={13}
                  maxLength={MAX_LENGTH}
                  required
                  className={`${styles.input} min-h-72 resize-y leading-6`}
                  placeholder={`Paste your report here...

Example:
Hemoglobin: 12.5 g/dL
White Blood Cell Count: 7,000 cells/µL
Platelets: 250,000 cells/µL
Fasting Blood Glucose: 95 mg/dL

Include the laboratory's reference ranges when available.`}
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className={muted}>Include units and reference ranges.</p>
                  <p
                    className={`shrink-0 text-xs ${
                      reportText.length >= MAX_LENGTH
                        ? "text-red-500"
                        : "text-slate-400"
                    }`}
                  >
                    {reportText.length.toLocaleString()}/
                    {MAX_LENGTH.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="lab-language"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                >
                  <Languages size={16} className="text-purple-600" />
                  Explanation language
                </label>

                <select
                  id="lab-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className={styles.input}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading || !reportText.trim()}
                  className={styles.button}
                >
                  {loading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {loading ? "Analyzing report…" : "Analyze lab report"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className={styles.secondary}
                >
                  <RotateCcw size={16} />
                  Clear
                </button>
              </div>
            </form>
          </section>

          <div className="space-y-6">
            <section className={styles.card}>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                  <Sparkles size={19} />
                </div>
                <h2 className="text-lg font-bold">What you'll get</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Plain-language explanations",
                    description:
                      "Understand what the listed tests generally measure.",
                  },
                  {
                    title: "Values and reference ranges",
                    description:
                      "Review the values and ranges supplied in your report.",
                  },
                  {
                    title: "Questions for your doctor",
                    description:
                      "Identify points that may be worth discussing with a clinician.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                      <Check size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className={`mt-1 leading-6 ${muted}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-400/[0.08]">
              <div className="mb-3 flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                <AlertCircle size={19} />
                Before you continue
              </div>
              <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                Remove personal identifiers such as your name, address, patient
                ID, and phone number before pasting a report. AI explanations
                can be inaccurate and cannot replace medical advice.
              </p>
            </section>
          </div>
        </div>

        {loading && (
          <section className={`${styles.card} mt-6`}>
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                <LoaderCircle size={28} className="animate-spin" />
              </div>
              <h2 className="font-bold">Reviewing your report</h2>
              <p className={`mt-2 ${muted}`}>
                VitaAI is preparing an educational explanation. This may take
                a moment.
              </p>
            </div>
          </section>
        )}

        {result && !loading && (
          <section className={`${styles.card} mt-6`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                  Analysis complete
                </p>
                <h2 className="text-2xl font-bold">Your report explanation</h2>
                <p className={`mt-2 ${muted}`}>
                  Language:{" "}
                  {result.language === "hi"
                    ? "Hindi"
                    : result.language === "mr"
                      ? "Marathi"
                      : "English"}
                </p>
              </div>

              <button
                type="button"
                onClick={copyResult}
                className={styles.secondary}
              >
                <Clipboard size={16} />
                Copy analysis
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300">
                <FileText size={18} />
                Explanation
              </div>

              <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
                {result.explanation}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertCircle size={18} />
                Important health information
              </div>
              {result.disclaimer ||
                "This is educational information, not a diagnosis. Discuss your laboratory results with a qualified healthcare professional."}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
