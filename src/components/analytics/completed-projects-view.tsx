"use client";

import { useEffect } from "react";
import { trackEventOnce } from "@/lib/analytics/client";

export function CompletedProjectsView() {
  useEffect(() => { trackEventOnce("completed-projects-viewed", "completed_projects_viewed", {}); }, []);
  return null;
}
