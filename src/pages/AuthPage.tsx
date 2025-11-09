import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAppStore, type SessionUser } from '@/store';
import { userSignIn, userSignUp } from '@/lib/apis/auths';
import { getBackendConfig } from '@/lib/apis';
import { generateInitialsImage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { user, setUser, setConfig, socket } = useAppStore();

  // Check if user is already logged in on mount
  useEffect(() => {
    const redirectPath = searchParams.get('redirect');
    if (user !== undefined) {
      navigate(redirectPath || '/');
    } else {
      // Store redirect path if provided
      if (redirectPath) {
        localStorage.setItem('redirectPath', redirectPath);
      }
    }

    // Check for error in URL params
    const error = searchParams.get('error');
    if (error) {
      toast.error(error);
    }
  }, [user, navigate, searchParams]);

  const setSessionUser = async (sessionUser: SessionUser | null, redirectPath: string | null = null) => {
    if (sessionUser) {
      console.log(sessionUser);
      toast.success("You're now logged in.");
      
      if (sessionUser.token) {
        localStorage.setItem('token', sessionUser.token);
      }
      
      // Emit user-join event to socket if available
      if (socket) {
        socket.emit('user-join', { auth: { token: sessionUser.token } });
      }
      
      // Update user state
      setUser(sessionUser);
      
      // Update config after login
      try {
        const backendConfig = await getBackendConfig();
        setConfig(backendConfig);
      } catch (error) {
        console.error('Failed to load backend config:', error);
      }
      
      // Handle redirect
      if (!redirectPath) {
        redirectPath = searchParams.get('redirectPath') || searchParams.get('redirect') || '/';
      }
      
      navigate(redirectPath);
      localStorage.removeItem('redirectPath');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }

        const profileImageUrl = generateInitialsImage(name);
        const result = await userSignUp(name, email, password, profileImageUrl);
        await setSessionUser(result);
      } else {
        const result = await userSignIn(email, password);
        await setSessionUser(result);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const err = error as { detail?: string; message?: string };
      toast.error(err?.detail || err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
          <CardDescription>
            {isSignUp
              ? 'Create a new account to get started'
              : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your password"
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="text-center text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary underline-offset-4 hover:underline"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

