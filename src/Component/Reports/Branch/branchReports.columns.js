// src/Component/Reports/BranchReports/branchReports.columns.js
import { formatINR, formatDateTimeIST } from "./branchReports.utils";

export function getPassbookColumns() {
  return [
    {
      key: "txn_date",
      header: "Date",
      cell: (r) => String(r.txn_date).slice(0, 10),
      exportValue: (r) => String(r.txn_date).slice(0, 10),
      sortValue: (r) => String(r.txn_date).slice(0, 10),
    },
    { key: "source", header: "Source", cell: (r) => r.source, exportValue: (r) => r.source },
    {
      key: "credit",
      header: "Credit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.credit)}`,
      exportValue: (r) => Number(r.credit || 0),
      sortValue: (r) => Number(r.credit || 0),
    },
    {
      key: "debit",
      header: "Debit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.debit)}`,
      exportValue: (r) => Number(r.debit || 0),
      sortValue: (r) => Number(r.debit || 0),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.net)}`,
      exportValue: (r) => Number(r.net || 0),
      sortValue: (r) => Number(r.net || 0),
    },
    {
      key: "running_balance",
      header: "Running",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.running_balance)}`,
      exportValue: (r) => Number(r.running_balance || 0),
      sortValue: (r) => Number(r.running_balance || 0),
    },
    { key: "remark", header: "Remark", cell: (r) => r.remark, exportValue: (r) => r.remark },
  ];
}

export function getLoanSummaryColumns(viewMode) {
  return [
    {
      key: "d",
      header: viewMode === "WEEKLY" ? "Week" : "Date",
      cell: (r) => {
        if (viewMode === "WEEKLY") {
          const ws = r.week_start_date || r.week_start || r.week_first_day;
          const we = r.week_last_day;
          return we ? `${String(ws).slice(0, 10)} → ${String(we).slice(0, 10)}` : String(ws).slice(0, 10);
        }
        return String(r.d).slice(0, 10);
      },
      exportValue: (r) => (viewMode === "WEEKLY" ? (r.week_start_date || r.week_start || r.week_first_day) : r.d),
      sortValue: (r) => String(viewMode === "WEEKLY" ? (r.week_start_date || r.week_start || r.week_first_day) : r.d),
    },
    {
      key: "opening_balance",
      header: "Opening",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.opening_balance)}`,
      exportValue: (r) => Number(r.opening_balance || 0),
      sortValue: (r) => Number(r.opening_balance || 0),
    },
    {
      key: "credit_total",
      header: "Credit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.credit_total)}`,
      exportValue: (r) => Number(r.credit_total || 0),
      sortValue: (r) => Number(r.credit_total || 0),
    },
    {
      key: "debit_total",
      header: "Debit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.debit_total)}`,
      exportValue: (r) => Number(r.debit_total || 0),
      sortValue: (r) => Number(r.debit_total || 0),
    },
    {
      key: "net",
      header: "Net",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.net)}`,
      exportValue: (r) => Number(r.net || 0),
      sortValue: (r) => Number(r.net || 0),
    },
    {
      key: "closing_balance",
      header: "Closing",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.closing_balance)}`,
      exportValue: (r) => Number(r.closing_balance || 0),
      sortValue: (r) => Number(r.closing_balance || 0),
    },
  ];
}

export function getLoanRowsColumns() {
  return [
    {
      key: "created_on",
      header: "Created (IST)",
      cell: (r) => formatDateTimeIST(r.created_on),
      exportValue: (r) => r.created_on,
      sortValue: (r) => r.created_on,
    },
    { key: "txn_type", header: "Type", cell: (r) => r.txn_type, exportValue: (r) => r.txn_type },
    { key: "loan_account_no", header: "Loan A/C", cell: (r) => r.loan_account_no || "-", exportValue: (r) => r.loan_account_no || "" },
    { key: "group_name", header: "Group", cell: (r) => r.group_name || "-", exportValue: (r) => r.group_name || "" },
    { key: "member_name", header: "Member", cell: (r) => r.member_name || "-", exportValue: (r) => r.member_name || "" },
    {
      key: "credit",
      header: "Credit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.credit)}`,
      exportValue: (r) => Number(r.credit || 0),
      sortValue: (r) => Number(r.credit || 0),
    },
    {
      key: "debit",
      header: "Debit",
      className: "text-right",
      tdClassName: "px-3 py-3 align-middle whitespace-nowrap text-right",
      cell: (r) => `₹${formatINR(r.debit)}`,
      exportValue: (r) => Number(r.debit || 0),
      sortValue: (r) => Number(r.debit || 0),
    },
    { key: "narration", header: "Narration", cell: (r) => r.narration, exportValue: (r) => r.narration },
  ];
}
