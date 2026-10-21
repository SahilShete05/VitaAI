
  import { Navigate, Route, Routes } from "react-router-dom";
  import { useAuth } from "../context/AuthContext";

  import Login from "../pages/Login";
  import Register from "../pages/Register";
  import Dashboard from "../pages/Dashboard";
  import HealthChat from "../pages/HealthChat";
  import HealthAssessments from "../pages/HealthAssessments";
  import SymptomTracking from "../pages/SymptomTracking";
  import FamilyMembers from "../pages/FamilyMembers";
  import HealthcareLocator from "../pages/HealthcareLocator";
  import Vitals from "../pages/Vitals";
  import Reminders from "../pages/Reminders";
  import Medications from "../pages/Medications";
  import MedicineInfo from "../pages/MedicineInfo";
  import LabReportAnalysis from "../pages/LabReportAnalysis";
  import ProfileSettings from "../pages/ProfileSettings";
  import {
    HealthReports,
    DoctorSummaries,
    VoiceTranscription,
    NotificationsFollowUps,
    PrivacyControls,
  } from "../pages/AdditionalHealthPages";

  function LoadingScreen() {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] dark:bg-[#0d0c19]">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-200 border-t-[#7029d9]" />
          Loading VitaAI...
        </div>
      </main>
    );
  }

  function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return <LoadingScreen />;
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
  }

  export default function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return <LoadingScreen />;
    }

    return (
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? "/dashboard" : "/login"}
              replace
            />
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Register />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/health-chat"
          element={
            <ProtectedRoute>
              <HealthChat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <HealthAssessments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/symptom-tracking"
          element={
            <ProtectedRoute>
              <SymptomTracking />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/family-members"
          element={
            <ProtectedRoute>
              <FamilyMembers />
          </ProtectedRoute>
        }
      />

        <Route
          path="/healthcare-locator"
          element={  
            <ProtectedRoute>
                <HealthcareLocator />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vitals"
          element={
            <ProtectedRoute>
              <Vitals />
            </ProtectedRoute>
          }
      />


      <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              {<Reminders />}
            </ProtectedRoute>
          }
      />


      <Route
        path="/medications"
        element={
          <ProtectedRoute>
            {<Medications />}
          </ProtectedRoute>
        }
      />


      <Route
        path="/health-reports"
        element={
          <ProtectedRoute>
              <HealthReports />
          </ProtectedRoute>
        }
      />

    <Route
      path="/doctor-summaries"
      element={
        <ProtectedRoute>
            <DoctorSummaries />
        </ProtectedRoute>
      }
    />

  <Route
    path="/voice-transcription"
    element={
      <ProtectedRoute>
        <VoiceTranscription />
      </ProtectedRoute>
    }
  />

  <Route
    path="/notifications-follow-ups"
    element={
      <ProtectedRoute>
        <NotificationsFollowUps />
      </ProtectedRoute>
    }
  />

  <Route
    path="/privacy"
    element={
      <ProtectedRoute>
        <PrivacyControls />
      </ProtectedRoute>
    }
  />

  <Route
    path="/medicine-info"
    element={
      <ProtectedRoute>
        <MedicineInfo />
      </ProtectedRoute>
    }
  />

   <Route
    path="/lab-reports"
    element={
      <ProtectedRoute>
        <LabReportAnalysis />
      </ProtectedRoute>
    }
  />

  <Route
    path="/profile"
    element={
      <ProtectedRoute>
        <ProfileSettings />
      </ProtectedRoute>
    }
  />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
