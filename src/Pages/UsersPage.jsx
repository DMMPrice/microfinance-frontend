import UsersManagement from "@/Component/Main Components/UsersManagement.jsx";

export default function UsersPage() {
    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Users</h1>
                <p className="text-muted-foreground">
                    Create and manage users, roles, regions and branches assignments
                </p>
            </div>

            <UsersManagement />
        </div>
    );
}
