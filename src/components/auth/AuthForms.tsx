import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Mail, Lock, User, ArrowRight, Wand2, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import { AvatarCreator } from '../profile/AvatarCreator';
import { COUNTRIES } from '@shared/constants';
// --- Schemas ---
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  country: z.string().optional(),
});
type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
// --- Components ---
export function LoginForm() {
  const navigate = useNavigate();
  const loginEmail = useAuthStore(s => s.loginEmail);
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await loginEmail(data);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      // Enhanced Error Logging
      console.error('Login Error Details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      let message = 'Invalid credentials';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        message = String((err as any).message);
      } else if (typeof err === 'string') {
        message = err;
      }
      // Fallback if message is empty or generic object
      if (message === '[object Object]' || !message) {
        message = 'An unexpected error occurred. Please try again.';
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            placeholder="name@example.com"
            className="pl-9 bg-black/20 border-white/10"
            {...register('email')}
          />
        </div>
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="pl-9 bg-black/20 border-white/10"
            {...register('password')}
          />
        </div>
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
      </Button>
    </form>
  );
}
export function RegisterForm() {
  const navigate = useNavigate();
  const registerUser = useAuthStore(s => s.register);
  const [isLoading, setIsLoading] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'US'
    }
  });
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        ...data,
        avatar: customAvatar || undefined
      });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err: unknown) {
      let message = 'Registration failed';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        message = String((err as any).message);
      } else if (typeof err === 'string') {
        message = err;
      }
      if (message === '[object Object]' || !message) {
        message = 'An unexpected error occurred. Please try again.';
      }
      // Only log unexpected errors to console to prevent noise
      if (!message.toLowerCase().includes('user already exists') && !message.toLowerCase().includes('email')) {
         console.error('Registration Error Details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };
  const defaultRandom = `https://api.dicebear.com/9.x/avataaars/svg?seed=${Math.random()}`;
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
        {/* Avatar Preview & Customization */}
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
          <Avatar className="w-12 h-12 border border-white/10">
            <AvatarImage src={customAvatar || defaultRandom} />
            <AvatarFallback>??</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Your Avatar</div>
            <div className="text-xs text-muted-foreground">Customize your look</div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => setShowAvatarCreator(true)}
          >
            <Wand2 className="w-3 h-3" /> Customize
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-name">Display Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="reg-name"
              placeholder="Player One"
              className="pl-9 bg-black/20 border-white/10"
              {...register('name')}
            />
          </div>
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="reg-email"
              placeholder="name@example.com"
              className="pl-9 bg-black/20 border-white/10"
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              className="pl-9 bg-black/20 border-white/10"
              {...register('password')}
            />
          </div>
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg-country">Country</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
            <Select onValueChange={(val) => setValue('country', val)} defaultValue="US">
              <SelectTrigger className="pl-9 bg-black/20 border-white/10">
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 max-h-[200px]">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="mr-2 text-lg">{c.flag}</span> {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
        </Button>
      </form>
      <Dialog open={showAvatarCreator} onOpenChange={setShowAvatarCreator}>
        <DialogContent className="bg-zinc-950 border-white/10 max-w-md h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Your Avatar</DialogTitle>
            <DialogDescription>Design your unique digital identity.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <AvatarCreator
              initialUrl={customAvatar || defaultRandom}
              onSave={(url) => {
                setCustomAvatar(url);
                setShowAvatarCreator(false);
              }}
              onCancel={() => setShowAvatarCreator(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
interface OAuthSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'google' | 'apple';
  onConfirm: (email: string) => void;
}
export function OAuthSimulationModal({ isOpen, onClose, provider, onConfirm }: OAuthSimulationModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    // Simulate network delay
    setTimeout(() => {
      onConfirm(email);
      setIsLoading(false);
    }, 800);
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border-white/10">
        <DialogHeader>
          <DialogTitle>Simulate {provider === 'google' ? 'Google' : 'Apple'} Login</DialogTitle>
          <DialogDescription>
            Enter an email to simulate a real OAuth response. This will create a persistent account linked to this email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Simulated Email Address</Label>
            <Input
              type="email"
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-black/20 border-white/10"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}