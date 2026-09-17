import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast({ variant: 'destructive', title: 'Login failed', description: error.message });
      setIsLoading(false);
      return;
    }

    toast({ title: 'Welcome back!', description: 'You have been logged in successfully.' });
    navigate('/dashboard');
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await resetPassword(email);

    if (error) {
      toast({ variant: 'destructive', title: 'Unable to send reset email', description: error.message });
    } else {
      toast({
        title: 'Check your inbox',
        description: 'If an account exists for this email, a password reset link has been sent.',
      });
      setIsResettingPassword(false);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Nipix Admin</CardTitle>
          <CardDescription>
            {isResettingPassword
              ? 'Enter your email and we will send a password reset link.'
              : 'Sign in to manage Nipix Technology content'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isResettingPassword ? handlePasswordReset : handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isResettingPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isResettingPassword ? 'Send Reset Link' : 'Sign In'}
            </Button>
          </form>
          <Button
            type="button"
            variant="link"
            className="mt-2 w-full"
            onClick={() => setIsResettingPassword((current) => !current)}
            disabled={isLoading}
          >
            {isResettingPassword ? 'Back to sign in' : 'Forgot password?'}
          </Button>
          {!isResettingPassword && (
            <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Demo Accounts:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Super Admin:</strong> superadmin@edtech.com / kaaka_vaai_la_vada</p>
                <p><strong>Course Admin:</strong> courseadmin@edtech.com / aaya_sutta_vada</p>
                <p><strong>Support:</strong> support@edtech.com / palaya_sooru_meen_kulambu</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
