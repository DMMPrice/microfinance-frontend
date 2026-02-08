// src/Component/Reports/BranchReports/BranchReportsTables.jsx
import React, { useMemo } from "react";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import { getPassbookColumns, getLoanRowsColumns, getLoanSummaryColumns } from "./branchReports.columns";

export default function BranchReportsTables({
  reportType,
  branchId, fromDate, toDate,
  viewMode, weekStart,
  includeCharges, includeExpenses, includeOtherLogs, includeEmptyDays,
  data,
  loading,
  error,
  summary,
  txCount,
}) {
  const passbookColumns = useMemo(() => getPassbookColumns(), []);
  const loanRowsColumns = useMemo(() => getLoanRowsColumns(), []);
  const loanSummaryColumns = useMemo(() => getLoanSummaryColumns(viewMode), [viewMode]);

  if (reportType === "PASSBOOK") {
    return (
      <AdvancedTable
        title="Passbook"
        description={`Branch ${branchId || "-"} | ${fromDate} to ${toDate}`}
        data={data?.transactions || []}
        columns={passbookColumns}
        isLoading={loading}
        errorText={error ? "Failed to load report. Check filters." : ""}
        emptyText="No transactions found for this date range."
        initialPageSize={10}
        enableSearch
        enablePagination
        enableColumnToggle
        enableExport
        exportFileName={`branch_passbook_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
        exportSheetName="Passbook"
        exportScope="all"
        exportVisibleOnly
        exportTitleRow={`Branch Passbook (${fromDate} to ${toDate})`}
        exportMetaRows={[
          ["Branch ID", branchId || ""],
          ["From", fromDate],
          ["To", toDate],
          ["Opening Balance", summary?.opening ?? 0],
          ["Total Credit", summary?.totalCredit ?? 0],
          ["Total Debit", summary?.totalDebit ?? 0],
          ["Closing Balance", summary?.closing ?? 0],
          ["Transactions", txCount],
        ]}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdvancedTable
        title={viewMode === "WEEKLY" ? "Weekly Summary" : "Daily Summary"}
        description={`Branch ${branchId || "-"} | ${fromDate} to ${toDate}`}
        data={data?.summary_rows || []}
        columns={loanSummaryColumns}
        isLoading={loading}
        errorText={error ? "Failed to load cashbook summary." : ""}
        emptyText="No summary rows for this range."
        initialPageSize={10}
        enableSearch={false}
        enablePagination
        enableColumnToggle
        enableExport
        exportFileName={`branch_cashbook_summary_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
        exportSheetName={viewMode === "WEEKLY" ? "Weekly" : "Daily"}
        exportScope="all"
        exportVisibleOnly
        exportTitleRow={`Branch Cashbook Summary (${fromDate} to ${toDate})`}
        exportMetaRows={[
          ["Branch ID", branchId || ""],
          ["From", fromDate],
          ["To", toDate],
          ["View Mode", viewMode],
          ["Week Start", weekStart],
          ["Include Charges", includeCharges ? "Yes" : "No"],
          ["Include Expenses", includeExpenses ? "Yes" : "No"],
          ["Include Other Logs", includeOtherLogs ? "Yes" : "No"],
          ["Include Empty Days", includeEmptyDays ? "Yes" : "No"],
          ["Opening Balance", summary?.opening ?? 0],
          ["Closing Balance", summary?.closing ?? 0],
        ]}
      />

      <AdvancedTable
        title="Detailed Entries"
        description={`Loan ledger + expenses (limit ${data?.limit || 200})`}
        data={data?.rows || []}
        columns={loanRowsColumns}
        isLoading={loading}
        errorText={error ? "Failed to load detail rows." : ""}
        emptyText="No entries found for this date range."
        initialPageSize={10}
        enableSearch
        enablePagination
        enableColumnToggle
        enableExport
        exportFileName={`branch_cashbook_rows_${branchId || "NA"}_${fromDate}_to_${toDate}.xlsx`}
        exportSheetName="Rows"
        exportScope="all"
        exportVisibleOnly
        exportTitleRow={`Branch Cashbook Rows (${fromDate} to ${toDate})`}
      />
    </div>
  );
}
