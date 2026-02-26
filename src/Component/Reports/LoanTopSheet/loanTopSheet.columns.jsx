// src/Component/Reports/LoanTopSheet/loanTopSheet.columns.jsx
import {formatINR} from "@/Component/Reports/Branch Reports/branchReports.utils";

export function getOpeningClosingGroupColumns() {
    return [
        {
            key: "group_id",
            header: "Group ID",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.group_id
        },
        {
            key: "group_name",
            header: "Group",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.group_name
        },
        {
            key: "disbursed_cnt",
            header: "Disbursed Cnt",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.disbursed_cnt ?? 0
        },
        {
            key: "disbursed_amt",
            header: "Disbursed Amt",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.disbursed_amt)}`
        },
        {
            key: "outstanding_cnt",
            header: "Outstanding Cnt",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.outstanding_cnt ?? 0
        },
        {
            key: "outstanding_amt",
            header: "Outstanding Amt",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.outstanding_amt)}`
        },
        {
            key: "overdue_cnt",
            header: "Overdue Cnt",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.overdue_cnt ?? 0
        },
        {
            key: "overdue_amt",
            header: "Overdue Amt",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.overdue_amt)}`
        },
    ];
}

export function getDailyBranchColumns() {
    return [
        {
            key: "txn_date",
            header: <div className="leading-tight text-center">Date</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => String(r.txn_date || "").slice(0, 10),
        },

        {
            key: "disb_cnt",
            header: <div className="leading-tight text-center">Disbursed<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.disb_cnt ?? 0,
        },

        {
            key: "disb_amt",
            header: <div className="leading-tight text-center">Disbursed<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.disb_amt)}`,
        },

        {
            key: "realisable_amt",
            header: <div className="leading-tight text-center">Realisable<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.realisable_amt)}`,
        },

        {
            key: "realised_amt",
            header: <div className="leading-tight text-center">Realised<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.realised_amt)}`,
        },

        {
            key: "overdue_cnt",
            header: <div className="leading-tight text-center">Overdue<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.overdue_cnt ?? 0,
        },

        {
            key: "overdue_amt",
            header: <div className="leading-tight text-center">Overdue<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.overdue_amt)}`,
        },

        {
            key: "full_paid_cnt",
            header: <div className="leading-tight text-center">Full Paid<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.full_paid_cnt ?? 0,
        },

        {
            key: "full_paid_amt",
            header: <div className="leading-tight text-center">Full Paid<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.full_paid_amt)}`,
        },

        {
            key: "balance_cnt",
            header: <div className="leading-tight text-center">Balance<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.balance_cnt ?? 0,
        },

        {
            key: "balance_amt",
            header: <div className="leading-tight text-center">Balance<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.balance_amt)}`,
        },
    ];
}

export function getDailyGroupColumns() {
    return [
        {
            key: "txn_date",
            header: "Date",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => String(r.txn_date || "").slice(0, 10)
        },
        {
            key: "group_id",
            header: "Group ID",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.group_id
        },
        {
            key: "group_name",
            header: "Group",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.group_name
        },

        // reuse same numeric columns
        ...getDailyBranchColumns().filter((c) => c.key !== "txn_date"),
    ];
}