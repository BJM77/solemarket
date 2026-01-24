
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
import { signInWithEmail } from "@/lib/firebase/auth";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Failsafe: Ensure values are present
    if (!values.email || !values.password) {
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithEmail(values.email, values.password);

    if (error) {
      let errorMessage = "An unknown error occurred. Please try again.";
      // Use the new, more descriptive error handling
      switch(error.code) {
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
      toast({
        title: "Success!",
        description: "You have successfully signed in.",
      });
      // Use Next.js router to force a full page reload and ensure auth state is updated.
      router.push(redirectUrl);
    }
  }

  if (!mounted) {
      return null;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
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
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" {...field} type="password" autoComplete="current-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between">
            <div />
            <Button variant="link" asChild className="p-0 text-sm">
              <Link href="#">Forgot password?</Link>
            </Button>
          </div>
          <div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </div>
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
