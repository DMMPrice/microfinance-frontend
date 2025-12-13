// src/Component/dashboard/admin/LoanOfficerManagement.jsx
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Plus, Trash2} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {useLoanOfficers} from "@/hooks/useLoanOfficers";
import {useBranches} from "@/hooks/useBranches";
import {useRegions} from "@/hooks/useRegions";
import {useGroups} from "@/hooks/useGroups";
import OfficerDetailsDialog from "./OfficerDetailsDialog.jsx";

/**
 * Loan Officer Management
 *
 * Uses real backend:
 *  - GET    /loan-officers
 *  - POST   /loan-officers       (register existing employee as LO)
 *  - DELETE /loan-officers/{id}
 *
 * Also uses:
 *  - GET /branches  (for branch name)
 *  - GET /regions   (for region name)
 *  - GET /groups    (for group count per LO)
 */
export default function LoanOfficerManagement() {
    const [open, setOpen] = useState(false); // create LO dialog
    const [employeeId, setEmployeeId] = useState("");

    const [viewOpen, setViewOpen] = useState(false); // view details dialog
    const [selectedOfficer, setSelectedOfficer] = useState(null);

    const {toast} = useToast();

    // 🔹 Loan Officers
    const {
        loanOfficers,
        isLoading,
        isError,
        error,
        createLoanOfficerMutation,
        deleteLoanOfficerMutation,
        isCreating,
        isDeleting,
    } = useLoanOfficers();

    // 🔹 Branches / Regions for name resolution
    const {branches} = useBranches(); // list[BranchOut] → { branch_id, branch_name, region_id }
    const {regions} = useRegions();   // list[RegionOut] → { region_id, region_name }

    // 🔹 Groups for per-LO count (optional, nice to show)
    const {groups} = useGroups();     // each group has lo_id

    // ---- Helpers ---------------------------------------------------

    // Get branch + region NAME for a given officer
    const getBranchRegionLabelForOfficer = (officer) => {
        const emp = officer.employee;
        if (!emp) return "No employee linked";

        const branchId = emp.branch_id;
        const regionId = emp.region_id;

        if (!branchId && !regionId) {
            return "No branch/region assigned";
        }

        // Find branch by branch_id
        const branch = branches.find(
            (b) => String(b.branch_id) === String(branchId),
        );

        // Region from branch.region_id (preferred) or from employee.region_id
        const regionFromBranch =
            branch &&
            regions.find(
                (r) => String(r.region_id) === String(branch.region_id),
            );

        const regionFromEmp =
            regions.find(
                (r) => String(r.region_id) === String(regionId),
            );

        const region = regionFromBranch || regionFromEmp;

        const branchName = branch?.branch_name || "Unknown branch";
        const regionName = region?.region_name || "Unknown region";

        return `${branchName} (${regionName})`;
    };

    // Groups count for this LO
    const getGroupCountForOfficer = (loId) => {
        if (!groups || groups.length === 0) return 0;
        return groups.filter((g) => String(g.lo_id) === String(loId)).length;
    };

    // ---- Handlers ---------------------------------------------------

    const handleSubmit = async (e) => {
        e.preventDefault();

        const parsedId = Number(employeeId);
        if (!parsedId || Number.isNaN(parsedId)) {
            toast({
                title: "Invalid Employee ID",
                description: "Please enter a valid numeric employee_id.",
                variant: "destructive",
            });
            return;
        }

        try {
            await createLoanOfficerMutation.mutateAsync({employee_id: parsedId});
            toast({
                title: "Loan Officer registered",
                description: `Employee ID ${parsedId} has been registered as a Loan Officer.`,
            });
            setEmployeeId("");
            setOpen(false);
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to register Loan Officer.";
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            });
        }
    };

    const handleDelete = async (loId) => {
        try {
            await deleteLoanOfficerMutation.mutateAsync(loId);
            toast({title: "Loan Officer deleted"});

            if (selectedOfficer && selectedOfficer.lo_id === loId) {
                setSelectedOfficer(null);
                setViewOpen(false);
            }
        } catch (err) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Failed to delete Loan Officer.";
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            });
        }
    };

    const openViewModal = (officer) => {
        setSelectedOfficer(officer);
        setViewOpen(true);
    };

    const closeViewModal = () => {
        setSelectedOfficer(null);
        setViewOpen(false);
    };

    // ---- Render ---------------------------------------------------

    return (
        <div className="space-y-4">
            {/* Header + Add Dialog */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Loan Officer Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Register existing employees as Loan Officers and manage them.
                    </p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg">
                            <Plus className="mr-2 h-5 w-5"/>
                            Add Loan Officer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Register Loan Officer</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="employee-id">Employee ID</Label>
                                <Input
                                    id="employee-id"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    placeholder="Enter existing employee_id (e.g., 12)"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Employee must exist and have role &quot;loan_officer&quot;.
                                </p>
                            </div>
                            <Button type="submit" className="w-full" disabled={isCreating}>
                                {isCreating ? "Registering..." : "Register Loan Officer"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Loading / Error states */}
            {isLoading && (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        Loading Loan Officers...
                    </CardContent>
                </Card>
            )}

            {isError && !isLoading && (
                <Card>
                    <CardContent className="py-8 text-center text-destructive">
                        Failed to load Loan Officers: {error?.message || "Unknown error"}
                    </CardContent>
                </Card>
            )}

            {/* Loan Officers Grid */}
            {!isLoading && !isError && (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {loanOfficers.map((officer) => {
                            const emp = officer.employee;
                            const fullName = emp?.full_name || "Unknown Employee";
                            const email =
                                emp?.user?.email ||
                                emp?.user?.username ||
                                "No user linked";
                            const branchRegionLabel =
                                getBranchRegionLabelForOfficer(officer);
                            const groupCount = getGroupCountForOfficer(officer.lo_id);

                            return (
                                <Card key={officer.lo_id}>
                                    <CardHeader>
                                        <CardTitle>{fullName}</CardTitle>
                                        <CardDescription>
                                            {email}
                                            <br/>
                                            {branchRegionLabel}
                                            {groupCount > 0 && (
                                                <>
                                                    <br/>
                                                    Groups assigned: {groupCount}
                                                </>
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-between items-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openViewModal(officer)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={isDeleting}
                                            onClick={() => handleDelete(officer.lo_id)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Delete
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {loanOfficers.length === 0 && (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-10">
                                <p className="text-muted-foreground mb-4">
                                    No Loan Officers registered yet in your scope.
                                </p>
                                <Button onClick={() => setOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4"/>
                                    Register First Loan Officer
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* 🔍 View Details Dialog */}
            <OfficerDetailsDialog
                open={viewOpen}
                onClose={(open) => {
                    if (!open) {
                        closeViewModal();
                    } else {
                        setViewOpen(true);
                    }
                }}
                officer={selectedOfficer}
                onDelete={handleDelete}
                branchRegionLabel={
                    selectedOfficer ? getBranchRegionLabelForOfficer(selectedOfficer) : ""
                }
                groupCount={
                    selectedOfficer ? getGroupCountForOfficer(selectedOfficer.lo_id) : 0
                }
            />
        </div>
    );
}
