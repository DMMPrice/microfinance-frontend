import { useState } from 'react';
import { Loan, Borrower, Group, Branch, Region, LoanOfficer } from '@/types';
import { storage } from '@/lib/storage';
import { calculateEMI, generateRepaymentSchedule } from '@/lib/emiCalculator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, IndianRupee } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoanManagementProps {
  loans: Loan[];
  borrowers: Borrower[];
  groups: Group[];
  branches: Branch[];
  regions: Region[];
  officers: LoanOfficer[];
  onUpdate: () => void;
}

export default function LoanManagement({ 
  loans, 
  borrowers, 
  groups, 
  branches, 
  regions, 
  officers, 
  onUpdate 
}: LoanManagementProps) {
  const [open, setOpen] = useState(false);
  const [borrowerId, setBorrowerId] = useState('');
  const [productType, setProductType] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const borrower = borrowers.find(b => b.id === borrowerId);
    if (!borrower) return;
    
    const group = groups.find(g => g.id === borrower.groupId);
    if (!group) return;
    
    const branch = branches.find(b => b.id === group.branchId);
    if (!branch) return;

    const principalAmount = parseFloat(principal);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(tenureMonths);

    // Calculate EMI and schedule
    const emiCalc = calculateEMI(principalAmount, rate, tenure);
    
    const newLoan: Loan = {
      id: Date.now().toString(),
      borrowerId,
      groupId: borrower.groupId,
      loanOfficerId: group.loanOfficerId,
      branchId: group.branchId,
      regionId: branch.regionId,
      productType,
      principal: principalAmount,
      interestRate: rate,
      tenureMonths: tenure,
      startDate,
      status: 'active',
      outstanding: emiCalc.totalPayable,
      createdAt: new Date().toISOString(),
    };
    
    // Generate repayment schedule
    const schedule = generateRepaymentSchedule(
      newLoan.id,
      startDate,
      emiCalc.monthlyEMI,
      tenure
    );

    // Save loan and schedule
    storage.loans.add(newLoan);
    schedule.forEach(installment => {
      storage.repayments.add(installment);
    });

    toast({ 
      title: 'Loan created successfully',
      description: `EMI: ₹${emiCalc.monthlyEMI.toFixed(2)}/month for ${tenure} months`,
    });
    
    setBorrowerId('');
    setProductType('');
    setPrincipal('');
    setInterestRate('');
    setTenureMonths('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setOpen(false);
    onUpdate();
  };

  const getBorrowerInfo = (borrowerId: string) => {
    const borrower = borrowers.find(b => b.id === borrowerId);
    if (!borrower) return 'Unknown';
    const group = groups.find(g => g.id === borrower.groupId);
    return `${borrower.name} (${group?.name || 'Unknown Group'})`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'closed': return 'bg-muted text-muted-foreground';
      case 'defaulted': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Loan Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage loans for borrowers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={borrowers.length === 0}>
              <Plus className="mr-2 h-5 w-5" />
              Create Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Loan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="borrower">Select Borrower</Label>
                  <Select value={borrowerId} onValueChange={setBorrowerId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select borrower" />
                    </SelectTrigger>
                    <SelectContent>
                      {borrowers.map((borrower) => {
                        const group = groups.find(g => g.id === borrower.groupId);
                        return (
                          <SelectItem key={borrower.id} value={borrower.id}>
                            {borrower.name} - {group?.name || 'Unknown Group'}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="productType">Product Type</Label>
                  <Input
                    id="productType"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g., Micro Loan, Agriculture Loan"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="principal">Loan Amount (₹)</Label>
                  <Input
                    id="principal"
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="e.g., 50000"
                    required
                    min="1"
                    step="1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Interest Rate (% per annum)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="e.g., 12.5"
                    required
                    min="0"
                    step="0.1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tenure">Tenure (months)</Label>
                  <Input
                    id="tenure"
                    type="number"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value)}
                    placeholder="e.g., 12"
                    required
                    min="1"
                    step="1"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {principal && interestRate && tenureMonths && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold">Loan Summary</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Monthly EMI</p>
                      <p className="font-semibold text-lg">
                        ₹{calculateEMI(parseFloat(principal), parseFloat(interestRate), parseInt(tenureMonths)).monthlyEMI.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Interest</p>
                      <p className="font-semibold">
                        ₹{calculateEMI(parseFloat(principal), parseFloat(interestRate), parseInt(tenureMonths)).totalInterest.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Payable</p>
                      <p className="font-semibold">
                        ₹{calculateEMI(parseFloat(principal), parseFloat(interestRate), parseInt(tenureMonths)).totalPayable.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <Button type="submit" className="w-full" size="lg">Create Loan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{getBorrowerInfo(loan.borrowerId)}</CardTitle>
                  <CardDescription>{loan.productType}</CardDescription>
                </div>
                <Badge className={getStatusColor(loan.status)}>
                  {loan.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Principal:</span>
                <span className="font-semibold flex items-center">
                  <IndianRupee className="h-3 w-3" />
                  {loan.principal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding:</span>
                <span className="font-semibold flex items-center">
                  <IndianRupee className="h-3 w-3" />
                  {loan.outstanding.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest Rate:</span>
                <span className="font-semibold">{loan.interestRate}% p.a.</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tenure:</span>
                <span className="font-semibold">{loan.tenureMonths} months</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-semibold">{new Date(loan.startDate).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loans.length === 0 && borrowers.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No loans created yet</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Loan
            </Button>
          </CardContent>
        </Card>
      )}

      {borrowers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">Create borrowers first to add loans</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
