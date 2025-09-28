"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SignInModal = ({
  isOpen,
  onClose,
  onSuccess,
}: SignInModalProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate required fields for sign up
        if (!firstName.trim() || !lastName.trim()) {
          toast({
            title: "Missing information",
            description: "Please provide your first and last name.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        // Sign up using direct Supabase API
        const response = await fetch(
          "https://rrwhcigiawoycpuizczo.supabase.co/auth/v1/signup",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd2hjaWdpYXdveWNwdWl6Y3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzUzMDAsImV4cCI6MjA3NDM1MTMwMH0.1GY8rrkETW-ETj_1mS1SK4_KNmVBbZS6TRk92scBYqY",
            },
            body: JSON.stringify({
              email,
              password,
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName.trim()} ${lastName.trim()}`,
              },
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          toast({
            title: "Sign up failed",
            description: result.error?.message || "Failed to create account",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account created",
            description: "Please check your email to verify your account.",
          });
          setIsSignUp(false);
        }
      } else {
        // Sign in using direct Supabase API
        const response = await fetch(
          "https://rrwhcigiawoycpuizczo.supabase.co/auth/v1/token?grant_type=password",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyd2hjaWdpYXdveWNwdWl6Y3pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzUzMDAsImV4cCI6MjA3NDM1MTMwMH0.1GY8rrkETW-ETj_1mS1SK4_KNmVBbZS6TRk92scBYqY",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          toast({
            title: "Sign in failed",
            description: result.error?.message || "Invalid email or password",
            variant: "destructive",
          });
        } else {
          // Extract user data from response
          const userData = {
            id: result.user?.id || email,
            email: result.user?.email || email,
            firstName: result.user?.user_metadata?.first_name || firstName,
            lastName: result.user?.user_metadata?.last_name || lastName,
            fullName: result.user?.user_metadata?.full_name || `${firstName} ${lastName}`,
          };
          
          // Login user
          login(userData);
          
          toast({
            title: "Welcome back!",
            description: "You've successfully signed in.",
          });
          onSuccess();
          onClose();
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication error",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setIsSignUp(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUp
              ? "Sign up to start using Bloom's AI-powered document intelligence"
              : "Sign in to access your Bloom workspace"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={isSignUp}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required={isSignUp}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              !email ||
              !password ||
              (isSignUp && (!firstName.trim() || !lastName.trim()))
            }
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>{isSignUp ? "Create Account" : "Sign In"}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </form>

        <div className="text-center">
          <Button
            variant="link"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={isLoading}
            className="text-sm"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
