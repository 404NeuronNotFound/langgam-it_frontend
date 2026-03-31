// API functions for reports

import { apiClient } from "./client";
import type { ReportData, MonthSummary } from "@/types/report";

// Get reports data
export async function getReports(): Promise<ReportData> {
  const response = await apiClient.get("/reports/");
  return response.data;
}

// Close current month and create summary
export async function closeMonth(): Promise<MonthSummary> {
  const response = await apiClient.post("/month/close/");
  return response.data;
}
