
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signUpWithEmail } from "@/lib/firebase/auth";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  displayName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long." })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    .regex(/[0-9]/, { message: "Password must contain at least one number." }),
  confirmPassword: z.string(),
  accountType: z.enum(["buyer", "seller"], {
    required_error: "You must select an account type."
  }),
  storeName: z.string().optional(),
  storeDescription: z.string().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms & Conditions and Privacy Policy.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}).refine((data) => {
    if (data.accountType === 'seller') {
        return !!data.storeName && data.storeName.length >= 2;
    }
    return true;
}, {
    message: "Store name is required for sellers.",
    path: ["storeName"],
});

function SignUpFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      accountType: "buyer",
      storeName: "",
      storeDescription: "",
      agreedToTerms: false,
    },
  });

  const accountType = form.watch("accountType");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    const { error } = await signUpWithEmail({
        email: values.email, 
        password: values.password, 
        displayName: values.displayName,
        accountType: values.accountType,
        storeName: values.storeName,
        storeDescription: values.storeDescription,
    });

    if (error) {
      let errorMessage = "An unknown error occurred. Please try again.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email address is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'The password is too weak.';
          break;
        default:
          errorMessage = error.message;
          break;
      }

      toast({
        title: "Sign-up failed",
        description: errorMessage,
        variant: "destructive",
      });
       setIsLoading(false);
    } else {
      toast({
        title: "Success!",
        description: "Your account has been created.",
      });
      window.location.href = redirectUrl;
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>I am a...</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex space-x-4"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="buyer" />
                      </FormControl>
                      <FormLabel className="font-normal">Buyer</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="seller" />
                      </FormControl>
                      <FormLabel className="font-normal">Seller</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} autoComplete="name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  <Input placeholder="••••••••" {...field} type="password" autoComplete="new-password" />
                </FormControl>
                 <FormDescription className="text-xs">
                    Must be 8+ characters with uppercase, lowercase, and a number.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" {...field} type="password" autoComplete="new-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {accountType === "seller" && (
             <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-medium">Seller Information</h3>
                 <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Store Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., John's Collectibles" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="storeDescription"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Store Description (Optional)</FormLabel>
                        <FormControl>
                        <Textarea placeholder="Specializing in rare cards and coins..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
             </div>
          )}

           <FormField
                control={form.control}
                name="agreedToTerms"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>
                           I agree to the <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                        </FormLabel>
                         <FormMessage />
                    </div>
                    </FormItem>
                )}
            />

          <div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>
          </div>
        </form>
      </Form>
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-muted-foreground">
              Or
            </span>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </p>
        </div>
      </div>
    </>
  );
}

export default function SignUpForm() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignUpFormInner />
        </Suspense>
    )
}
