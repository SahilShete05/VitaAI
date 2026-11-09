import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  HelpCircle,
  LifeBuoy,
  Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../components/lib/api";

const faqs = [
  {
    question: "Is VitaAI a replacement for a doctor?",
    answer:
      "No. VitaAI provides general health information and organization tools. Contact a qualified healthcare professional for diagnosis and treatment.",
  },
  {
    question: "How can I update my account details?",
    answer:
      "Open Profile Settings from the navigation menu to update your name or email address.",
  },
  {
    question: "How do I keep my health information private?",
    answer:
      "Use Privacy Controls to review the available privacy options. Never share your password or authentication codes with anyone.",
  },
  {
    question: "What should I do in a medical emergency?",
    answer:
      "Call your local emergency services or go to the nearest emergency department. VitaAI is not an emergency dispatch service.",
  },
];

const categories = [
  { value: "general", label: "General question" },
  { value: "account", label: "Account help" },
  { value: "technical", label: "Technical issue" },
  { value: "privacy", label: "Privacy concern" },
];

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function HelpSupport() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    subject: "",
    category: "general",
    message: "",
  });
  const [requests, setRequests] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const response = await api.get("/support");
        if (active) setRequests(response.data?.data || []);
      } catch (requestError) {
        if (active) {
          setError(
            getErrorMessage(requestError, "Unable to load your support requests.")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequests();
    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await api.post("/support", form);
      const request = response.data?.data;
      if (!request) throw new Error("The server returned an invalid response.");

      setRequests((current) => [request, ...current]);
      setForm({ subject: "", category: "general", message: "" });
      setSuccess(response.data.message || "Your support request has been submitted.");
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to submit your support request."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-[#17172b] dark:bg-[#0d0c19] dark:text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <LifeBuoy size={25} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                VitaAI support
              </p>
              <h1 className="text-3xl font-bold tracking-tight">How can we help?</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Find quick answers or send our team a support request. We will keep
            your request connected to your VitaAI account.
          </p>
        </header>

        {(error || success) && (
          <div
            role={error ? "alert" : "status"}
            className={`mb-6 flex items-start gap-2 rounded-xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            }`}
          >
            {error && <AlertCircle size={18} />}
            {error || success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171626] sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <HelpCircle className="text-violet-600 dark:text-violet-400" size={20} />
              <h2 className="text-lg font-bold">Frequently asked questions</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={faq.question} className="rounded-xl border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
                  >
                    {faq.question}
                    <ChevronDown className={`shrink-0 transition ${openFaq === index ? "rotate-180" : ""}`} size={17} />
                  </button>
                  {openFaq === index && (
                    <p className="border-t border-slate-200 px-4 py-3 text-sm leading-6 text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {faq.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171626] sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold">Contact support</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Tell us what you need and our team will review it.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-semibold">
                Subject
                <input
                  required
                  minLength={3}
                  maxLength={120}
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What can we help with?"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>
              <label className="block text-sm font-semibold">
                Category
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>{category.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Message
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Describe your question or issue..."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {submitting ? "Sending..." : "Send support request"}
              </button>
            </form>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171626] sm:p-6">
          <h2 className="mb-4 text-lg font-bold">Your support requests</h2>
          {loading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">You have not submitted any support requests yet.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                  <div>
                    <h3 className="font-semibold">{request.subject}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{request.message}</p>
                  </div>
                  <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
