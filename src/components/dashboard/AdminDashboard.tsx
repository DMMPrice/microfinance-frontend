import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { Region, Branch, LoanOfficer, Group, Borrower, Loan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, MapPin, Users, UserCircle, Wallet } from 'lucide-react';
import RegionManagement from './admin/RegionManagement';
import BranchManagement from './admin/BranchManagement';
import LoanOfficerManagement from './admin/LoanOfficerManagement';
import GroupManagement from './admin/GroupManagement';
import BorrowerManagement from './admin/BorrowerManagement';
import LoanManagement from './admin/LoanManagement';

interface AdminDashboardProps {
  defaultTab?: string;
}

export default function AdminDashboard({ defaultTab = 'overview' }: AdminDashboardProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loanOfficers, setLoanOfficers] = useState<LoanOfficer[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRegions(storage.regions.getAll());
    setBranches(storage.branches.getAll());
    setLoanOfficers(storage.loanOfficers.getAll());
    setGroups(storage.groups.getAll());
    setBorrowers(storage.borrowers.getAll());
    setLoans(storage.loans.getAll());
  };

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstanding, 0);

  return (
    <div className="bg-muted/30 min-h-full">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your entire micro finance organization</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regions</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regions.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Branches</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{branches.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loan Officers</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loanOfficers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Borrowers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{borrowers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoans.length}</div>
              <p className="text-xs text-muted-foreground">₹{totalOutstanding.toLocaleString()} outstanding</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="officers">Loan Officers</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
            <TabsTrigger value="loans">Loans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Welcome to Admin Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Use the sidebar to navigate to different management sections.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions">
            <RegionManagement regions={regions} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="branches">
            <BranchManagement branches={branches} regions={regions} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="officers">
            <LoanOfficerManagement officers={loanOfficers} branches={branches} regions={regions} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="groups">
            <GroupManagement groups={groups} branches={branches} officers={loanOfficers} regions={regions} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="borrowers">
            <BorrowerManagement borrowers={borrowers} groups={groups} branches={branches} officers={loanOfficers} regions={regions} onUpdate={loadData} />
          </TabsContent>

          <TabsContent value="loans">
            <LoanManagement 
              loans={loans}
              borrowers={borrowers}
              groups={groups}
              branches={branches}
              regions={regions}
              officers={loanOfficers}
              onUpdate={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
