import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-destructive">Error</h1>
        <h2 className="text-2xl font-semibold">Backend Not Detected</h2>
        <p className="text-muted-foreground max-w-md">
          Could not connect to the backend server. Please make sure the server is running.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry Connection
        </Button>
      </div>
    </div>
  );
}

