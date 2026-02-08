// src/Component/Reports/BranchReports/BranchReportsSummary.jsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "./branchReports.utils";

export default function BranchReportsSummary({ summary, txCount }) {
  if (!summary) return null;

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
      <Badge variant="secondary">Opening: ₹{formatINR(summary.opening)}</Badge>
      <Badge variant="outline">Credit: ₹{formatINR(summary.totalCredit)}</Badge>
      <Badge variant="outline">Debit: ₹{formatINR(summary.totalDebit)}</Badge>
      <Badge variant="secondary">Closing: ₹{formatINR(summary.closing)}</Badge>
      <Badge variant="outline">Txns: {txCount}</Badge>
    </div>
  );
}
