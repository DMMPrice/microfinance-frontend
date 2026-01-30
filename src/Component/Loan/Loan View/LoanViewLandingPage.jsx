// src/Component/Loan/Loan View/LoanViewLandingPage.jsx
import React, {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";

function readLoanAccountSuggestions() {
    try {
        const raw = localStorage.getItem("mf.loanAccountNos.v1");
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function isNumericId(v) {
    return /^\d+$/.test(String(v || "").trim());
}

export default function LoanViewLandingPage() {
    const [loanRef, setLoanRef] = useState("");
    const navigate = useNavigate();

    const suggestions = useMemo(() => readLoanAccountSuggestions(), []);
    const isFetching = false;

    function go() {
        const ref = String(loanRef).trim();
        if (!ref) return;

        if (isNumericId(ref)) {
            navigate(`/dashboard/loans/view/${encodeURIComponent(ref)}`);
            return;
        }
        navigate(`/dashboard/loans/view/${encodeURIComponent(ref)}`);
    }

    return (
        /* ✅ FULL PAGE CENTER */
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-md">
                <CardHeader className="text-center">
                    <CardTitle>Loan Detail View</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label>Enter Loan Account No</Label>
                        <Input
                            placeholder="LN-TIYA-01"
                            value={loanRef}
                            onChange={(e) => setLoanRef(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && go()}
                            list="loanAccountSuggestions"
                        />
                        <datalist id="loanAccountSuggestions">
                            {suggestions.map((x) => (
                                <option key={x} value={x}/>
                            ))}
                        </datalist>
                    </div>

                    <Button
                        onClick={go}
                        disabled={isFetching}
                        className="w-full"
                    >
                        {isFetching ? "Searching..." : "Show Details"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
