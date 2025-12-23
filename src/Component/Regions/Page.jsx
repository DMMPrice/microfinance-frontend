// src/pages/Page.jsx
import RegionManagement from "@/Component/Regions/RegionManagement.jsx";

export default function Page() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Regions</h1>
                <p className="text-muted-foreground">Create and manage regions</p>
            </div>

            {/* ✅ Page already has header, so hide component header but show KPIs */}
            <RegionManagement variant="page" showHeader={false} showKpis/>
        </div>
    );
}
