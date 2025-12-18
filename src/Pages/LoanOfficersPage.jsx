import LoanOfficerManagement from "@/Component/Main Components/LoanOfficerManagement.jsx";

export default function LoanOfficersPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Loan Officers</h1>
                <p className="text-muted-foreground">View and manage registered loan officers</p>
            </div>

            <LoanOfficerManagement />
        </div>
    );
}
