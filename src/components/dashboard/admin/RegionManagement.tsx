import { useState } from 'react';
import { Region } from '@/types';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RegionManagementProps {
  regions: Region[];
  onUpdate: () => void;
}

export default function RegionManagement({ regions, onUpdate }: RegionManagementProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRegion: Region = {
      id: Date.now().toString(),
      name,
      code,
      createdAt: new Date().toISOString(),
    };
    storage.regions.add(newRegion);
    toast({ title: 'Region created successfully' });
    setName('');
    setCode('');
    setOpen(false);
    onUpdate();
  };

  const handleDelete = (id: string) => {
    storage.regions.delete(id);
    toast({ title: 'Region deleted' });
    onUpdate();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Region Management</h3>
          <p className="text-sm text-muted-foreground">Create and manage regions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Region
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Region</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Region Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., North Zone"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Region Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g., NZ01"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Create Region</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => (
          <Card key={region.id}>
            <CardHeader>
              <CardTitle>{region.name}</CardTitle>
              <CardDescription>Code: {region.code}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(region.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {regions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground mb-4">No regions created yet</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Region
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
