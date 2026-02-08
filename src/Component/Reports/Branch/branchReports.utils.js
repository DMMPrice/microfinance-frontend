// src/Component/Reports/BranchReports/branchReports.utils.js
import { getISTCurrentMonthRange, formatToIST } from "@/Helpers/dateTimeIST.js";

/**
 * getISTCurrentMonthRange returns { from_date, to_date } in IST.
 * We'll map it to {from, to} for this page.
 */
export function getDefaultMonthRange() {
  const { from_date, to_date } = getISTCurrentMonthRange();
  return { from: from_date, to: to_date };
}

export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function parseYmd(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function toYmd(d) {
  if (!d) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function addDaysYmd(ymd, days) {
  const dt = parseYmd(ymd);
  if (!dt) return "";
  dt.setDate(dt.getDate() + days);
  return toYmd(dt);
}

export function diffDays(aYmd, bYmd) {
  const a = parseYmd(aYmd);
  const b = parseYmd(bYmd);
  if (!a || !b) return 0;
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function formatINR(n) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** Use your helper everywhere (consistent IST) */
export function formatDateTimeIST(value) {
  // includeTime=true default
  return formatToIST(value, true);
}

/** Small role helper */
export function isPrivilegedBranchPicker(role) {
  const r = (role || "").toString().trim().toLowerCase();
  return ["super_admin", "admin", "region_manager", "regional_manager"].includes(r);
}
