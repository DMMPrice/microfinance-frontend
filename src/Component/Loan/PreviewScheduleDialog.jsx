import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function PreviewScheduleDialog({open, onOpenChange, scheduleRows}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Repayment Schedule Preview</DialogTitle>
                </DialogHeader>

                <div className="rounded-lg border overflow-auto max-h-[70vh]">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 sticky top-0">
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
                                    <td className="px-3 py-2 text-right">{x.principal_due.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{x.interest_due.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{x.fees_due.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right font-medium">{x.total_due.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right">{x.principal_balance.toFixed(2)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                                    Enter Principal and Annual Interest to preview schedule.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
