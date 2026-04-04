// API functions for reports

import { apiClient } from "./client";
import type { ReportData, MonthSummary } from "@/types/report";

// Get reports data with optional time range
export async function getReports(timeRange: "1m" | "6m" | "1y" | "all" = "6m"): Promise<ReportData> {
  const response = await apiClient.get("/reports/", {
    params: { time_range: timeRange }
  });
  return response.data;
}

// Close current month and create summary
export async function closeMonth(): Promise<MonthSummary> {
  const response = await apiClient.post("/month/close/");
  return response.data;
}
