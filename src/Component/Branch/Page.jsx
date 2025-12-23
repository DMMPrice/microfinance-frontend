// src/pages/Page.jsx
import BranchManagement from "@/Component/Branch/BranchManagement.jsx";

export default function Page() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Branches</h1>
                <p className="text-muted-foreground">Create and manage branches</p>
            </div>

            {/* ✅ Page already has header, so hide component header but show KPIs */}
            <BranchManagement variant="page" showHeader={false} showKpis/>
        </div>
    );
}
