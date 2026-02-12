import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
    };
}

function fillGrey(cell) {
    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9D9D9" },
    };
}

export async function exportBranchPassbookExcel({
                                                    exportFileName = "branch_passbook.xlsx",
                                                    branchName = "",
                                                    branchId = "",
                                                    fromDate = "",
                                                    toDate = "",
                                                    rows = [],
                                                    summary = null,
                                                }) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Branch Passbook");

    const branchLabel = branchName?.trim() ? branchName.trim() : safe(branchId);

    // A Date | B Loan Account No | C Member Name | D Group Name | E Description | F Credit | G Debit | H Balance
    const headers = [
        "Date",
        "Loan Account No",
        "Member Name",
        "Group Name",
        "Description",
        "Credit",
        "Debit",
        "Balance",
    ];

    // widths
    const widths = [14, 18, 24, 18, 34, 14, 14, 16];
    widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

    // ===== Title row =====
    ws.mergeCells(1, 1, 1, 8);
    ws.getCell(1, 1).value = "Cash/Bank Book";
    ws.getCell(1, 1).font = { bold: true, size: 16 , name: "Aerial Black"};
    ws.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 24;

    // ===== Branch + Date row =====
    ws.mergeCells(2, 1, 2, 4);
    ws.getCell(2, 1).value = `Branch Name: ${branchLabel || "-"}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(2, 1).alignment = { vertical: "middle", horizontal: "left" };

    ws.mergeCells(2, 5, 2, 8);
    ws.getCell(2, 5).value = `Date: ${fromDate} to ${toDate}`;
    ws.getCell(2, 5).font = { bold: true };
    ws.getCell(2, 5).alignment = { vertical: "middle", horizontal: "right" };

    // ===== Header row =====
    const HEADER_ROW = 3;
    ws.getRow(HEADER_ROW).values = headers;
    ws.getRow(HEADER_ROW).font = { bold: true };
    ws.getRow(HEADER_ROW).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(HEADER_ROW).height = 18;

    for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(HEADER_ROW, c);
        fillGrey(cell);
        borderAllThin(cell);
    }

    // ❌ No freeze rows (removed ws.views)

    // ===== Opening Balance row =====
    const opening = num(summary?.opening);
    const OPEN_ROW = 4;

    ws.getCell(OPEN_ROW, 3).value = "***Opening Balance***";
    ws.getCell(OPEN_ROW, 8).value = opening;

    ws.getRow(OPEN_ROW).font = { bold: true };
    for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(OPEN_ROW, c);
        fillGrey(cell);
        borderAllThin(cell);
    }
    ws.getCell(OPEN_ROW, 8).numFmt = "#,##0.00";
    ws.getCell(OPEN_ROW, 8).alignment = { horizontal: "right", vertical: "middle" };

    // ===== Data rows =====
    const DATA_START = 5;

    rows.forEach((r, i) => {
        const rowIndex = DATA_START + i;

        const date = fmtYmd(r?.txn_date || r?.date || r?.created_on);
        const credit = num(r?.credit);
        const debit = num(r?.debit);

        const { loanAccNo, memberName, groupName, description } = parseRemark(
            r?.remark || r?.narration || ""
        );

        ws.getCell(rowIndex, 1).value = date;
        ws.getCell(rowIndex, 2).value = loanAccNo;
        ws.getCell(rowIndex, 3).value = memberName;
        ws.getCell(rowIndex, 4).value = groupName;
        ws.getCell(rowIndex, 5).value = description;

        ws.getCell(rowIndex, 6).value = credit;
        ws.getCell(rowIndex, 7).value = debit;

        // ✅ cumulative balance formula
        ws.getCell(rowIndex, 8).value = { formula: `H${rowIndex - 1}+F${rowIndex}-G${rowIndex}` };

        ws.getCell(rowIndex, 1).alignment = { horizontal: "center", vertical: "middle" };

        [6, 7, 8].forEach((col) => {
            ws.getCell(rowIndex, col).numFmt = "#,##0.00";
            ws.getCell(rowIndex, col).alignment = { horizontal: "right", vertical: "middle" };
        });

        // ✅ all borders thin
        for (let c = 1; c <= 8; c++) borderAllThin(ws.getCell(rowIndex, c));
    });

    const lastDataRow = DATA_START + rows.length - 1;
    const CLOSE_ROW = lastDataRow + 1;

    // ===== Closing row =====
    ws.getCell(CLOSE_ROW, 3).value = "***Closing Balance***";
    ws.getCell(CLOSE_ROW, 6).value = { formula: `SUM(F${DATA_START}:F${lastDataRow})` };
    ws.getCell(CLOSE_ROW, 7).value = { formula: `SUM(G${DATA_START}:G${lastDataRow})` };
    ws.getCell(CLOSE_ROW, 8).value = { formula: `H${lastDataRow}` };

    ws.getRow(CLOSE_ROW).font = { bold: true };
    for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(CLOSE_ROW, c);
        fillGrey(cell);
        borderAllThin(cell);
    }
    [6, 7, 8].forEach((col) => {
        ws.getCell(CLOSE_ROW, col).numFmt = "#,##0.00";
        ws.getCell(CLOSE_ROW, col).alignment = { horizontal: "right", vertical: "middle" };
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), exportFileName);
}
