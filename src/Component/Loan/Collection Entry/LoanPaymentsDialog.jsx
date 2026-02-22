import React from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Download} from "lucide-react";

export default function LoanPaymentsDialog({
                                               open,
                                               onOpenChange,
                                               loanId,
                                               loanAccountNo,
                                               paymentRows = [],
                                               paymentsLoading = false,
                                               onDownloadCSV,
                                           }) {
    const accNo = loanAccountNo || (loanId ? `#${loanId}` : "");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <div className="flex items-center justify-between gap-3">
                        <DialogTitle>
                            Previous Payments {loanId ? `(Loan A/c: ${accNo})` : ""}
                        </DialogTitle>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onDownloadCSV}
                            disabled={paymentsLoading || !loanId || (paymentRows || []).length === 0}
                        >
                            <Download className="h-4 w-4 mr-2"/>
                            Download Statement
                        </Button>
                    </div>
                </DialogHeader>

                {paymentsLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full"/>
                        <Skeleton className="h-24 w-full"/>
                    </div>
                ) : (paymentRows || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No previous payments found.</p>
                ) : (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-sm border rounded-md">
                            <thead className="bg-muted">
                            <tr>
                                <th className="p-2 border">Date & Time</th>
                                <th className="p-2 border">Paid Amount</th>

                                {/* ✅ NEW: Prev Overdue */}
                                <th className="p-2 border">Prev Overdue</th>

                                <th className="p-2 border">Outstanding After</th>
                                <th className="p-2 border">Narration</th>
                            </tr>
                            </thead>

                            <tbody>
                            {(paymentRows || []).map((x) => {
                                // ✅ if backend provides it, show it; else "-"
                                const prevOverdue =
                                    x?.overdue_prev ?? x?.prev_overdue ?? x?.prevOverdue ?? null;

                                return (
                                    <tr key={x.ledger_id}>
                                        <td className="p-2 border">
                                            {x.txn_date ? new Date(x.txn_date).toLocaleString() : "-"}
                                        </td>
                                        <td className="p-2 border text-right">
                                            {Number(x.credit || 0).toFixed(2)}
                                        </td>

                                        {/* ✅ NEW cell */}
                                        <td className="p-2 border text-right">
                                            {prevOverdue == null ? "-" : Number(prevOverdue || 0).toFixed(2)}
                                        </td>

                                        <td className="p-2 border text-right">
                                            {Number(x.balance_outstanding || 0).toFixed(2)}
                                        </td>
                                        <td className="p-2 border">{x.narration || "-"}</td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}