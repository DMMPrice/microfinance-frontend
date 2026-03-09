// src/Component/Reports/LoanTopSheet/LoanTopSheetTables.jsx
import React from "react";
import AdvancedTable from "@/Utils/AdvancedTable.jsx";
import {
    getOpeningClosingGroupColumns,
    getDailyBranchColumns,
    getDailyGroupColumns,
    getBranchSummaryColumns,
} from "@/Component/Reports/LoanTopSheet/loanTopSheet.columns.jsx";

export default function LoanTopSheetTables({
                                               openingRows,
                                               detailedBranchRows,
                                               detailedGroupRows,
                                               closingRows,
                                               summaryRows,
                                               loading,
                                           }) {
    return (
        <div className="space-y-4">
            <AdvancedTable
                title="Opening"
                data={openingRows}
                columns={getOpeningClosingGroupColumns()}
                isLoading={loading}
                enableSearch
                initialPageSize={10}
                rowKey={(r, idx) => `opening-${r.group_id ?? idx}`}
            />

            <AdvancedTable
                title="Detailed Daily (Branch)"
                data={detailedBranchRows}
                columns={getDailyBranchColumns()}
                isLoading={loading}
                enableSearch
                initialPageSize={10}
                rowKey={(r, idx) => `detail-branch-${r.txn_date}-${idx}`}
            />

            <AdvancedTable
                title="Detailed Daily (Group)"
                data={detailedGroupRows}
                columns={getDailyGroupColumns()}
                isLoading={loading}
                enableSearch
                initialPageSize={10}
                rowKey={(r, idx) => `detail-group-${r.txn_date}-${r.group_id ?? idx}`}
            />

            <AdvancedTable
                title="Closing"
                data={closingRows}
                columns={getOpeningClosingGroupColumns()}
                isLoading={loading}
                enableSearch
                initialPageSize={10}
                rowKey={(r, idx) => `closing-${r.group_id ?? idx}`}
            />

            <AdvancedTable
                title="Branch Totals"
                data={summaryRows}
                columns={getBranchSummaryColumns()}
                isLoading={loading}
                enableSearch={false}
                initialPageSize={20}
                rowKey={(r, idx) => `summary-${r.metric}-${idx}`}
            />
        </div>
    );
}