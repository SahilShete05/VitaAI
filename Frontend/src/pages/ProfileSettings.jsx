
import { useCallback, useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  CalendarDays,
  Save,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../components/lib/api";

const styles = {
  page:
    "min-h-screen bg-[#f8f9fc] px-4 py-6 text-[#17172b] dark:bg-[#0d0c19] dark:text-white sm:px-8",
  card:
    "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#171626] sm:p-6",
  input:
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/5 dark:text-white",
  button:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
};

const muted = "text-sm leading-6 text-slate-500 dark:text-slate-400";

function getMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function PageNotice({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-5 rounded-xl border p-4 text-sm ${
        error
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
      }`}
    >
      {error || success}
    </div>
  );
}

export default function ProfileSettings() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // GET /api/users/me
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.get("/users/me");
      const user = response?.data?.data ?? response?.data;

      if (!user || !user.id) {
        throw new Error("The server returned an invalid profile.");
      }

      setProfile(user);
      setForm({
        name: user.name ?? "",
        email: user.email ?? "",
      });
    } catch (err) {
      setError(getMessage(err, "Unable to load your profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  // PUT /api/users/me
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const nameChanged = name !== (profile?.name ?? "");
    const emailChanged =
      email !== (profile?.email ?? "").toLowerCase();

    if (!nameChanged && !emailChanged) {
      setSuccess("Your profile is already up to date.");
      return;
    }

    const updates = {};

    if (nameChanged) updates.name = name;
    if (emailChanged) updates.email = email;

    setSaving(true);

    try {
      const response = await api.put("/users/me", updates);
      const updatedUser = response?.data?.data ?? response?.data;

      if (!updatedUser || !updatedUser.id) {
        throw new Error(
          "The profile may have been updated, but the response was invalid. Refresh to verify."
        );
      }

      setProfile(updatedUser);
      setForm({
        name: updatedUser.name ?? name,
        email: updatedUser.email ?? email,
      });

      setSuccess(
        response?.data?.message || "Profile updated successfully."
      );
    } catch (err) {
      setError(getMessage(err, "Unable to update your profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
    });

    setError("");
    setSuccess("");
  };

  const createdAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Not available";

  return (
    <main className={styles.page}>
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <header className="mb-7">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`${styles.secondary} mb-5`}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
            Account settings
          </p>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <UserRound size={25} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              My Profile
            </h1>
          </div>

          <p className={`mt-3 max-w-2xl ${muted}`}>
            Manage your VitaAI account details and keep your personal
            information up to date.
          </p>
        </header>

        <PageNotice error={error} success={success} />

        {/* Loading state */}
        {loading ? (
          <section className={styles.card}>
            <div className="flex items-center gap-3">
              <RefreshCw
                size={20}
                className="animate-spin text-violet-600"
              />
              <p className={muted}>Loading your profile…</p>
            </div>
          </section>
        ) : !profile ? (
          /* Error / empty state */
          <section className={styles.card}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <UserRound size={28} />
            </div>

            <h2 className="mt-4 text-lg font-bold">
              Profile unavailable
            </h2>

            <p className={`mt-2 ${muted}`}>
              We couldn't retrieve your account details. Check your
              connection and authentication, then try again.
            </p>

            <button
              type="button"
              onClick={loadProfile}
              className={`${styles.button} mt-5`}
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            {/* Profile summary */}
            <section className={styles.card}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/20">
                  <UserRound size={42} />
                </div>

                <h2 className="mt-4 max-w-full break-words text-xl font-bold">
                  {profile.name}
                </h2>

                <p className={`mt-1 max-w-full break-all ${muted}`}>
                  {profile.email}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck size={14} />
                  VitaAI account
                </span>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
                <div className="flex items-start gap-3">
                  <CalendarDays
                    size={19}
                    className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400"
                  />

                  <div>
                    <p className="text-sm font-semibold">Member since</p>
                    <p className={`mt-1 ${muted}`}>{createdAt}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3">
                  <ShieldCheck
                    size={19}
                    className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-400"
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      Account security
                    </p>
                    <p className={`mt-1 ${muted}`}>
                      Your profile is available through your authenticated
                      VitaAI session.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={loadProfile}
                disabled={saving}
                className={`${styles.secondary} mt-6 w-full`}
              >
                <RefreshCw size={16} />
                Refresh profile
              </button>
            </section>

            {/* Editable profile form */}
            <section className={styles.card}>
              <h2 className="text-lg font-bold">
                Personal information
              </h2>

              <p className={`mt-1 ${muted}`}>
                Edit your name or email address, then save your changes.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="text-sm font-semibold"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <UserRound
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="profile-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      value={form.name}
                      onChange={handleChange}
                      className={`${styles.input} pl-10`}
                      placeholder="Enter your full name"
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-email"
                    className="text-sm font-semibold"
                  >
                    Email address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={form.email}
                      onChange={handleChange}
                      className={`${styles.input} pl-10`}
                      placeholder="you@example.com"
                      required
                      disabled={saving}
                    />
                  </div>

                  <p className={`mt-2 ${muted}`}>
                    Your email must not already belong to another account.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 dark:border-white/10">
                  <button
                    type="submit"
                    disabled={saving}
                    className={styles.button}
                  >
                    {saving ? (
                      <RefreshCw
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={16} />
                    )}

                    {saving ? "Saving changes…" : "Save changes"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleReset}
                    className={styles.secondary}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
