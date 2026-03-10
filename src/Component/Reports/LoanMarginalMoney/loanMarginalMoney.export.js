import ExcelJS from "exceljs";
import {saveAs} from "file-saver";

const FONT_NAME = "Arial";
const GREY_FILL = "FFC0C0C0";
const THIN = {style: "thin", color: {argb: "FF000000"}};
const ALL_BORDER = {top: THIN, left: THIN, bottom: THIN, right: THIN};
const NUM_FMT = '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)';

function n(v) {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
}

function d(v) {
    if (!v) return "";
    const x = new Date(v);
    if (Number.isNaN(x.getTime())) return String(v).slice(0, 10);
    return x;
}

function monthLabel(monthStart) {
    const x = new Date(monthStart);
    if (Number.isNaN(x.getTime())) return String(monthStart || "");
    return x.toLocaleDateString("en-US", {month: "short", year: "numeric"});
}

function monthLongLabel(monthStart) {
    const x = new Date(monthStart);
    if (Number.isNaN(x.getTime())) return String(monthStart || "");
    return x.toLocaleDateString("en-US", {month: "long", year: "numeric"});
}

function setCell(ws, ref, value, opts = {}) {
    const cell = ws.getCell(ref);
    cell.value = value;
    if (opts.font) cell.font = opts.font;
    if (opts.fill) cell.fill = opts.fill;
    if (opts.alignment) cell.alignment = opts.alignment;
    if (opts.border) cell.border = opts.border;
    if (opts.numFmt) cell.numFmt = opts.numFmt;
    return cell;
}

function fillHeaderRange(ws, range) {
    const [start, end] = range.split(":");
    const startCell = ws.getCell(start);
    const endCell = ws.getCell(end);

    for (let r = startCell.row; r <= endCell.row; r += 1) {
        for (let c = startCell.col; c <= endCell.col; c += 1) {
            const cell = ws.getRow(r).getCell(c);
            cell.font = {name: FONT_NAME, size: 10, bold: true};
            cell.fill = {type: "pattern", pattern: "solid", fgColor: {argb: GREY_FILL}};
            cell.alignment = {horizontal: "center", vertical: "center", wrapText: true};
            cell.border = ALL_BORDER;
        }
    }
}

function addBorderRect(ws, startRow, endRow, startCol, endCol) {
    for (let r = startRow; r <= endRow; r += 1) {
        for (let c = startCol; c <= endCol; c += 1) {
            ws.getRow(r).getCell(c).border = ALL_BORDER;
        }
    }
}

function setDataNumberFormats(ws, startRow, endRow, cols) {
    for (let r = startRow; r <= endRow; r += 1) {
        for (let c = 1; c <= ws.columnCount; c += 1) {
            ws.getRow(r).getCell(c).font = {name: FONT_NAME, size: 10};
            ws.getRow(r).getCell(c).alignment = {
                horizontal: c <= 2 ? "left" : "right",
                vertical: "center",
                wrapText: true,
            };
        }

        cols.forEach((c) => {
            ws.getRow(r).getCell(c).numFmt = NUM_FMT;
        });
    }
}

function applySheetBase(ws, title, leftMeta, rightMeta, thirdLine, totalCols) {
    ws.views = [{state: "frozen", ySplit: 6}];

    ws.mergeCells(1, 1, 1, totalCols);
    ws.mergeCells(2, 1, 2, Math.floor(totalCols / 2));
    ws.mergeCells(2, Math.floor(totalCols / 2) + 1, 2, totalCols);
    ws.mergeCells(3, 1, 3, totalCols);

    setCell(ws, "A1", title, {
        font: {name: FONT_NAME, size: 20, bold: true},
        alignment: {horizontal: "center", vertical: "center"},
    });

    setCell(ws, "A2", leftMeta, {
        font: {name: FONT_NAME, size: 12, bold: true},
        alignment: {horizontal: "left", vertical: "center"},
    });

    const rightMetaCell = ws.getRow(2).getCell(Math.floor(totalCols / 2) + 1).address;
    setCell(ws, rightMetaCell, rightMeta, {
        font: {name: FONT_NAME, size: 12, bold: true},
        alignment: {horizontal: "left", vertical: "center"},
    });

    setCell(ws, "A3", thirdLine, {
        font: {name: FONT_NAME, size: 12, bold: true},
        alignment: {horizontal: "left", vertical: "center"},
    });

    ws.getRow(1).height = 26.25;
    ws.getRow(2).height = 15.75;
    ws.getRow(3).height = 15.75;
}

function makeSumFormula(col, fromRow, toRow) {
    if (toRow < fromRow) return 0;
    return {formula: `SUM(${col}${fromRow}:${col}${toRow})`};
}

function buildOpenCloseSheet({
                                 workbook,
                                 sheetName,
                                 title,
                                 branchName,
                                 branchOfficerName,
                                 periodText,
                                 rows,
                             }) {
    const ws = workbook.addWorksheet(sheetName);

    applySheetBase(
        ws,
        title,
        `Branch Name: ${branchName || ""}`,
        `Branch Officer: ${branchOfficerName || ""}`,
        periodText,
        8
    );

    ws.mergeCells("A4:A6");
    ws.mergeCells("B4:B6");
    ws.mergeCells("C4:H4");
    ws.mergeCells("C5:D5");
    ws.mergeCells("E5:F5");
    ws.mergeCells("G5:H5");

    setCell(ws, "A4", "S#");
    setCell(ws, "B4", "Group");
    setCell(ws, "C4", "Marginal Money");
    setCell(ws, "C5", "Current Balance");
    setCell(ws, "E5", "Advance Added");
    setCell(ws, "G5", "Advance Deducted");
    setCell(ws, "C6", "Loans");
    setCell(ws, "D6", "Amount");
    setCell(ws, "E6", "Count");
    setCell(ws, "F6", "Amount");
    setCell(ws, "G6", "Count");
    setCell(ws, "H6", "Amount");

    fillHeaderRange(ws, "A4:H6");

    ws.getCell("A4").alignment = {horizontal: "left", vertical: "center", wrapText: true};
    ws.getCell("B4").alignment = {horizontal: "left", vertical: "center", wrapText: true};

    let row = 7;

    (rows || []).forEach((item, idx) => {
        ws.addRow([
            idx + 1,
            item.group_name || "",
            n(item.loans_with_advance),
            n(item.advance_balance_amt),
            n(item.advance_add_cnt),
            n(item.advance_add_amt),
            n(item.advance_deduct_cnt),
            n(item.advance_deduct_amt),
        ]);
        row += 1;
    });

    const dataStartRow = 7;
    const dataEndRow = row - 1;
    const totalRow = row;

    ws.addRow([
        "",
        "TOTAL",
        makeSumFormula("C", dataStartRow, dataEndRow),
        makeSumFormula("D", dataStartRow, dataEndRow),
        makeSumFormula("E", dataStartRow, dataEndRow),
        makeSumFormula("F", dataStartRow, dataEndRow),
        makeSumFormula("G", dataStartRow, dataEndRow),
        makeSumFormula("H", dataStartRow, dataEndRow),
    ]);

    ws.getRow(totalRow).font = {name: FONT_NAME, size: 10, bold: true};
    ws.getRow(totalRow).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {argb: "FFF2F2F2"},
    };

    addBorderRect(ws, 4, totalRow, 1, 8);
    setDataNumberFormats(ws, 7, totalRow, [3, 4, 5, 6, 7, 8]);

    ws.getColumn(1).width = 9.71;
    ws.getColumn(2).width = 24.0;
    ws.getColumn(3).width = 11.0;
    ws.getColumn(4).width = 12.0;
    ws.getColumn(5).width = 11.0;
    ws.getColumn(6).width = 12.0;
    ws.getColumn(7).width = 12.0;
    ws.getColumn(8).width = 12.0;
}

function buildDetailedSheet({
                                workbook,
                                branchName,
                                branchOfficerName,
                                monthStart,
                                branchRows,
                                openingBranch,
                                closingBranch,
                                closingCalc,
                            }) {
    const ws = workbook.addWorksheet("Detailed");

    applySheetBase(
        ws,
        "Loan Marginal Money Sheet",
        `Branch Name: ${branchName || ""}`,
        `Branch Officer: ${branchOfficerName || ""}`,
        `Month: ${monthLongLabel(monthStart)}`,
        8
    );

    ws.mergeCells("A4:A6");
    ws.mergeCells("B4:B6");
    ws.mergeCells("C4:H4");
    ws.mergeCells("C5:D5");
    ws.mergeCells("E5:F5");
    ws.mergeCells("G5:H5");

    setCell(ws, "A4", "Type");
    setCell(ws, "B4", "Date");
    setCell(ws, "C4", "Marginal Money");
    setCell(ws, "C5", "Advance Add");
    setCell(ws, "E5", "Advance Deduct");
    setCell(ws, "G5", "Balance");
    setCell(ws, "C6", "Count");
    setCell(ws, "D6", "Amount");
    setCell(ws, "E6", "Count");
    setCell(ws, "F6", "Amount");
    setCell(ws, "G6", "Loans");
    setCell(ws, "H6", "Amount");

    fillHeaderRange(ws, "A4:H6");
    ws.getRow(5).height = 31.5;

    ws.addRow([
        "Opening Balance",
        "",
        0,
        0,
        0,
        0,
        n(openingBranch?.loans_with_advance),
        n(openingBranch?.advance_balance_amt),
    ]);

    let currentWeek = null;
    let weekStartRow = null;

    function flushWeeklyTotal() {
        if (!currentWeek || !weekStartRow) return;

        const lastRegularRow = ws.lastRow.number;

        ws.addRow([
            "Weekly Total",
            "",
            makeSumFormula("C", weekStartRow, lastRegularRow),
            makeSumFormula("D", weekStartRow, lastRegularRow),
            makeSumFormula("E", weekStartRow, lastRegularRow),
            makeSumFormula("F", weekStartRow, lastRegularRow),
            {formula: `G${lastRegularRow}`},
            {formula: `H${lastRegularRow}`},
        ]);

        const totalRow = ws.lastRow.number;
        ws.getRow(totalRow).font = {name: FONT_NAME, size: 10, bold: true};
        ws.getRow(totalRow).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {argb: "FFF2F2F2"},
        };

        currentWeek = null;
        weekStartRow = null;
    }

    (branchRows || []).forEach((item) => {
        const dt = d(item.txn_date);
        const weekKey =
            dt instanceof Date
                ? `${dt.getFullYear()}-${Math.ceil(dt.getDate() / 7)}`
                : String(item.txn_date || "");

        if (currentWeek !== null && currentWeek !== weekKey) {
            flushWeeklyTotal();
        }

        if (currentWeek === null) {
            currentWeek = weekKey;
            weekStartRow = ws.lastRow.number + 1;
        }

        ws.addRow([
            "Daily Movement",
            dt,
            n(item.advance_add_cnt),
            n(item.advance_add_amt),
            n(item.advance_deduct_cnt),
            n(item.advance_deduct_amt),
            n(item.loans_with_advance),
            n(item.balance_amt),
        ]);
    });

    flushWeeklyTotal();

    const firstDataRow = 8;
    const lastDataRowBeforeClosing = ws.lastRow.number;

    ws.addRow([
        "Month Closing",
        "",
        makeSumFormula("C", firstDataRow, lastDataRowBeforeClosing),
        makeSumFormula("D", firstDataRow, lastDataRowBeforeClosing),
        makeSumFormula("E", firstDataRow, lastDataRowBeforeClosing),
        makeSumFormula("F", firstDataRow, lastDataRowBeforeClosing),
        n(closingBranch?.loans_with_advance),
        n(closingCalc?.closing_balance_amt ?? closingBranch?.advance_balance_amt),
    ]);

    const closingRow = ws.lastRow.number;
    ws.getRow(closingRow).font = {name: FONT_NAME, size: 10, bold: true};
    ws.getRow(closingRow).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {argb: "FFE8F4EA"},
    };

    addBorderRect(ws, 4, ws.lastRow.number, 1, 8);
    setDataNumberFormats(ws, 7, ws.lastRow.number, [3, 4, 5, 6, 7, 8]);

    for (let r = 8; r <= ws.lastRow.number; r += 1) {
        const dateCell = ws.getRow(r).getCell(2);
        if (dateCell.value instanceof Date) {
            dateCell.numFmt = "dd-mmm-yy";
            dateCell.alignment = {horizontal: "left", vertical: "center"};
        }
    }

    ws.getColumn(1).width = 21.43;
    ws.getColumn(2).width = 15.29;
    ws.getColumn(3).width = 11.0;
    ws.getColumn(4).width = 12.0;
    ws.getColumn(5).width = 12.0;
    ws.getColumn(6).width = 12.0;
    ws.getColumn(7).width = 11.0;
    ws.getColumn(8).width = 14.0;
}

export async function exportLoanMarginalMoneyExcel({
                                                       data,
                                                       branchName,
                                                       branchOfficerName,
                                                       monthStart,
                                                   }) {
    if (!data) throw new Error("No data available to export.");

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "OpenAI";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.company = "Loan Marginal Money Export";

    buildOpenCloseSheet({
        workbook,
        sheetName: "Opening Balance",
        title: "Loan Marginal Money (Opening Balance)",
        branchName,
        branchOfficerName,
        periodText: `Year: ${new Date(monthStart).getFullYear() || ""}`,
        rows: data?.opening || [],
    });

    buildOpenCloseSheet({
        workbook,
        sheetName: "Closing Balance",
        title: "Loan Marginal Money (Closing Balance)",
        branchName,
        branchOfficerName,
        periodText: `Month: ${monthLabel(monthStart)}`,
        rows: data?.closing || [],
    });

    buildDetailedSheet({
        workbook,
        branchName,
        branchOfficerName,
        monthStart,
        branchRows: data?.detailed_branch || [],
        openingBranch: data?.opening_branch || {},
        closingBranch: data?.closing_branch || {},
        closingCalc: data?.closing_branch_calc || {},
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Loan Marginal Money - ${monthLongLabel(monthStart)}.xlsx`;

    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
    );
}