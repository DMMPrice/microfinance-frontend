// src/Component/Home/components/DashboardHeader.jsx
export default function DashboardHeader() {
    return (
        <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
                Manage your entire micro finance organization
            </p>
        </div>
    );
}
