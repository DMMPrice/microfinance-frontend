import BranchManagement from "@/Component/Main Components/BranchManagement.jsx";

export default function BranchesPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Branches</h1>
                <p className="text-muted-foreground">Create and manage branches</p>
            </div>

            <BranchManagement />
        </div>
    );
}
