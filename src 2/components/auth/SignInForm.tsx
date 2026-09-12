
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

function SignInFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { user, needsProfileCompletion, error } = await signInWithGoogle();

    if (error) {
      toast({
        title: "Sign-in failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    } else {
      // Set session cookie
      try {
        const { auth } = await import("@/lib/firebase/config");
        if (auth?.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        }
      } catch (e) {
        console.error("Failed to set session cookie", e);
      }

      toast({
        title: "Success",
        description: "Signed in with Google",
      });
      if (needsProfileCompletion) {
        window.location.href = '/complete-profile';
      } else {
        window.location.href = redirectUrl;
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // ... (rest of onSubmit remains same)
    // Failsafe: Ensure values are present
    if (!values.email || !values.password) {
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithEmail(values.email, values.password);

    if (error) {
      let errorMessage = "An unknown error occurred. Please try again.";
      // Use the new, more descriptive error handling
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = "Invalid email or password. Please try again.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many sign-in attempts. Please try again later.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your internet connection.";
          break;
        case 'auth/invalid-api-key':
          errorMessage = "The API key is invalid. Please check your .env configuration and ensure the key is enabled in your Google Cloud console.";
          break;
        default:
          // For any other errors, show the raw message from Firebase to aid debugging.
          errorMessage = error.message;
          break;
      }

      toast({
        title: "Sign-in failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      // Get ID token and set session cookie
      try {
        const { auth } = await import("@/lib/firebase/config");
        if (auth?.currentUser) {
          const idToken = await auth.currentUser.getIdToken();
          await fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
        }
      } catch (e) {
        console.error("Failed to set session cookie", e);
      }

      toast({
        title: "Success!",
        description: "You have successfully signed in.",
        duration: 3000,
      });
      // Use Next.js router to force a full page reload and ensure auth state is updated.
      // We use window.location to ensure a hard reload which refreshes server components/middleware state
      window.location.href = redirectUrl;
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} type="email" autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" {...field} type="password" autoComplete="current-password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <div />
            <Button variant="link" asChild className="p-0 text-sm">
              <Link href="#">Forgot password?</Link>
            </Button>
          </div>
          <div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading || isGoogleLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In with Email
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
              </svg>
            )}
            Google
          </Button>
        </form>
      </Form>
    </>
  );
}

export default function SignInForm() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInFormInner />
    </Suspense>
  )
}
