// src/pages/Loans/CreateLoanDialog.jsx
import {useMemo, useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useCreateLoan} from "@/hooks/useLoans";
import {toast} from "@/components/ui/use-toast";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function CreateLoanDialog({open, onOpenChange}) {
    const createLoan = useCreateLoan();

    const defaults = useMemo(() => {
        const today = todayISO();
        // first installment default = +7 days
        const d = new Date();
        d.setDate(d.getDate() + 7);
        const first = d.toISOString().slice(0, 10);

        return {
            loan_account_no: "",
            member_id: "",
            product_id: 1,
            disburse_date: today,
            first_installment_date: first,
            duration_weeks: 12,
            principal_amount: "",
            flat_interest_total: "",
        };
    }, []);

    const [form, setForm] = useState(defaults);

    const set = (k) => (e) => setForm((p) => ({...p, [k]: e.target.value}));

    const onSubmit = async () => {
        // Minimal validations
        if (!form.loan_account_no?.trim()) return toast({title: "Loan A/C No is required", variant: "destructive"});
        if (!form.member_id) return toast({title: "Member ID is required", variant: "destructive"});
        if (!form.principal_amount) return toast({title: "Principal is required", variant: "destructive"});
        if (!form.flat_interest_total) return toast({title: "Flat interest total is required", variant: "destructive"});

        const payload = {
            loan_account_no: form.loan_account_no.trim(),
            member_id: Number(form.member_id),
            product_id: Number(form.product_id),
            disburse_date: form.disburse_date,
            first_installment_date: form.first_installment_date,
            duration_weeks: Number(form.duration_weeks),
            principal_amount: Number(form.principal_amount),
            flat_interest_total: Number(form.flat_interest_total),
        };

        try {
            await createLoan.mutateAsync(payload);
            toast({title: "Loan created successfully ✅"});
            setForm(defaults);
            onOpenChange(false);
        } catch (err) {
            toast({
                title: "Failed to create loan",
                description: err?.response?.data?.detail || err.message,
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create Loan</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Loan Account No</Label>
                        <Input value={form.loan_account_no} onChange={set("loan_account_no")} placeholder="LN-0001"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Member ID</Label>
                        <Input value={form.member_id} onChange={set("member_id")} placeholder="123"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Product ID</Label>
                        <Input value={form.product_id} onChange={set("product_id")} placeholder="1"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Duration (weeks)</Label>
                        <Input value={form.duration_weeks} onChange={set("duration_weeks")} placeholder="12"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Disburse Date</Label>
                        <Input type="date" value={form.disburse_date} onChange={set("disburse_date")}/>
                    </div>

                    <div className="space-y-2">
                        <Label>First Installment Date</Label>
                        <Input type="date" value={form.first_installment_date}
                               onChange={set("first_installment_date")}/>
                    </div>

                    <div className="space-y-2">
                        <Label>Principal Amount</Label>
                        <Input value={form.principal_amount} onChange={set("principal_amount")} placeholder="10000"/>
                    </div>

                    <div className="space-y-2">
                        <Label>Flat Interest Total</Label>
                        <Input value={form.flat_interest_total} onChange={set("flat_interest_total")}
                               placeholder="1200"/>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onSubmit} disabled={createLoan.isPending}>
                        {createLoan.isPending ? "Creating..." : "Create Loan"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
