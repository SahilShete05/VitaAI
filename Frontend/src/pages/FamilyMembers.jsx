
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Pencil,
  Trash2,
  CalendarDays,
  RefreshCw,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import api from "../components/lib/api";

const emptyForm = {
  name: "",
  relationship: "",
  dateOfBirth: "",
  gender: "",
};

const relationships = [
  "Self",
  "Spouse",
  "Parent",
  "Mother",
  "Father",
  "Child",
  "Son",
  "Daughter",
  "Sibling",
  "Brother",
  "Sister",
  "Grandparent",
  "Grandchild",
  "Other",
];

function getMembers(response) {
  const body = response?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.familyMembers)) return body.familyMembers;
  return [];
}

function formatDate(date) {
  if (!date) return "Not provided";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Not provided";

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function FamilyMembers() {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/family-members");
      setMembers(getMembers(response));
    } catch (err) {
      console.error("Failed to load family members:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load family members. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
  }

  function startEditing(member) {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      relationship: member.relationship || "",
      dateOfBirth: member.dateOfBirth
        ? String(member.dateOfBirth).slice(0, 10)
        : "",
      gender: member.gender || "",
    });
    setError("");
    setNotice("");

    document
      .getElementById("family-member-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = {
      name: form.name.trim(),
      relationship: form.relationship.trim(),
      dateOfBirth: form.dateOfBirth || null,
      gender: form.gender || null,
    };

    if (!payload.name || !payload.relationship) {
      setError("Please enter a name and relationship.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/family-members/${editingId}`, payload);
        setNotice("Family member updated successfully.");
      } else {
        await api.post("/family-members", payload);
        setNotice("Family member added successfully.");
      }

      resetForm();
      await loadMembers();
    } catch (err) {
      console.error("Failed to save family member:", err);
      setError(
        err.response?.data?.message ||
          "Unable to save family member. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member) {
    const confirmed = window.confirm(
      `Delete ${member.name} from your family profiles?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setDeletingId(member.id);

    try {
      await api.delete(`/family-members/${member.id}`);

      if (editingId === member.id) {
        resetForm();
      }

      setMembers((current) =>
        current.filter((item) => item.id !== member.id)
      );
      setNotice("Family member deleted successfully.");
    } catch (err) {
      console.error("Failed to delete family member:", err);
      setError(
        err.response?.data?.message ||
          "Unable to delete family member. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-[#0d0c19] dark:text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-semibold text-purple-600 dark:text-purple-300">
              VITAAI HEALTH SERVICES
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Family Health Profiles
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
              Manage family profiles and keep health information organized.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMembers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{notice}</p>
          </div>
        )}

        <section
          id="family-member-form"
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-7"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
              {editingId ? <Pencil size={21} /> : <UserPlus size={21} />}
            </div>

            <div>
              <h2 className="text-xl font-semibold">
                {editingId ? "Edit family member" : "Add family member"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Name and relationship are required.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="member-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full name *
                </label>
                <input
                  id="member-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={form.name}
                  onChange={updateField}
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
                />
              </div>

              <div>
                <label
                  htmlFor="member-relationship"
                  className="mb-2 block text-sm font-medium"
                >
                  Relationship *
                </label>
                <select
                  id="member-relationship"
                  name="relationship"
                  required
                  value={form.relationship}
                  onChange={updateField}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
                >
                  <option value="">Select relationship</option>
                  {relationships.map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {relationship}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="member-dob"
                  className="mb-2 block text-sm font-medium"
                >
                  Date of birth
                </label>
                <input
                  id="member-dob"
                  name="dateOfBirth"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dateOfBirth}
                  onChange={updateField}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
                />
              </div>

              <div>
                <label
                  htmlFor="member-gender"
                  className="mb-2 block text-sm font-medium"
                >
                  Gender
                </label>
                <select
                  id="member-gender"
                  name="gender"
                  value={form.gender}
                  onChange={updateField}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-purple-500 dark:border-white/10 dark:bg-[#171526]"
                >
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <UserPlus size={18} />
                )}
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add family member"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <X size={17} />
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Your family members</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {members.length} profile{members.length === 1 ? "" : "s"}
              </p>
            </div>
            <Users className="text-purple-600 dark:text-purple-300" size={24} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
              <LoaderCircle className="animate-spin" size={22} />
              Loading family profiles...
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-white/15 dark:bg-white/[0.03]">
              <UserRound
                className="mx-auto mb-4 text-slate-400"
                size={38}
              />
              <h3 className="text-lg font-semibold">No family profiles yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                Add yourself or a family member using the form above.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">
                      <UserRound size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-lg font-semibold">
                        {member.name}
                      </h3>
                      <p className="mt-1 text-sm capitalize text-purple-700 dark:text-purple-300">
                        {member.relationship}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm dark:border-white/10">
                    <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <CalendarDays
                        size={17}
                        className="shrink-0 text-slate-400"
                      />
                      <span>
                        Date of birth: {formatDate(member.dateOfBirth)}
                      </span>
                    </p>

                    {member.gender && (
                      <p className="text-slate-600 dark:text-slate-300">
                        Gender:{" "}
                        <span className="capitalize">{member.gender}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEditing(member)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      disabled={deletingId === member.id}
                      aria-label={`Delete ${member.name}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-400/20 dark:text-red-300 dark:hover:bg-red-400/10"
                    >
                      {deletingId === member.id ? (
                        <LoaderCircle className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Family profiles help organize health information. Only add information
          you are authorized to manage, and keep personal health information
          private.
        </p>
      </div>
    </main>
  );
}
