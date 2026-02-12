import ExcelJS from "exceljs";
import {saveAs} from "file-saver";

function toDateOnlyStr(v) {
    if (!v) return "";
    return String(v).slice(0, 10);
}

function parseToDate(v) {
    const s = toDateOnlyStr(v);
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return null;

    // ✅ real Date at midnight (prevents .77 / fractions)
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ✅ TEXT date formatter => "Thu, 10-Feb-2026"
function formatDisbursedDateText(v) {
    const dt = parseToDate(v);
    if (!dt) return "";
    const wk = dt.toLocaleDateString("en-GB", {weekday: "short"}); // Thu
    const dd = String(dt.getDate()).padStart(2, "0"); // 10
    const mon = dt.toLocaleDateString("en-GB", {month: "short"}); // Feb
    const yy = dt.getFullYear(); // 2026
    return `${wk}, ${dd}-${mon}-${yy}`;
}

function fmtHeaderDateRange(fromDraft, toDraft) {
    const f = parseToDate(fromDraft);
    const t = parseToDate(toDraft);
    if (!f || !t) return `From ${fromDraft || "-"} To ${toDraft || "-"}`;

    const day = (dt) => dt.toLocaleDateString("en-GB", {weekday: "short"});
    const dmy = (dt) => dt.toLocaleDateString("en-GB");
    return `From ${day(f)}, ${dmy(f)} To ${day(t)}, ${dmy(t)}`;
}

function applyAllBorders(ws, startRow, startCol, endRow, endCol) {
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            ws.getCell(r, c).border = {
                top: {style: "thin"},
                left: {style: "thin"},
                bottom: {style: "thin"},
                right: {style: "thin"},
            };
        }
    }
}

function autoFitColumns(ws, min = 6, max = 50) {
    ws.columns.forEach((col) => {
        let best = min;
        col.eachCell({includeEmpty: true}, (cell) => {
            const v = cell.value;
            let text = "";
            if (v == null) text = "";
            else if (v instanceof Date) text = "Thu, 10-Feb-2026";
            else if (typeof v === "object" && v.formula) text = String(v.formula);
            else text = String(v);
            best = Math.max(best, Math.min(max, text.length + 2));
        });
        col.width = best;
    });
}

/** ISO-ish week key (Mon start) */
function getWeekKeyMonStart(d) {
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = dt.getDay() === 0 ? 7 : dt.getDay();
    dt.setDate(dt.getDate() + (4 - day));
    const yearStart = new Date(dt.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
    return `${dt.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getMonthKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function setRowStyle(ws, rowIdx, style) {
    ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => {
        ws.getCell(`${col}${rowIdx}`).style = style;
    });
    ws.getCell(`G${rowIdx}`).numFmt = "#,##0.00";
    ws.getCell(`H${rowIdx}`).numFmt = "#,##0.00";
    ws.getRow(rowIdx).height = 18;
}

function sumOfCellsFormula(col, rowList) {
    if (!rowList.length) return "0";
    const refs = rowList.map((r) => `${col}${r}`).join(",");
    return `SUM(${refs})`;
}

export async function exportLoanMasterRollExcel({
                                                    rows,
                                                    fromDate,
                                                    toDate,
                                                    branchName,
                                                    regionName,
                                                    meetingDayByGroupId,
                                                }) {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) return;

    // group by day
    const dailyMap = new Map();
    for (const r of safeRows) {
        const key = toDateOnlyStr(r.disburse_date) || "NO_DATE";
        if (!dailyMap.has(key)) dailyMap.set(key, []);
        dailyMap.get(key).push(r);
    }

    const dailyKeys = [...dailyMap.keys()].sort((a, b) => {
        if (a === "NO_DATE") return 1;
        if (b === "NO_DATE") return -1;
        return a.localeCompare(b);
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Sheet1");

    ws.columns = [
        {width: 6},
        {width: 30},
        {width: 26},
        {width: 20},
        {width: 14},
        {width: 24},
        {width: 18},
        {width: 28},
    ];

    // styles
    const titleStyle = {
        font: {name: "Arial", size: 20, bold: true},
        alignment: {horizontal: "center", vertical: "middle"},
    };
    const subTitleStyle = {
        font: {name: "Arial", size: 15, bold: true},
        alignment: {horizontal: "center", vertical: "middle"},
    };
    const infoStyle = {
        font: {name: "Arial", size: 12, bold: true},
        alignment: {horizontal: "left", vertical: "middle", wrapText: true, shrinkToFit: true},
    };
    const headerGrey = {
        font: {name: "Arial", size: 10, bold: true},
        alignment: {horizontal: "center", vertical: "middle", wrapText: true, shrinkToFit: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFC0C0C0"}},
    };
    const dataStyle = {
        font: {name: "Microsoft Sans Serif", size: 10},
        alignment: {vertical: "middle", wrapText: true, shrinkToFit: true},
    };
    const dailyTotalStyle = {
        font: {name: "Tahoma", size: 10, bold: true},
        alignment: {vertical: "middle", wrapText: true, shrinkToFit: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFD3D3D3"}},
    };
    const weeklyTotalStyle = {
        font: {name: "Tahoma", size: 10, bold: true},
        alignment: {vertical: "middle", wrapText: true, shrinkToFit: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFB7DEE8"}},
    };
    const monthlyTotalStyle = {
        font: {name: "Tahoma", size: 10, bold: true},
        alignment: {vertical: "middle", wrapText: true, shrinkToFit: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFFCD5B4"}},
    };
    const grandTotalStyle = {
        font: {name: "Tahoma", size: 11, bold: true},
        alignment: {vertical: "middle", wrapText: true, shrinkToFit: true},
        fill: {type: "pattern", pattern: "solid", fgColor: {argb: "FFC6EFCE"}},
    };

    // header
    ws.mergeCells("A1:H1");
    ws.getCell("A1").value = "Loan Disbursement Master Roll";
    ws.getCell("A1").style = titleStyle;
    ws.getRow(1).height = 26;

    ws.mergeCells("A2:H2");
    ws.getCell("A2").value = "All Loan";
    ws.getCell("A2").style = subTitleStyle;
    ws.getRow(2).height = 20;

    ws.mergeCells("A3:D3");
    ws.mergeCells("E3:H3");
    const bn = branchName || "-";
    const rn = regionName ? ` | Region: ${regionName}` : "";
    ws.getCell("A3").value = `Branch Name: ${bn}${rn}`;
    ws.getCell("E3").value = fmtHeaderDateRange(fromDate, toDate);
    ws.getCell("A3").style = infoStyle;
    ws.getCell("E3").style = infoStyle;

    ws.mergeCells("A4:A5");
    ws.mergeCells("B4:B5");
    ws.mergeCells("C4:C5");
    ws.mergeCells("D4:D5");
    ws.mergeCells("E4:E5");
    ws.mergeCells("F4:H4");

    ws.getCell("A4").value = "Sl No";
    ws.getCell("B4").value = "Borrower Name";
    ws.getCell("C4").value = "Loan Account Number";
    ws.getCell("D4").value = "Group Name";
    ws.getCell("E4").value = "Meeting Day";
    ws.getCell("F4").value = "Loan Disbursed";

    ws.getCell("F5").value = "Disbursed Date";
    ws.getCell("G5").value = "Principal Amount";
    ws.getCell("H5").value = "Disbursed Amount (With Interest)";

    ["A4", "B4", "C4", "D4", "E4", "F4", "F5", "G5", "H5"].forEach((addr) => (ws.getCell(addr).style = headerGrey));
    ws.getRow(4).height = 20;
    ws.getRow(5).height = 18;

    // totals tracking
    const dailyTotalRowsByWeek = new Map();
    const weeklyTotalRowsByMonth = new Map();
    const monthlyTotalRows = [];

    let excelRow = 6;
    let serial = 1;

    for (let i = 0; i < dailyKeys.length; i++) {
        const dayKey = dailyKeys[i];
        const dayRows = dailyMap.get(dayKey) || [];

        const dayDate = dayKey !== "NO_DATE" ? parseToDate(dayKey) : null;
        const weekKey = dayDate ? getWeekKeyMonStart(dayDate) : "NO_WEEK";
        const monthKey = dayDate ? getMonthKey(dayDate) : "NO_MONTH";

        // write data
        for (const r of dayRows) {
            ws.getCell(`A${excelRow}`).value = serial++;
            ws.getCell(`A${excelRow}`).numFmt = "0";

            ws.getCell(`B${excelRow}`).value = r.member_name ?? "";
            ws.getCell(`C${excelRow}`).value = r.loan_account_no ?? "";
            ws.getCell(`D${excelRow}`).value = r.group_name ?? "";
            ws.getCell(`E${excelRow}`).value = meetingDayByGroupId?.[String(r.group_id)] || "";

            // ✅ FINAL FIX: write as TEXT to prevent Excel number date
            ws.getCell(`F${excelRow}`).value = formatDisbursedDateText(r.disburse_date);
            ws.getCell(`F${excelRow}`).numFmt = "@"; // text

            ws.getCell(`G${excelRow}`).value = Number(r.principal_amount ?? 0) || 0;
            ws.getCell(`H${excelRow}`).value = Number(r.total_disbursed_amount ?? 0) || 0;

            ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((col) => (ws.getCell(`${col}${excelRow}`).style = dataStyle));
            ws.getCell(`G${excelRow}`).numFmt = "#,##0.00";
            ws.getCell(`H${excelRow}`).numFmt = "#,##0.00";
            ws.getRow(excelRow).height = 18;

            excelRow++;
        }

        // daily total
        const dayEndDataRow = excelRow - 1;
        const dayStartDataRow = dayEndDataRow - dayRows.length + 1;

        ws.getCell(`B${excelRow}`).value = "Daily Total";
        ws.getCell(`G${excelRow}`).value = {formula: `SUM(G${dayStartDataRow}:G${dayEndDataRow})`};
        ws.getCell(`H${excelRow}`).value = {formula: `SUM(H${dayStartDataRow}:H${dayEndDataRow})`};
        setRowStyle(ws, excelRow, dailyTotalStyle);

        if (!dailyTotalRowsByWeek.has(weekKey)) dailyTotalRowsByWeek.set(weekKey, []);
        dailyTotalRowsByWeek.get(weekKey).push(excelRow);
        excelRow++;

        // look ahead
        const nextDayKey = dailyKeys[i + 1];
        const nextDayDate = nextDayKey && nextDayKey !== "NO_DATE" ? parseToDate(nextDayKey) : null;
        const nextWeekKey = nextDayDate ? getWeekKeyMonStart(nextDayDate) : "NO_WEEK";
        const nextMonthKey = nextDayDate ? getMonthKey(nextDayDate) : "NO_MONTH";

        // weekly total = sum of daily totals
        const weekEndsHere = weekKey !== "NO_WEEK" && (i === dailyKeys.length - 1 || nextWeekKey !== weekKey);
        if (weekEndsHere) {
            const dailyTotalRows = dailyTotalRowsByWeek.get(weekKey) || [];
            ws.getCell(`B${excelRow}`).value = "Weekly Total";
            ws.getCell(`G${excelRow}`).value = {formula: sumOfCellsFormula("G", dailyTotalRows)};
            ws.getCell(`H${excelRow}`).value = {formula: sumOfCellsFormula("H", dailyTotalRows)};
            setRowStyle(ws, excelRow, weeklyTotalStyle);

            if (!weeklyTotalRowsByMonth.has(monthKey)) weeklyTotalRowsByMonth.set(monthKey, []);
            weeklyTotalRowsByMonth.get(monthKey).push(excelRow);

            excelRow++;
        }

        // monthly total = sum of weekly totals
        const monthEndsHere = monthKey !== "NO_MONTH" && (i === dailyKeys.length - 1 || nextMonthKey !== monthKey);
        if (monthEndsHere) {
            const weeklyRows = weeklyTotalRowsByMonth.get(monthKey) || [];
            ws.getCell(`B${excelRow}`).value = "Monthly Total";
            ws.getCell(`G${excelRow}`).value = {formula: sumOfCellsFormula("G", weeklyRows)};
            ws.getCell(`H${excelRow}`).value = {formula: sumOfCellsFormula("H", weeklyRows)};
            setRowStyle(ws, excelRow, monthlyTotalStyle);

            monthlyTotalRows.push(excelRow);
            excelRow++;
        }
    }

    // grand total = sum of monthly totals
    ws.getCell(`B${excelRow}`).value = "Grand Total";
    ws.getCell(`G${excelRow}`).value = {formula: sumOfCellsFormula("G", monthlyTotalRows)};
    ws.getCell(`H${excelRow}`).value = {formula: sumOfCellsFormula("H", monthlyTotalRows)};
    setRowStyle(ws, excelRow, grandTotalStyle);
    excelRow++;

    // borders + fit
    const lastRow = excelRow - 1;
    applyAllBorders(ws, 1, 1, lastRow, 8);
    autoFitColumns(ws, 6, 55);

    ws.pageSetup = {fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape"};

    const filename = `Loan_Disbursement_Master_Roll_${fromDate || "from"}_to_${toDate || "to"}.xlsx`;
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), filename);
}
