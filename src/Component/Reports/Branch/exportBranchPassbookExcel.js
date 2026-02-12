import ExcelJS from "exceljs";
import {saveAs} from "file-saver";

/* =========================
   helpers
========================= */
function safe(v) {
    return v == null ? "" : String(v);
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function fmtYmd(v) {
    if (!v) return "";
    return String(v).slice(0, 10);
}

function parseYmdToDate(ymd) {
    if (!ymd) return null;
    const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dmy(ymd) {
    const dt = parseYmdToDate(ymd);
    if (!dt) return ymd || "";
    return dt.toLocaleDateString("en-GB");
}

function isWeekend(dt) {
    const day = dt.getDay();
    return day === 0 || day === 6;
}

function parseRemark(remark) {
    const parts = safe(remark)
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

    return {
        loanAccNo: parts[0] || "",
        memberName: parts[2] || "",
        groupName: parts[3] || "",
        description: parts[4] || parts.slice(4).join(" | ") || "",
    };
}

function borderAllThin(cell) {
    cell.border = {
        top: {style: "thin"},
        left: {style: "thin"},
        bottom: {style: "thin"},
        right: {style: "thin"},
    };
}

function fillGrey(cell) {
    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {argb: "FFD9D9D9"},
    };
}

function fillLight(cell) {
    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {argb: "FFF3F4F6"},
    };
}

function bold(cell) {
    cell.font = {...(cell.font || {}), bold: true};
}

/* =========================
   classification (edit if needed)
========================= */
function classifyTxn(r) {
    const t = safe(r?.txn_type || r?.type || "").toLowerCase();
    const ref = safe(r?.ref_table || "").toLowerCase();
    const narration = safe(r?.remark || r?.narration || "").toLowerCase();

    if (t.includes("disbur") || narration.includes("disbur")) return "Loan Disbursed";

    if (
        t.includes("charge") ||
        narration.includes("charge") ||
        ref.includes("charge") ||
        narration.includes("processing fee") ||
        narration.includes("insurance")
    )
        return "Charge Collected";

    if (
        t.includes("install") ||
        t.includes("emi") ||
        t.includes("repay") ||
        narration.includes("install") ||
        narration.includes("emi") ||
        narration.includes("repay")
    )
        return "Installment Collection";

    return "Other";
}

/* =========================
   clustering
========================= */
function normalizeRows(rows) {
    return (rows || [])
        .map((r) => {
            const date = fmtYmd(r?.txn_date || r?.date || r?.created_on);
            const credit = num(r?.credit);
            const debit = num(r?.debit);
            const category = classifyTxn(r);
            const {loanAccNo, memberName, groupName, description} = parseRemark(
                r?.remark || r?.narration || ""
            );
            return {
                raw: r,
                date,
                category,
                credit,
                debit,
                loanAccNo,
                memberName,
                groupName,
                description,
            };
        })
        .filter((x) => x.date);
}

function clusterRows(rows) {
    const normalized = normalizeRows(rows);
    normalized.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const map = new Map();
    for (const x of normalized) {
        const key = `${x.date}||${x.category}`;
        if (!map.has(key)) {
            map.set(key, {date: x.date, category: x.category, count: 0, credit: 0, debit: 0});
        }
        const g = map.get(key);
        g.count += 1;
        g.credit += x.credit;
        g.debit += x.debit;
    }

    const priority = {
        "Loan Disbursed": 1,
        "Charge Collected": 2,
        "Installment Collection": 3,
        Other: 99,
    };

    const grouped = Array.from(map.values());
    grouped.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return (priority[a.category] || 50) - (priority[b.category] || 50);
    });

    return grouped.map((g) => ({
        date: g.date,
        category: g.category,
        description: `${g.category} (${g.count} txns)`,
        credit: g.credit,
        debit: g.debit,
    }));
}

/* =========================
   cash-in-hand (UPDATED)
   - add opening column
   - remove net column
========================= */
function startOfWeek(dt, weekStart = "MON") {
    const d = new Date(dt.getTime());
    const day = d.getDay();
    const startDay = weekStart === "SUN" ? 0 : 1;
    const diff = (day - startDay + 7) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function fmtWeekLabel(dt, weekStart) {
    const s = startOfWeek(dt, weekStart);
    const e = new Date(s.getTime());
    e.setDate(e.getDate() + 6);
    return `${fmtYmd(s.toISOString())} to ${fmtYmd(e.toISOString())}`;
}

function fmtMonthLabel(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function buildCashInHandTables(detailedRows, openingBalance, weekStart) {
    const normalized = normalizeRows(detailedRows);

    const byDay = new Map();
    for (const r of normalized) {
        if (!byDay.has(r.date)) byDay.set(r.date, {cashIn: 0, cashOut: 0});
        const g = byDay.get(r.date);
        g.cashIn += num(r.credit);
        g.cashOut += num(r.debit);
    }

    const dates = Array.from(byDay.keys()).sort();
    const daily = [];

    let prevClose = num(openingBalance);
    for (const ymd of dates) {
        const dt = parseYmdToDate(ymd);
        const v = byDay.get(ymd);

        const open = prevClose;
        const close = open + v.cashIn - v.cashOut;

        daily.push({
            period: ymd,
            periodLabel: dmy(ymd),
            opening: open,
            cashIn: v.cashIn,
            cashOut: v.cashOut,
            closing: close,
            isWeekend: dt ? isWeekend(dt) : false,
        });

        prevClose = close;
    }

    // weekly
    const byWeek = new Map();
    for (const row of daily) {
        const dt = parseYmdToDate(row.period);
        const wkKey = fmtWeekLabel(dt, weekStart);
        if (!byWeek.has(wkKey)) byWeek.set(wkKey, {cashIn: 0, cashOut: 0});
        const w = byWeek.get(wkKey);
        w.cashIn += row.cashIn;
        w.cashOut += row.cashOut;
    }

    const weeklyKeys = Array.from(byWeek.keys()).sort();
    const weekly = [];
    let prevWClose = num(openingBalance);
    for (const k of weeklyKeys) {
        const w = byWeek.get(k);
        const open = prevWClose;
        const close = open + w.cashIn - w.cashOut;
        weekly.push({period: k, opening: open, cashIn: w.cashIn, cashOut: w.cashOut, closing: close});
        prevWClose = close;
    }

    // monthly
    const byMonth = new Map();
    for (const row of daily) {
        const dt = parseYmdToDate(row.period);
        const mKey = fmtMonthLabel(dt);
        if (!byMonth.has(mKey)) byMonth.set(mKey, {cashIn: 0, cashOut: 0});
        const m = byMonth.get(mKey);
        m.cashIn += row.cashIn;
        m.cashOut += row.cashOut;
    }

    const monthKeys = Array.from(byMonth.keys()).sort();
    const monthly = [];
    let prevMClose = num(openingBalance);
    for (const k of monthKeys) {
        const m = byMonth.get(k);
        const open = prevMClose;
        const close = open + m.cashIn - m.cashOut;
        monthly.push({period: k, opening: open, cashIn: m.cashIn, cashOut: m.cashOut, closing: close});
        prevMClose = close;
    }

    return {daily, weekly, monthly};
}

/* =========================
   sheet builders
========================= */
function setCols(ws, widths) {
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
}

function styleHeaderRow(ws, rowNo, colCount) {
    ws.getRow(rowNo).font = {bold: true};
    ws.getRow(rowNo).alignment = {horizontal: "center", vertical: "middle"};
    ws.getRow(rowNo).height = 18;
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(rowNo, c);
        fillGrey(cell);
        borderAllThin(cell);
    }
}

function styleGreyRow(ws, rowNo, colCount) {
    ws.getRow(rowNo).font = {bold: true};
    for (let c = 1; c <= colCount; c++) {
        const cell = ws.getCell(rowNo, c);
        fillGrey(cell);
        borderAllThin(cell);
    }
}

/* unchanged buildClusteredSheet(...) from your code */

/* =========================
   Cash sheet table (UPDATED)
   - add opening column
   - remove net column
========================= */
function addCashTable(ws, startRow, title, rows, {highlightWeekends = false} = {}) {
    ws.mergeCells(startRow, 1, startRow, 5);
    ws.getCell(startRow, 1).value = title;
    ws.getCell(startRow, 1).font = {bold: true, size: 13};
    ws.getCell(startRow, 1).alignment = {horizontal: "left", vertical: "middle"};

    const headerRow = startRow + 1;
    ws.getRow(headerRow).values = ["Period", "Opening Balance", "Cash In", "Cash Out", "Closing Balance"];
    styleHeaderRow(ws, headerRow, 5);

    let r = headerRow + 1;
    rows.forEach((x) => {
        ws.getCell(r, 1).value = x.periodLabel || x.period;
        ws.getCell(r, 2).value = num(x.opening);
        ws.getCell(r, 3).value = num(x.cashIn);
        ws.getCell(r, 4).value = num(x.cashOut);
        ws.getCell(r, 5).value = num(x.closing);

        [2, 3, 4, 5].forEach((c) => {
            ws.getCell(r, c).numFmt = "#,##0.00";
            ws.getCell(r, c).alignment = {horizontal: "right", vertical: "middle"};
        });
        ws.getCell(r, 1).alignment = {horizontal: "left", vertical: "middle"};

        for (let c = 1; c <= 5; c++) borderAllThin(ws.getCell(r, c));

        if (highlightWeekends && x.isWeekend) {
            for (let c = 1; c <= 5; c++) fillLight(ws.getCell(r, c));
        }

        r += 1;
    });

    // TOTAL row (no net)
    const totalRow = r;
    ws.getCell(totalRow, 1).value = "TOTAL";
    ws.getCell(totalRow, 2).value = {formula: `B${headerRow + 1}`}; // opening of first row
    ws.getCell(totalRow, 3).value = {formula: `SUM(C${headerRow + 1}:C${totalRow - 1})`};
    ws.getCell(totalRow, 4).value = {formula: `SUM(D${headerRow + 1}:D${totalRow - 1})`};
    ws.getCell(totalRow, 5).value = {formula: `E${totalRow - 1}`}; // last closing

    for (let c = 1; c <= 5; c++) {
        const cell = ws.getCell(totalRow, c);
        fillGrey(cell);
        borderAllThin(cell);
        bold(cell);
    }
    [2, 3, 4, 5].forEach((c) => {
        ws.getCell(totalRow, c).numFmt = "#,##0.00";
        ws.getCell(totalRow, c).alignment = {horizontal: "right", vertical: "middle"};
    });

    return totalRow + 2;
}

/* =========================
   Cash sheet (UPDATED widths)
========================= */
function buildCashInHandSheet({ws, branchLabel, fromDate, toDate, rows, opening, weekStart}) {
    // Period | Opening | Cash In | Cash Out | Closing
    setCols(ws, [22, 18, 16, 16, 18]);

    ws.mergeCells(1, 1, 1, 5);
    ws.getCell(1, 1).value = "Cash In Hand (Daily / Weekly / Monthly)";
    ws.getCell(1, 1).font = {bold: true, size: 16, name: "Arial Black"};
    ws.getCell(1, 1).alignment = {horizontal: "center", vertical: "middle"};
    ws.getRow(1).height = 24;

    ws.mergeCells(2, 1, 2, 3);
    ws.getCell(2, 1).value = `Branch: ${branchLabel || "-"}`;
    ws.getCell(2, 1).font = {bold: true};

    ws.mergeCells(2, 4, 2, 5);
    ws.getCell(2, 4).value = `Date: ${fromDate} to ${toDate}`;
    ws.getCell(2, 4).font = {bold: true};
    ws.getCell(2, 4).alignment = {horizontal: "right"};

    ws.getCell(3, 1).value = "Opening Balance";
    ws.getCell(3, 2).value = num(opening);
    ws.getCell(3, 2).numFmt = "#,##0.00";
    ws.getCell(3, 2).alignment = {horizontal: "right"};
    bold(ws.getCell(3, 1));
    bold(ws.getCell(3, 2));

    const {daily, weekly, monthly} = buildCashInHandTables(rows, opening, weekStart);

    let startRow = 5;
    startRow = addCashTable(ws, startRow, "Daily Cash In Hand", daily, {highlightWeekends: true});
    startRow = addCashTable(ws, startRow, `Weekly Cash In Hand (Week starts ${weekStart})`, weekly);
    startRow = addCashTable(ws, startRow, "Monthly Cash In Hand", monthly);
}

function buildClusteredSheet({ ws, branchLabel, fromDate, toDate, rows, opening }) {
    // A Date | B Category | C Description | D Credit | E Debit | F Balance
    const headers = ["Date", "Category", "Description", "Credit", "Debit", "Balance"];
    setCols(ws, [14, 22, 40, 16, 16, 18]);

    ws.mergeCells(1, 1, 1, 6);
    ws.getCell(1, 1).value = "Passbook (Clustered Summary)";
    ws.getCell(1, 1).font = { bold: true, size: 16, name: "Arial Black" };
    ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 24;

    ws.mergeCells(2, 1, 2, 3);
    ws.getCell(2, 1).value = `Branch: ${branchLabel || "-"}`;
    ws.getCell(2, 1).font = { bold: true };

    ws.mergeCells(2, 4, 2, 6);
    ws.getCell(2, 4).value = `Date: ${fromDate} to ${toDate}`;
    ws.getCell(2, 4).font = { bold: true };
    ws.getCell(2, 4).alignment = { horizontal: "right" };

    const HEADER_ROW = 3;
    ws.getRow(HEADER_ROW).values = headers;
    styleHeaderRow(ws, HEADER_ROW, 6);

    const OPEN_ROW = 4;
    ws.getCell(OPEN_ROW, 2).value = "***Opening Balance***";
    ws.getCell(OPEN_ROW, 6).value = num(opening);
    ws.getCell(OPEN_ROW, 6).numFmt = "#,##0.00";
    ws.getCell(OPEN_ROW, 6).alignment = { horizontal: "right", vertical: "middle" };
    styleGreyRow(ws, OPEN_ROW, 6);

    const clustered = clusterRows(rows);
    const DATA_START = 5;

    clustered.forEach((r, i) => {
        const rowIndex = DATA_START + i;

        ws.getCell(rowIndex, 1).value = r.date;
        ws.getCell(rowIndex, 2).value = r.category;
        ws.getCell(rowIndex, 3).value = r.description;

        ws.getCell(rowIndex, 4).value = num(r.credit);
        ws.getCell(rowIndex, 5).value = num(r.debit);

        // Balance = prev + credit - debit
        ws.getCell(rowIndex, 6).value = {
            formula: `F${rowIndex - 1}+D${rowIndex}-E${rowIndex}`,
        };

        ws.getCell(rowIndex, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws.getCell(rowIndex, 2).alignment = { horizontal: "left", vertical: "middle" };

        [4, 5, 6].forEach((col) => {
            ws.getCell(rowIndex, col).numFmt = "#,##0.00";
            ws.getCell(rowIndex, col).alignment = { horizontal: "right", vertical: "middle" };
        });

        for (let c = 1; c <= 6; c++) borderAllThin(ws.getCell(rowIndex, c));
    });

    const lastDataRow = DATA_START + clustered.length - 1;
    const CLOSE_ROW = lastDataRow + 1;

    ws.getCell(CLOSE_ROW, 2).value = "***Closing Balance***";
    ws.getCell(CLOSE_ROW, 4).value = { formula: `SUM(D${DATA_START}:D${lastDataRow})` };
    ws.getCell(CLOSE_ROW, 5).value = { formula: `SUM(E${DATA_START}:E${lastDataRow})` };
    ws.getCell(CLOSE_ROW, 6).value = { formula: `F${lastDataRow}` };

    styleGreyRow(ws, CLOSE_ROW, 6);

    [4, 5, 6].forEach((col) => {
        ws.getCell(CLOSE_ROW, col).numFmt = "#,##0.00";
        ws.getCell(CLOSE_ROW, col).alignment = { horizontal: "right", vertical: "middle" };
    });
}


/* =========================
   export main (unchanged)
========================= */
export async function exportBranchPassbookExcel({
                                                    exportFileName = "branch_passbook.xlsx",
                                                    branchName = "",
                                                    branchId = "",
                                                    fromDate = "",
                                                    toDate = "",
                                                    rows = [],
                                                    summary = null,
                                                    weekStart = "MON",
                                                }) {
    const wb = new ExcelJS.Workbook();

    const branchLabel = branchName?.trim() ? branchName.trim() : safe(branchId);
    const opening = num(summary?.opening);

    const wsClustered = wb.addWorksheet("Passbook (Clustered)");
    buildClusteredSheet({
        ws: wsClustered,
        branchLabel,
        fromDate,
        toDate,
        rows,
        opening,
    });

    const wsCash = wb.addWorksheet("Cash In Hand");
    buildCashInHandSheet({
        ws: wsCash,
        branchLabel,
        fromDate,
        toDate,
        rows,
        opening,
        weekStart,
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), exportFileName);
}
