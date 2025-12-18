import GroupManagement from "@/Component/Main Components/GroupManagement.jsx";

export default function GroupsPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Groups</h1>
                <p className="text-muted-foreground">Create and manage borrower groups</p>
            </div>

            <GroupManagement />
        </div>
    );
}
