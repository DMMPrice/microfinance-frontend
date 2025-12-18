import MemberManagement from "@/Component/Main Components/MemberManagement.jsx";
import {useGroups} from "@/hooks/useGroups.js";
import {useBranches} from "@/hooks/useBranches.js";
import {useRegions} from "@/hooks/useRegions.js";
import {useLoanOfficers} from "@/hooks/useLoanOfficers.js";

export default function BorrowersPage() {
    const {groups = [], isLoading: groupsLoading} = useGroups();
    const {branches = [], isLoading: branchesLoading} = useBranches();
    const {regions = [], isLoading: regionsLoading} = useRegions();
    const {loanOfficers = [], isLoading: officersLoading} = useLoanOfficers();

    // Build a simple "officers" array in the shape MemberManagement expects: { id, name }
    const officers = (loanOfficers || []).map((lo) => ({
        id: lo.lo_id,
        name: lo.employee?.full_name || `Loan Officer ${lo.lo_id}`,
    }));

    const loading = groupsLoading || branchesLoading || regionsLoading || officersLoading;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-bold">Borrowers</h1>
                <p className="text-muted-foreground">Create and manage borrower profiles (members)</p>
            </div>

            {loading ? (
                <div className="text-sm text-muted-foreground">Loading master data...</div>
            ) : (
                <MemberManagement
                    groups={groups}
                    branches={branches}
                    regions={regions}
                    officers={officers}
                />
            )}
        </div>
    );
}
