"use client";
import { useEffect } from "react";
import { markReportViewed } from "../../actions";
export function MarkViewed({ week }: { week: string }) {
  useEffect(() => { markReportViewed(week); }, [week]);
  return null;
}
