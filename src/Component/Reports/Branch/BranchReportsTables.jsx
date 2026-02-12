// src/Component/Reports/BranchReports/BranchReportsTables.jsx
import React, {useMemo} from "react";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {getPassbookColumns, getLoanRowsColumns, getLoanSummaryColumns} from "./branchReports.columns";
import { exportBranchPassbookExcel } from "./exportBranchPassbookExcel"; // ✅ add

export default function BranchReportsTables({
                                                reportType,
                                                branchId,
                                                branchName, // ✅ receive it
                                                fromDate,
                                                toDate,
                                                viewMode,
                                                weekStart,
                                                includeCharges,
                                                includeExpenses,
                                                includeOtherLogs,
                                                includeEmptyDays,
                                                data,
                                                loading,
                                                error,
                                                summary,
                                                txCount,
                                            }) {
    const passbookColumns = useMemo(() => getPassbookColumns(), []);
    const loanRowsColumns = useMemo(() => getLoanRowsColumns(), []);
    const loanSummaryColumns = useMemo(() => getLoanSummaryColumns(viewMode), [viewMode]);

    // ✅ show name + id
    const branchLabel = branchName?.trim()
        ? `${branchName}`
        : (branchId || "-");

    if (reportType === "PASSBOOK") {
        return (
            <AdvancedTable
                title="Cash in Hand"
                description={`Branch ${branchLabel} | ${fromDate} to ${toDate}`}
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

                exportFileName={`Cash in Hand - ${branchName || "NA"}_${fromDate}_to_${toDate}.xlsx`}
                exportSheetName="Passbook Summary"
                exportScope="all"
                exportVisibleOnly

                // ✅ Custom formatted export for passbook
                onExportExcelCustom={async ({ exportFileName, exportSheetName, data: rows }) => {
                    await exportBranchPassbookExcel({
                        exportFileName,
                        sheetName: exportSheetName,
                        branchName,
                        branchId,
                        fromDate,
                        toDate,
                        rows,
                        summary,
                    });
                }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <AdvancedTable
                title={viewMode === "WEEKLY" ? "Weekly Summary" : "Daily Summary"}
                description={`Branch ${branchLabel} | ${fromDate} to ${toDate}`} // ✅ here too
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
                    ["Branch", branchLabel], // ✅ name + id
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
                description={`Branch ${branchLabel} | Loan ledger + expenses (limit ${data?.limit || 200})`} // ✅ here too
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
                exportMetaRows={[
                    ["Branch", branchLabel], // ✅ optional but useful
                    ["From", fromDate],
                    ["To", toDate],
                ]}
            />
        </div>
    );
}
