
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const medicalInfoApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Medicine information
export async function explainMedicine({
  medicineName,
  question = "",
  language = "en",
}) {
  const response = await medicalInfoApi.post(
    "/medicine-info/explain",
    {
      medicineName,
      question,
      language,
    }
  );

  return response.data.data;
}

// Lab report analysis
export async function analyzeLabReport({
  reportText,
  language = "en",
}) {
  const response = await medicalInfoApi.post(
    "/lab-reports/analyze",
    {
      reportText,
      language,
    }
  );

  return response.data.data;
}
