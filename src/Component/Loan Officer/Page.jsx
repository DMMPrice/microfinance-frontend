// src/pages/Page.jsx
import LoanOfficerManagement from "@/Component/Loan Officer/LoanOfficerManagement.jsx";

export default function Page() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Loan Officers</h1>
                <p className="text-muted-foreground">
                    View and manage registered loan officers
                </p>
            </div>

            {/* ✅ No repeated header inside component (page already has heading) */}
            <LoanOfficerManagement variant="page" showHeader={false} showKpis/>
        </div>
    );
}