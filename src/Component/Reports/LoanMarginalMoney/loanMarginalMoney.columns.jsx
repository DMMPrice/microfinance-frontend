import {formatINR} from "@/Component/Reports/Branch Reports/branchReports.utils";

export function getOpeningClosingGroupColumns() {
    return [
        {
            key: "group_id",
            header: "Group ID",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.group_id,
        },
        {
            key: "group_name",
            header: "Group",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.group_name,
        },
        {
            key: "loans_with_advance",
            header: "Loans With Advance",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.loans_with_advance ?? 0,
        },
        {
            key: "advance_balance_amt",
            header: "Advance Balance",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.advance_balance_amt)}`,
        },
        {
            key: "advance_add_cnt",
            header: "Advance Add Cnt",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.advance_add_cnt ?? 0,
        },
        {
            key: "advance_add_amt",
            header: "Advance Add Amt",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.advance_add_amt)}`,
        },
        {
            key: "advance_deduct_cnt",
            header: "Advance Deduct Cnt",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.advance_deduct_cnt ?? 0,
        },
        {
            key: "advance_deduct_amt",
            header: "Advance Deduct Amt",
            headerClassName: "text-center",
            tdClassName: "text-right",
            cell: (r) => `₹${formatINR(r.advance_deduct_amt)}`,
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
            key: "advance_add_cnt",
            header: <div className="leading-tight text-center">Advance Add<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.advance_add_cnt ?? 0,
        },
        {
            key: "advance_add_amt",
            header: <div className="leading-tight text-center">Advance Add<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.advance_add_amt)}`,
        },
        {
            key: "advance_deduct_cnt",
            header: <div className="leading-tight text-center">Advance Deduct<br/>Count</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.advance_deduct_cnt ?? 0,
        },
        {
            key: "advance_deduct_amt",
            header: <div className="leading-tight text-center">Advance Deduct<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.advance_deduct_amt)}`,
        },
        {
            key: "net_change_amt",
            header: <div className="leading-tight text-center">Net Change<br/>Amount</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => `₹${formatINR(r.net_change_amt)}`,
        },
        {
            key: "loans_with_advance",
            header: <div className="leading-tight text-center">Loans With<br/>Advance</div>,
            headerClassName: "text-center py-3",
            tdClassName: "text-center py-3 h-12",
            cell: (r) => r.loans_with_advance ?? 0,
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
            cell: (r) => String(r.txn_date || "").slice(0, 10),
        },
        {
            key: "group_id",
            header: "Group ID",
            headerClassName: "text-center",
            tdClassName: "text-center",
            cell: (r) => r.group_id,
        },
        {
            key: "group_name",
            header: "Group",
            headerClassName: "text-center",
            tdClassName: "whitespace-normal break-words",
            cell: (r) => r.group_name,
        },
        ...getDailyBranchColumns().filter((c) => c.key !== "txn_date"),
    ];
}

export function getBranchSummaryColumns() {
    return [
        {
            key: "metric",
            header: "Metric",
            headerClassName: "text-left",
            tdClassName: "font-medium",
            cell: (r) => r.metric,
        },
        {
            key: "value",
            header: "Value",
            headerClassName: "text-right",
            tdClassName: "text-right",
            cell: (r) => r.type === "amount" ? `₹${formatINR(r.value)}` : r.value,
        },
    ];
}