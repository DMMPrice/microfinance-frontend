import React, {useEffect, useMemo, useState} from "react";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";

import {useAddLoanAdvance, useDeductLoanAdvance} from "@/hooks/useLoans.js";

function getNowLocalInputValue() {
    const d = new Date();
    const pad = (v) => String(v).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function LoanAdvanceActionModal({
                                                   open,
                                                   onOpenChange,
                                                   mode = "add",
                                                   loanId,
                                                   loanAccountNo,
                                                   advanceBalance,
                                               }) {
    const isAdd = mode === "add";

    const addAdvanceMutation = useAddLoanAdvance();
    const deductAdvanceMutation = useDeductLoanAdvance();

    const reasonSuggestions = useMemo(() => {
        return isAdd
            ? [
                "Member paid extra amount",
                "Advance collected from borrower",
                "Collected for future adjustment",
                "Excess payment received",
                "Manual advance entry",
                "Cash received in advance",
            ]
            : [
                "Adjusted in installment collection",
                "Advance used for due payment",
                "Advance deducted manually",
                "Excess advance reversed",
                "Used against outstanding",
                "Partial advance adjustment",
            ];
    }, [isAdd]);

    const [form, setForm] = useState({
        payment_date: getNowLocalInputValue(),
        amount_received: "",
        payment_mode: "CASH",
        receipt_no: "",
        reason: "",
    });

    useEffect(() => {
        if (open) {
            setForm({
                payment_date: getNowLocalInputValue(),
                amount_received: "",
                payment_mode: "CASH",
                receipt_no: "",
                reason: "",
            });
        }
    }, [open, mode]);

    const loading = addAdvanceMutation.isPending || deductAdvanceMutation.isPending;

    const title = useMemo(
        () => (isAdd ? "Add Advance Money" : "Deduct Advance Money"),
        [isAdd]
    );

    const helperText = useMemo(() => {
        if (isAdd) return "This will increase the loan advance balance.";
        return "This will reduce the loan advance balance.";
    }, [isAdd]);

    const handleChange = (key, value) => {
        setForm((prev) => ({...prev, [key]: value}));
    };

    const handleReasonSuggestion = (reasonText) => {
        setForm((prev) => ({...prev, reason: reasonText}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amount = Number(form.amount_received || 0);
        if (!loanId) {
            alert("Loan ID not found.");
            return;
        }
        if (!amount || amount <= 0) {
            alert("Amount must be greater than 0.");
            return;
        }
        if (!String(form.reason || "").trim()) {
            alert("Reason is required.");
            return;
        }

        const payload = {
            payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : undefined,
            amount_received: amount,
            payment_mode: form.payment_mode || "CASH",
            receipt_no: form.receipt_no || null,
            reason: form.reason.trim(),
        };

        try {
            if (isAdd) {
                await addAdvanceMutation.mutateAsync({
                    loan_id: loanId,
                    loan_account_no: loanAccountNo,
                    payload,
                });
            } else {
                await deductAdvanceMutation.mutateAsync({
                    loan_id: loanId,
                    loan_account_no: loanAccountNo,
                    payload,
                });
            }

            onOpenChange(false);
        } catch (err) {
            alert(
                err?.response?.data?.detail ||
                err?.message ||
                "Something went wrong while saving advance entry."
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                        Loan A/C: <span className="font-medium text-foreground">{loanAccountNo || "-"}</span>
                    </div>
                    <div>
                        Current Advance Balance:{" "}
                        <span className="font-medium text-foreground">
                            ₹ {Number(advanceBalance || 0).toFixed(2)}
                        </span>
                    </div>
                    <div>{helperText}</div>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Date & Time</Label>
                            <Input
                                type="datetime-local"
                                value={form.payment_date}
                                onChange={(e) => handleChange("payment_date", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Enter amount"
                                value={form.amount_received}
                                onChange={(e) => handleChange("amount_received", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Mode</Label>
                            <Input
                                placeholder="CASH / UPI / BANK"
                                value={form.payment_mode}
                                onChange={(e) => handleChange("payment_mode", e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Receipt No</Label>
                            <Input
                                placeholder="Optional receipt no"
                                value={form.receipt_no}
                                onChange={(e) => handleChange("receipt_no", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Quick Reason Suggestions</Label>
                        <div className="flex flex-wrap gap-2">
                            {reasonSuggestions.map((item) => (
                                <Button
                                    key={item}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReasonSuggestion(item)}
                                    className="h-auto whitespace-normal text-left"
                                >
                                    {item}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea
                            placeholder="Enter reason"
                            value={form.reason}
                            onChange={(e) => handleChange("reason", e.target.value)}
                            rows={4}
                        />
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : isAdd ? "Add Advance" : "Deduct Advance"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}