
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPlus,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import api from "../components/lib/api";

const severityOptions = [
  { value: "mild", label: "Mild", description: "Manageable symptoms" },
  {
    value: "moderate",
    label: "Moderate",
    description: "Symptoms affect daily activities",
  },
  {
    value: "severe",
    label: "Severe",
    description: "Intense or difficult-to-manage symptoms",
  },
];

function extractAssessments(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.assessments)) return payload.assessments;

  return [];
}

function extractFamilyMembers(response) {
  const payload = response?.data;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.familyMembers)) return payload.familyMembers;

  return [];
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readableValue(value) {
  if (!value) return "Not provided";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function getRiskStyle(riskLevel) {
  const value = String(riskLevel || "unknown")
    .toLowerCase()
    .replaceAll("_", " ");

  if (["low", "minimal"].includes(value)) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300";
  }

  if (["moderate", "medium", "intermediate"].includes(value)) {
    return "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300";
  }

  if (["high", "critical", "urgent", "very high"].includes(value)) {
    return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-white/10 dark:text-slate-300";
}

function RiskBadge({ riskLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getRiskStyle(
        riskLevel
      )}`}
    >
      Risk: {readableValue(riskLevel || "unknown")}
    </span>
  );
}

function getEmergencyWarning(assessment) {
  const recommendations =
    typeof assessment?.recommendations === "string"
      ? assessment.recommendations
      : Array.isArray(assessment?.recommendations)
        ? assessment.recommendations.join(" ")
        : "";

  const text = `${assessment?.symptoms || ""} ${
    assessment?.aiSummary || ""
  } ${recommendations}`.toLowerCase();

  const redFlagPatterns = [
    /chest pain/,
    /difficulty breathing/,
    /trouble breathing/,
    /shortness of breath/,
    /sudden (?:and )?(?:severe )?headache/,
    /thunderclap/,
    /face droop/,
    /one[- ]sided weakness/,
    /weakness on one side/,
    /difficulty speaking/,
    /slurred speech/,
    /seizure/,
    /unconscious/,
    /not responding/,
    /severe bleeding/,
    /blue lips/,
    /severe allergic reaction/,
    /stiff neck.{0,50}fever/,
  ];

  return redFlagPatterns.some((pattern) => pattern.test(text));
}

function SeverityBadge({ severity }) {
  const styles = {
    mild: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    moderate:
      "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    severe: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  };

  const normalized = String(severity || "").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[normalized] ||
        "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
      }`}
    >
      {readableValue(severity)}
    </span>
  );
}

function getMemberName(assessment, familyMembers) {
  if (!assessment?.familyMemberId) return "Myself";

  const member = familyMembers.find(
    (item) => item.id === assessment.familyMemberId
  );

  return member
    ? `${member.name} (${member.relationship})`
    : "Family member";
}

export default function HealthAssessments() {
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState("mild");
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState("");
  const [loadingFamilyMembers, setLoadingFamilyMembers] = useState(false);

  const [assessments, setAssessments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState("");
  const [facilitySearchAssessmentId, setFacilitySearchAssessmentId] =
    useState(null);

  const loadAssessments = useCallback(async () => {
    setLoadingHistory(true);
    setError("");

    try {
      const response = await api.get("/assessments");
      const items = extractAssessments(response);

      setAssessments(items);

      setSelectedAssessment((current) => {
        if (!current) return null;
        return items.find((item) => item.id === current.id) || current;
      });
    } catch (requestError) {
      console.error("Failed to load assessments:", requestError);
      setError(
        getErrorMessage(
          requestError,
          "Unable to load your assessment history."
        )
      );
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadFamilyMembers = useCallback(async () => {
    setLoadingFamilyMembers(true);

    try {
      const response = await api.get("/family-members");
      setFamilyMembers(extractFamilyMembers(response));
    } catch (requestError) {
      console.error("Failed to load family members:", requestError);
      setFamilyMembers([]);
    } finally {
      setLoadingFamilyMembers(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  async function handleCreateAssessment(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanedSymptoms = symptoms.trim();

    if (!cleanedSymptoms) {
      setError("Please describe your symptoms before saving.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post("/assessments", {
        symptoms: cleanedSymptoms,
        severity,
        ...(selectedFamilyMemberId
          ? { familyMemberId: selectedFamilyMemberId }
          : {}),
      });

      const payload = response?.data;
      const created =
        payload?.data?.assessment ||
        payload?.assessment ||
        payload?.data ||
        payload;

      setSymptoms("");
      setSelectedFamilyMemberId("");
      setSuccess(
        payload?.message || "Your health assessment was saved successfully."
      );

      await loadAssessments();

      if (created?.id) {
        setSelectedAssessment(created);
      }
    } catch (requestError) {
      console.error("Failed to create assessment:", requestError);
      setError(
        getErrorMessage(
          requestError,
          "Unable to save your assessment. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze(assessment) {
    if (!assessment?.id) {
      setError("This assessment does not have a valid ID.");
      return;
    }

    setError("");
    setSuccess("");
    setAnalyzingId(assessment.id);

    try {
      const response = await api.post(
        `/assessments/${encodeURIComponent(assessment.id)}/analyze`
      );

      const payload = response?.data;
      const analyzed =
        payload?.data?.assessment ||
        payload?.assessment ||
        payload?.data ||
        payload;

      if (analyzed && typeof analyzed === "object" && analyzed.id) {
        setSelectedAssessment(analyzed);
      } else {
        setSelectedAssessment(assessment);
      }

      setSuccess(
        payload?.message || "Your assessment analysis is complete."
      );

      await loadAssessments();
    } catch (requestError) {
      console.error("Assessment analysis failed:", requestError);
      setError(
        getErrorMessage(
          requestError,
          "Unable to analyze this assessment. Please try again."
        )
      );
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleFindNearbyFacilities(
    assessment,
    category = "hospital",
    radius = 5000
  ) {
    if (!assessment?.id) {
      setFacilityError("Please select a valid health assessment.");
      return;
    }

    if (!navigator.geolocation) {
      setFacilityError(
        "Location services are not supported by this browser."
      );
      return;
    }

    setFacilityError("");
    setNearbyFacilities([]);
    setLoadingFacilities(true);
    setFacilitySearchAssessmentId(assessment.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          const response = await api.get("/healthcare-locator/nearby", {
            params: { latitude, longitude, category, radius },
          });

          const payload = response?.data;
          const facilities = Array.isArray(payload?.data)
            ? payload.data
            : [];

          setNearbyFacilities(facilities);

          if (facilities.length === 0) {
            setFacilityError(
              "No nearby facilities were found. Try another category or a larger search radius."
            );
          }
        } catch (requestError) {
          console.error("Healthcare locator failed:", requestError);
          setFacilityError(
            requestError?.response?.data?.message ||
              "Unable to load nearby healthcare facilities. Please try again."
          );
        } finally {
          setLoadingFacilities(false);
        }
      },
      (locationError) => {
        const message =
          locationError.code === 1
            ? "Location permission was denied. Allow location access in your browser to find nearby care."
            : locationError.code === 2
              ? "Your location could not be determined. Check your device location settings and try again."
              : "The location request timed out. Please try again.";

        setFacilityError(message);
        setLoadingFacilities(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }

  function openAssessment(assessment) {
    setSelectedAssessment(assessment);
    setError("");
    setSuccess("");
    setFacilityError("");
    setNearbyFacilities([]);
  }

  const displayedAssessment =
    assessments.find((item) => item.id === selectedAssessment?.id) ||
    selectedAssessment;

  return (
    <main className="min-h-screen bg-[#f8f9fc] px-4 py-6 text-[#17172b] dark:bg-[#0d0c19] dark:text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold text-purple-600 dark:text-purple-300">
            VITAAI HEALTH SERVICES
          </p>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Health Assessments
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
                Record your symptoms, keep track of how you feel, and request
                AI-generated health information for your assessment.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAssessments}
              disabled={loadingHistory}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] sm:self-auto"
            >
              <RefreshCw
                size={16}
                className={loadingHistory ? "animate-spin" : ""}
              />
              Refresh history
            </button>
          </div>
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

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
              <ClipboardPlus size={23} />
            </div>

            <div>
              <h2 className="text-xl font-semibold">Create an assessment</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Describe what you are experiencing.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAssessment} className="space-y-5">
            <div>
              <label
                htmlFor="assessment-symptoms"
                className="mb-2 block text-sm font-semibold"
              >
                Symptoms
              </label>

              <textarea
                id="assessment-symptoms"
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="For example: headache and mild fatigue since yesterday..."
                rows={5}
                maxLength={5000}
                required
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 dark:border-white/10 dark:bg-[#171526] dark:placeholder:text-slate-500"
              />

              <p className="mt-2 text-right text-xs text-slate-400">
                {symptoms.length}/5000 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="assessment-family-member"
                className="mb-2 flex items-center gap-2 text-sm font-semibold"
              >
                <Users size={17} className="text-purple-600 dark:text-purple-300" />
                Assessment for
              </label>

              <select
                id="assessment-family-member"
                value={selectedFamilyMemberId}
                onChange={(event) =>
                  setSelectedFamilyMemberId(event.target.value)
                }
                disabled={loadingFamilyMembers}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 disabled:opacity-60 dark:border-white/10 dark:bg-[#171526]"
              >
                <option value="">Myself</option>

                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.relationship})
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {loadingFamilyMembers
                  ? "Loading family members..."
                  : familyMembers.length === 0
                    ? "No family members found. You can add them from the Family Members page."
                    : "Choose yourself or a family member for this assessment."}
              </p>
            </div>

            <div>
              <label
                htmlFor="assessment-severity"
                className="mb-2 block text-sm font-semibold"
              >
                How severe are your symptoms?
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                {severityOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                      severity === option.value
                        ? "border-purple-400 bg-purple-50/70 ring-2 ring-purple-500/10 dark:border-purple-400/60 dark:bg-purple-400/10"
                        : "border-slate-200 hover:border-purple-200 dark:border-white/10 dark:hover:border-purple-400/30"
                    }`}
                  >
                    <input
                      id={`assessment-severity-${option.value}`}
                      type="radio"
                      name="assessmentSeverity"
                      value={option.value}
                      checked={severity === option.value}
                      onChange={() => setSeverity(option.value)}
                      className="mt-1 accent-purple-600"
                    />

                    <span>
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !symptoms.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7029d9] to-[#4935d4] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={18} />
              ) : (
                <ClipboardPlus size={18} />
              )}
              {saving ? "Saving assessment..." : "Save assessment"}
            </button>
          </form>
        </section>

        <section className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Assessment history</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Your previously saved assessments.
                </p>
              </div>

              <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700 dark:bg-purple-400/10 dark:text-purple-300">
                {assessments.length}
              </span>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                <LoaderCircle className="animate-spin" size={20} />
                Loading assessments...
              </div>
            ) : assessments.length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-5 py-10 text-center dark:bg-white/[0.04]">
                <Activity
                  size={30}
                  className="mx-auto mb-3 text-slate-400"
                />
                <p className="font-semibold">No assessments yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Submit your first assessment above. Your saved entries will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="max-h-[700px] space-y-3 overflow-y-auto pr-1">
                {assessments.map((assessment) => (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => openAssessment(assessment)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      displayedAssessment?.id === assessment.id
                        ? "border-purple-400 bg-purple-50/60 dark:bg-purple-400/10"
                        : "border-slate-200 hover:border-purple-200 dark:border-white/10 dark:hover:border-purple-400/30"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold">
                          {assessment.symptoms || "Symptoms not provided"}
                        </p>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <CalendarDays size={14} />
                          {formatDate(
                            assessment.createdAt || assessment.updatedAt
                          )}
                        </p>
                      </div>

                      <ChevronDown
                        size={17}
                        className={`shrink-0 text-slate-400 transition ${
                          displayedAssessment?.id === assessment.id
                            ? "rotate-180"
                            : ""
                        }`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={assessment.severity} />
                      <RiskBadge riskLevel={assessment.riskLevel} />
                    </div>

                    {assessment.familyMemberId && (
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                        <Users size={14} />
                        {getMemberName(assessment, familyMembers)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                <Sparkles size={22} />
              </div>

              <div>
                <h2 className="text-xl font-semibold">Assessment details</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review your entry or request AI analysis.
                </p>
              </div>
            </div>

            {!displayedAssessment ? (
              <div className="rounded-xl bg-slate-50 px-5 py-12 text-center dark:bg-white/[0.04]">
                <Stethoscope
                  size={30}
                  className="mx-auto mb-3 text-slate-400"
                />
                <p className="font-semibold">Select an assessment</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Choose an item from your history to view its details.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {getEmergencyWarning(displayedAssessment) && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200"
                  >
                    <h3 className="flex items-center gap-2 font-bold">
                      <AlertTriangle size={19} />
                      Possible emergency warning
                    </h3>
                    <p className="mt-2 text-sm leading-6">
                      This assessment contains wording associated with
                      potentially urgent symptoms. Do not rely on this app to
                      determine how serious they are. If these symptoms are
                      happening now, are sudden, severe, or worsening, contact
                      local emergency services or seek urgent medical care
                      immediately.
                    </p>
                  </div>
                )}

                {String(displayedAssessment.severity || "").toLowerCase() ===
                  "severe" &&
                  !getEmergencyWarning(displayedAssessment) && (
                    <div
                      role="status"
                      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                    >
                      <h3 className="flex items-center gap-2 font-semibold">
                        <AlertCircle size={18} />
                        Severe symptoms reported
                      </h3>
                      <p className="mt-2 text-sm leading-6">
                        Consider prompt assessment by a healthcare
                        professional. If symptoms are sudden, rapidly
                        worsening, or feel life-threatening, seek emergency
                        care.
                      </p>
                    </div>
                  )}

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reported symptoms
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {displayedAssessment.symptoms || "Not provided"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={displayedAssessment.severity} />
                  <RiskBadge riskLevel={displayedAssessment.riskLevel} />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Assessment for
                  </p>
                  <p className="text-sm font-medium">
                    {getMemberName(displayedAssessment, familyMembers)}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded
                  </p>
                  <p className="text-sm">
                    {formatDate(
                      displayedAssessment.createdAt ||
                        displayedAssessment.updatedAt
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleAnalyze(displayedAssessment)}
                  disabled={analyzingId !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7029d9] to-[#4935d4] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {analyzingId === displayedAssessment.id ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {analyzingId === displayedAssessment.id
                    ? "Analyzing symptoms..."
                    : "Analyze symptoms with AI"}
                </button>

                {displayedAssessment.aiSummary && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 dark:border-purple-400/20 dark:bg-purple-400/10">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                      <Sparkles size={16} />
                      AI summary
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                      {displayedAssessment.aiSummary}
                    </p>
                  </div>
                )}

                {displayedAssessment.recommendations && (
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/[0.04]">
                    <h3 className="mb-2 text-sm font-semibold">
                      Recommendations
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {Array.isArray(displayedAssessment.recommendations)
                        ? displayedAssessment.recommendations.join("\n")
                        : typeof displayedAssessment.recommendations ===
                            "object"
                          ? JSON.stringify(
                              displayedAssessment.recommendations,
                              null,
                              2
                            )
                          : displayedAssessment.recommendations}
                    </p>
                  </div>
                )}

                {!displayedAssessment.aiSummary &&
                  !displayedAssessment.recommendations && (
                    <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                      This assessment has not been analyzed yet. Select
                      “Analyze symptoms with AI” to request an educational
                      summary and recommendations.
                    </p>
                  )}

                {["moderate", "severe"].includes(
                  String(displayedAssessment.severity || "").toLowerCase()
                ) && (
                  <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-400/10">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                        <MapPin size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200">
                          Find nearby healthcare
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-100">
                          Search within 5 km of your current location. Your
                          browser will ask for location permission.
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            { value: "hospital", label: "Hospitals" },
                            { value: "clinic", label: "Clinics" },
                            { value: "pharmacy", label: "Pharmacies" },
                            { value: "laboratory", label: "Labs" },
                            { value: "emergency", label: "Emergency care" },
                            { value: "all", label: "All facilities" },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                handleFindNearbyFacilities(
                                  displayedAssessment,
                                  option.value,
                                  5000
                                )
                              }
                              disabled={loadingFacilities}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-blue-200 dark:hover:bg-white/[0.08]"
                            >
                              {loadingFacilities &&
                              facilitySearchAssessmentId ===
                                displayedAssessment.id ? (
                                <LoaderCircle
                                  size={13}
                                  className="mr-1 inline animate-spin"
                                />
                              ) : null}
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {facilityError && (
                      <p
                        role="status"
                        className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-slate-700 dark:bg-black/10 dark:text-slate-200"
                      >
                        {facilityError}
                      </p>
                    )}

                    {nearbyFacilities.length > 0 &&
                      facilitySearchAssessmentId === displayedAssessment.id && (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm font-semibold">
                            Nearby facilities ({nearbyFacilities.length})
                          </p>

                          {nearbyFacilities.map((facility, index) => (
                            <article
                              key={facility.id || `${facility.name}-${index}`}
                              className="rounded-xl border border-blue-100 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
                            >
                              <div className="flex items-start gap-3">
                                <Building2
                                  size={20}
                                  className="mt-0.5 shrink-0 text-blue-700 dark:text-blue-300"
                                />

                                <div className="min-w-0 flex-1">
                                  <h4 className="font-semibold">
                                    {facility.name || "Healthcare facility"}
                                  </h4>

                                  <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                                    {facility.category || "Healthcare facility"}
                                    {Number.isFinite(
                                      Number(facility.distanceKm)
                                    )
                                      ? ` · ${Number(facility.distanceKm).toFixed(1)} km away`
                                      : ""}
                                  </p>

                                  {facility.address && (
                                    <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
                                      {facility.address}
                                    </p>
                                  )}

                                  {facility.phone && (
                                    <a
                                      href={`tel:${facility.phone}`}
                                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                                    >
                                      <Phone size={15} />
                                      {facility.phone}
                                    </a>
                                  )}

                                  {facility.latitude != null &&
                                    facility.longitude != null &&
                                    Number.isFinite(
                                      Number(facility.latitude)
                                    ) &&
                                    Number.isFinite(
                                      Number(facility.longitude)
                                    ) && (
                                      <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                                      >
                                        <Navigation size={15} />
                                        Get directions
                                      </a>
                                    )}
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                  </section>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                    <strong>Important:</strong> AI-generated information is
                    educational and may be inaccurate. It is not a diagnosis
                    or a substitute for a qualified healthcare professional.
                    Risk labels are informational only and must not be used to
                    rule out an emergency. For severe, sudden, or rapidly
                    worsening symptoms, seek urgent medical care.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
