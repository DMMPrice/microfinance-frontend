// src/Component/Loan/PreviewScheduleDialog.jsx
import React, {useMemo} from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Badge} from "@/components/ui/badge";

function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n) {
    return `₹${safeNum(n).toFixed(2)}`;
}

export default function PreviewScheduleDialog({
                                                  open,
                                                  onOpenChange,
                                                  scheduleRows,
                                                  disburseDate,
                                                  processingFeeAmt,
                                                  insuranceFeeAmt,
                                                  bookPriceAmt,
                                              }) {
    const chargesTotal = useMemo(() => {
        return safeNum(processingFeeAmt) + safeNum(insuranceFeeAmt) + safeNum(bookPriceAmt);
    }, [processingFeeAmt, insuranceFeeAmt, bookPriceAmt]);

    const hasCharges = useMemo(() => chargesTotal > 0, [chargesTotal]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* ✅ Make dialog height fixed + internal scroll */}
            <DialogContent className="max-w-5xl w-[95vw] h-[85vh] overflow-hidden flex flex-col p-0">
                {/* ✅ Sticky header */}
                <DialogHeader className="px-6 py-4 border-b bg-background sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle className="text-base sm:text-lg">
                            Repayment Schedule Preview
                        </DialogTitle>

                        {hasCharges ? (
                            <Badge variant="secondary" className="hidden sm:inline-flex">
                                Charges on {disburseDate || "-"}: {fmtMoney(chargesTotal)}
                            </Badge>
                        ) : null}
                    </div>

                    {hasCharges ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                            Charges are collected separately on disbursement day and are <b>not included</b> in installments.
                        </div>
                    ) : null}
                </DialogHeader>

                {/* ✅ Scroll body */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                    {/* ✅ Compact charges card (no huge padding, responsive grid) */}
                    {hasCharges ? (
                        <div className="rounded-xl border bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="text-sm font-medium">
                                    Charges on Disbursement Day:{" "}
                                    <span className="font-semibold">{disburseDate || "-"}</span>
                                </div>
                                <div className="text-sm font-semibold">
                                    Total: {fmtMoney(chargesTotal)}
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Processing Fee</div>
                                    <div className="text-sm font-medium">{fmtMoney(processingFeeAmt)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Insurance Fee</div>
                                    <div className="text-sm font-medium">{fmtMoney(insuranceFeeAmt)}</div>
                                </div>

                                <div className="rounded-lg border bg-background px-3 py-2">
                                    <div className="text-[11px] text-muted-foreground">Book Price</div>
                                    <div className="text-sm font-medium">{fmtMoney(bookPriceAmt)}</div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* ✅ Table card */}
                    <div className="rounded-xl border overflow-hidden">
                        <div className="max-h-[55vh] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40 sticky top-0 z-[1]">
                                <tr>
                                    <th className="px-3 py-2 text-center whitespace-nowrap">Inst #</th>
                                    <th className="px-3 py-2 text-center whitespace-nowrap">Due Date</th>
                                    <th className="px-3 py-2 text-right whitespace-nowrap">Principal</th>
                                    <th className="px-3 py-2 text-right whitespace-nowrap">Interest</th>
                                    <th className="px-3 py-2 text-right whitespace-nowrap">Fees</th>
                                    <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                                    <th className="px-3 py-2 text-right whitespace-nowrap">Balance</th>
                                </tr>
                                </thead>

                                <tbody>
                                {scheduleRows?.length ? (
                                    scheduleRows.map((x) => (
                                        <tr key={x.inst_no} className="border-t">
                                            <td className="px-3 py-2 text-center">{x.inst_no}</td>
                                            <td className="px-3 py-2 text-center">{x.due_date}</td>
                                            <td className="px-3 py-2 text-right">{safeNum(x.principal_due).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right">{safeNum(x.interest_due).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right">{safeNum(x.fees_due).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right font-medium">{safeNum(x.total_due).toFixed(2)}</td>
                                            <td className="px-3 py-2 text-right">{safeNum(x.principal_balance).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                                            Enter Principal and Interest to preview schedule.
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-3 py-2 border-t text-xs text-muted-foreground">
                            Installments contain only <b>Principal + Interest</b>. Charges are recorded separately in{" "}
                            <code>loan_charges</code>.
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
