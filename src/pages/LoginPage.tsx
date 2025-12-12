import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Loader2, Apple, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm, RegisterForm } from '@/components/auth/AuthForms';
import { api } from '@/lib/api-client';
// Simple Google Icon Component
function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" {...props}>
      <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
      </g>
    </svg>
  );
}
export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [isLoggingIn, setIsLoggingIn] = useState<string | null>(null);
  const handleGuestLogin = async () => {
    setIsLoggingIn('guest');
    try {
      await login('guest');
      toast.success('Welcome! You are playing as a Guest.');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign in.');
    } finally {
      setIsLoggingIn(null);
    }
  };
  const handleOAuthClick = (provider: 'google' | 'apple') => {
    setIsLoggingIn(provider);
    toast.info(`Redirecting to ${provider === 'google' ? 'Google' : 'Apple'}...`);
    // Redirect to backend OAuth endpoint
    window.location.href = `/api/auth/${provider}/redirect`;
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-background to-background pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-6"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/20 mb-4"
          >
            <Zap className="w-8 h-8 text-white fill-white" />
          </motion.div>
          <h1 className="text-3xl font-display font-bold mb-2 tracking-tight">
            Quiz <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Arena</span>
          </h1>
          <p className="text-muted-foreground">
            Enter the arena. Prove your knowledge.
          </p>
        </div>
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 border-white/10 hover:bg-white/5"
                    onClick={() => handleOAuthClick('google')}
                    disabled={!!isLoggingIn}
                  >
                    {isLoggingIn === 'google' ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="mr-2" />}
                    <span className="hidden sm:inline">Google</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12 border-white/10 hover:bg-white/5"
                    onClick={() => handleOAuthClick('apple')}
                    disabled={!!isLoggingIn}
                  >
                    {isLoggingIn === 'apple' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Apple className="w-5 h-5 mr-2" />}
                    <span className="hidden sm:inline">Apple</span>
                  </Button>
                </div>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-950 px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>
                <LoginForm />
              </div>
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
          <div className="mt-6 pt-6 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-white"
              onClick={handleGuestLogin}
              disabled={!!isLoggingIn}
            >
              {isLoggingIn === 'guest' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <User className="w-4 h-4 mr-2" />
                  Continue as Guest
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}