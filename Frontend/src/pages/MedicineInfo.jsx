
import { useState } from "react";
import {
  AlertCircle,
  Check,
  Clipboard,
  HeartPulse,
  Languages,
  LoaderCircle,
  Pill,
  RotateCcw,
  Search,
  ShieldCheck,
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

const suggestedQuestions = [
  "What is this medicine generally used for?",
  "What are common side effects?",
  "What precautions should I know about?",
];

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

export default function MedicineInfo() {
  const [medicineName, setMedicineName] = useState("");
  const [question, setQuestion] = useState("");
  const [language, setLanguage] = useState("en");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function lookupMedicine(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setResult(null);

    const name = medicineName.trim();
    const userQuestion = question.trim();

    if (!name) {
      setError("Please enter a medicine name.");
      return;
    }

    if (name.length > 150) {
      setError("Medicine name must not exceed 150 characters.");
      return;
    }

    if (userQuestion.length > 1000) {
      setError("Your question must not exceed 1000 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/medicine-info/explain", {
        medicineName: name,
        question: userQuestion,
        language,
      });

      const data = response?.data?.data;

      if (!data?.information) {
        throw new Error("The server did not return medicine information.");
      }

      setResult(data);
      setSuccess("Medicine information retrieved successfully.");
    } catch (err) {
      setError(
        getMessage(
          err,
          "Unable to retrieve medicine information. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(
        `${result.medicineName}\n\n${result.information}\n\n${result.disclaimer || ""}`
      );
      setSuccess("Medicine information copied to clipboard.");
      setError("");
    } catch {
      setError("Unable to copy the information. Please copy it manually.");
    }
  }

  function resetForm() {
    setMedicineName("");
    setQuestion("");
    setLanguage("en");
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
                <Pill size={25} />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Medicine Information
              </h1>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Explore general information about a medicine, its common uses,
              potential side effects, and precautions in your preferred
              language.
            </p>
          </div>
        </header>

        <Notice error={error} success={success} />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className={styles.card}>
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                <Search size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Look up a medicine</h2>
                <p className={`mt-1 ${muted}`}>
                  Enter the medicine name as printed on its packaging.
                </p>
              </div>
            </div>

            <form onSubmit={lookupMedicine} className="space-y-5">
              <div>
                <label
                  htmlFor="medicine-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Medicine name <span className="text-red-500">*</span>
                </label>
                <input
                  id="medicine-name"
                  type="text"
                  value={medicineName}
                  onChange={(event) => {
                    setMedicineName(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  maxLength={150}
                  required
                  className={styles.input}
                  placeholder="e.g. Paracetamol"
                />
                <p className={`mt-2 ${muted}`}>
                  If possible, include the active ingredient and strength
                  printed on the packaging.
                </p>
              </div>

              <div>
                <label
                  htmlFor="medicine-question"
                  className="mb-2 block text-sm font-semibold"
                >
                  What would you like to know?
                </label>
                <textarea
                  id="medicine-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  className={`${styles.input} resize-y leading-6`}
                  placeholder="Ask about common uses, side effects, precautions, or interactions..."
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {question.length}/1000
                </p>
              </div>

              <div>
                <label
                  htmlFor="medicine-language"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold"
                >
                  <Languages size={16} className="text-purple-600" />
                  Information language
                </label>
                <select
                  id="medicine-language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className={styles.input}
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">Popular questions</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuestion(suggestion)}
                      className="rounded-full border border-purple-200 bg-purple-50 px-3 py-2 text-left text-xs font-medium text-purple-800 transition hover:bg-purple-100 dark:border-purple-400/20 dark:bg-purple-400/[0.08] dark:text-purple-200 dark:hover:bg-purple-400/[0.15]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading || !medicineName.trim()}
                  className={styles.button}
                >
                  {loading ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {loading ? "Getting information…" : "Get medicine information"}
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
                  <HeartPulse size={19} />
                </div>
                <h2 className="text-lg font-bold">Information at a glance</h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "General uses",
                    description:
                      "Learn what the medicine is commonly used for.",
                  },
                  {
                    title: "Possible side effects",
                    description:
                      "Understand potential effects and when to seek professional advice.",
                  },
                  {
                    title: "Safety precautions",
                    description:
                      "Learn why allergies, other medicines, and health conditions matter.",
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
                <ShieldCheck size={19} />
                Medicine safety
              </div>
              <p className="text-sm leading-6 text-amber-900 dark:text-amber-200">
                This tool provides general educational information. It cannot
                confirm that a medicine is suitable for you. Do not start,
                stop, or change a medicine or its dose based on AI-generated
                information.
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
              <h2 className="font-bold">Preparing medicine information</h2>
              <p className={`mt-2 ${muted}`}>
                VitaAI is preparing an educational overview. Please wait.
              </p>
            </div>
          </section>
        )}

        {result && !loading && (
          <section className={`${styles.card} mt-6`}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                  Information retrieved
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                    <Pill size={22} />
                  </div>
                  <h2 className="text-2xl font-bold">
                    {result.medicineName || medicineName}
                  </h2>
                </div>
                <p className={`mt-2 ${muted}`}>
                  General medicine information · Not a prescription
                </p>
              </div>

              <button
                type="button"
                onClick={copyResult}
                className={styles.secondary}
              >
                <Clipboard size={16} />
                Copy information
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="mb-3 flex items-center gap-2 font-semibold text-purple-700 dark:text-purple-300">
                <Sparkles size={18} />
                Medicine overview
              </div>
              <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">
                {result.information}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertCircle size={18} />
                Important safety information
              </div>
              {result.disclaimer ||
                "Confirm medicine-specific information with a pharmacist or qualified healthcare professional. Do not change your treatment based on AI-generated information."}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
