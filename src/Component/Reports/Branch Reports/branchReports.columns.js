// src/Component/Reports/BranchReports/branchReports.columns.js
import {formatINR, formatDateTimeIST} from "./branchReports.utils";

export function getPassbookColumns() {
    return [
        {
            key: "txn_date",
            header: "Date",
            headerClassName: "text-center",
            tdClassName: "px-2 py-2 align-middle text-center w-[20px] min-w-[10px]",
            cell: (r) => String(r.txn_date).slice(0, 10),
            exportValue: (r) => String(r.txn_date).slice(0, 10),
            sortValue: (r) => String(r.txn_date).slice(0, 10),
        },
        {
            key: "credit",
            header: "Credit",
            headerClassName: "text-center",
            tdClassName: "px-2 py-2 align-middle text-center w-[20px] min-w-[10px]",
            cell: (r) => `₹${formatINR(r.credit)}`,
        },
        {
            key: "debit",
            header: "Debit",
            headerClassName: "text-center",
            tdClassName: "px-2 py-2 align-middle text-center w-[20px] min-w-[10px]",
            cell: (r) => `₹${formatINR(r.debit)}`,
        },
        {
            key: "net",
            header: "Net",
            headerClassName: "text-center",
            tdClassName: "px-2 py-2 align-middle text-center w-[20px] min-w-[10px]",
            cell: (r) => `₹${formatINR(r.net)}`,
        },
        {
            key: "running_balance",
            header: "Running",
            headerClassName: "text-center",
            tdClassName: "px-2 py-2  align-middle text-center w-[20px] min-w-[10px]",
            cell: (r) => `₹${formatINR(r.running_balance)}`,
        },
        {
            key: "remark",
            header: "Remark",
            headerClassName: "text-center",
            tdClassName:
                "px-1 py-2 align-middle w-[300px] min-w-[100px] whitespace-normal break-words",
            cell: (r) => r.remark,
        },
    ];
}

export function getLoanSummaryColumns(viewMode) {
    return [
        {
            key: "d",
            header: viewMode === "WEEKLY" ? "Week" : "Date",
            headerClassName: "text-center",
            cell: (r) => {
                if (viewMode === "WEEKLY") {
                    const ws = r.week_start_date || r.week_start || r.week_first_day;
                    const we = r.week_last_day;
                    return we
                        ? `${String(ws).slice(0, 10)} → ${String(we).slice(0, 10)}`
                        : String(ws).slice(0, 10);
                }
                return String(r.d).slice(0, 10);
            },
        },
        {
            key: "opening_balance",
            header: "Opening",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.opening_balance)}`,
        },
        {
            key: "credit_total",
            header: "Credit",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.credit_total)}`,
        },
        {
            key: "debit_total",
            header: "Debit",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.debit_total)}`,
        },
        {
            key: "net",
            header: "Net",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.net)}`,
        },
        {
            key: "closing_balance",
            header: "Closing",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.closing_balance)}`,
        },
    ];
}

export function getLoanRowsColumns() {
    return [
        {
            key: "created_on",
            header: "Created (IST)",
            headerClassName: "text-center",
            cell: (r) => formatDateTimeIST(r.created_on),
        },
        {
            key: "txn_type",
            header: "Type",
            headerClassName: "text-center",
            cell: (r) => r.txn_type,
        },
        {
            key: "loan_account_no",
            header: "Loan A/C",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.loan_account_no || "-",
        },
        {
            key: "group_name",
            header: "Group",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.group_name || "-",
        },
        {
            key: "member_name",
            header: "Member",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.member_name || "-",
        },
        {
            key: "credit",
            header: "Credit",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.credit)}`,
        },
        {
            key: "debit",
            header: "Debit",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle text-right",
            cell: (r) => `₹${formatINR(r.debit)}`,
        },
        {
            key: "narration",
            header: "Narration",
            headerClassName: "text-center",
            tdClassName: "px-3 py-3 align-middle whitespace-normal break-words max-w-[420px]",
            cell: (r) => r.narration,
        },
    ];
}
