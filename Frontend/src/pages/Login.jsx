
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  HeartPulse,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9fc] px-4 py-10 text-[#17172b] dark:bg-[#0d0c19] dark:text-white">
      {/* Brand background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-400/20 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-blue-400/20 blur-[100px]" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_25px_90px_rgba(65,45,130,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#19162b]/90 dark:shadow-black/30 md:grid-cols-2">
        {/* Left brand panel */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#8c32e8] via-[#4935d4] to-[#253fe0] p-10 text-white md:flex lg:p-12">
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-10 top-32 h-44 w-44 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/25 bg-white/15 shadow-lg backdrop-blur-lg">
              <HeartPulse size={27} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">VitaAI</p>
              <p className="text-xs text-white/75">
                Your personal health companion
              </p>
            </div>
          </div>

          <div className="relative z-10 my-14">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/25 bg-white/15 backdrop-blur-lg">
              <Sparkles size={28} />
            </div>

            <h2 className="max-w-sm text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
              Your health journey,{" "}
              <span className="text-white/75">made smarter.</span>
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/80 lg:text-base">
              Understand your symptoms, manage your medications, and keep
              your health information organized in one place.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3 border-t border-white/20 pt-6">
            <ShieldCheck size={21} />
            <p className="text-xs leading-5 text-white/80">
              Your health information deserves thoughtful care.
            </p>
          </div>
        </section>

        {/* Login form */}
        <section className="p-7 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c32e8] to-[#253fe0] text-white shadow-lg shadow-purple-500/20">
              <HeartPulse size={26} />
            </div>
            <div>
              <h1 className="text-xl font-bold">VitaAI</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your personal health companion
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-semibold text-[#7029d9] dark:bg-purple-400/10 dark:text-purple-300">
              <Sparkles size={14} />
              Welcome to VitaAI
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Sign in to continue your personalized health journey.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold"
              >
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#7029d9] focus:ring-4 focus:ring-purple-500/10 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#7029d9] focus:ring-4 focus:ring-purple-500/10 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-slate-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-[#7029d9] dark:hover:text-purple-300"
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8c32e8] via-[#4935d4] to-[#253fe0] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-600/25 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <LoaderCircle size={19} className="animate-spin" />
              )}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-xs text-slate-400">YOUR HEALTH, YOUR JOURNEY</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-[#7029d9] transition hover:text-[#253fe0] hover:underline dark:text-purple-300 dark:hover:text-blue-300"
            >
              Create account
            </Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <ShieldCheck size={15} />
            <span>Designed with your privacy in mind</span>
          </div>
        </section>
      </div>
    </main>
  );
}
