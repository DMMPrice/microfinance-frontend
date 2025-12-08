import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">Micro Finance System</h1>
        <p className="text-xl text-muted-foreground">Manage loans, borrowers, and payments efficiently</p>
        <Button size="lg" onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default Index;
