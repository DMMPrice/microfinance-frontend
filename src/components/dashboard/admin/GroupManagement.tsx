import { useState } from 'react';
import { Group, Branch, LoanOfficer, Region } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupManagementProps {
  groups: Group[];
  branches: Branch[];
  officers: LoanOfficer[];
  regions: Region[];
  onUpdate: () => void;
}

export default function GroupManagement({ groups, branches, officers, regions, onUpdate }: GroupManagementProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loanOfficerId, setLoanOfficerId] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const officer = officers.find(o => o.id === loanOfficerId);
    if (!officer) return;

    const newGroup: Group = {
      id: Date.now().toString(),
      name,
      code,
      branchId: officer.branchId,
      loanOfficerId,
      createdAt: new Date().toISOString(),
    };
    storage.groups.add(newGroup);
    toast({ title: 'Group created successfully' });
    setName('');
    setCode('');
    setLoanOfficerId('');
    setOpen(false);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    storage.groups.delete(id);
    toast({ title: 'Group deleted' });
    onUpdate();
  };

  const getGroupInfo = (group: Group) => {
    const officer = officers.find(o => o.id === group.loanOfficerId);
    const branch = branches.find(b => b.id === group.branchId);
    const region = regions.find(r => r.id === branch?.regionId);
    return {
      officer: officer?.name || 'Unknown',
      branch: branch?.name || 'Unknown',
      region: region?.name || 'Unknown',
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Group Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage borrower groups</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={officers.length === 0}>
              <Plus className="mr-2 h-5 w-5" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="officer">Assign to Loan Officer</Label>
                <Select value={loanOfficerId} onValueChange={setLoanOfficerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select loan officer" />
                  </SelectTrigger>
                  <SelectContent>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.name} ({branches.find(b => b.id === officer.branchId)?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Group A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Group Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., GA01"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Create Group</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const info = getGroupInfo(group);
          return (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
                <CardDescription>
                  Code: {group.code}
                  <br />
                  Officer: {info.officer}
                  <br />
                  Branch: {info.branch} | Region: {info.region}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(group.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {groups.length === 0 && officers.length > 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No groups created yet</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      )}

      {officers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground">Create loan officers first to add groups</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
