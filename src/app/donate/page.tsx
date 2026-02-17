

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createDonation } from "@/lib/firebase/client-ops";
import { getCurrentUserIdToken } from "@/lib/firebase/auth";
import { Gift, Package, Send } from "lucide-react";
import { Loader2 } from "lucide-react";

const donationFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required." }),
  email: z.string().email({ message: "A valid email is required." }),
  donationType: z.enum(["Cards", "Coins", "Mixed Collectibles"]),
  description: z
    .string()
    .min(10, { message: "Please provide a brief description." }),
  quantity: z
    .string()
    .min(1, { message: "Please estimate the quantity." }),
});

type DonationFormValues = z.infer<typeof donationFormSchema>;

export default function DonatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DonationFormValues>({
    resolver: zodResolver(donationFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      donationType: "Cards",
      description: "",
      quantity: "",
    },
  });

  async function onSubmit(values: DonationFormValues) {
    setIsLoading(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) {
        toast({ title: "Please sign in", description: "You must be signed in to make a donation.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      await createDonation(values, idToken);
      toast({
        title: "Donation Submitted!",
        description:
          "Thank you for your generosity! Please check your email for the shipping label.",
      });
      form.reset();
      router.push("/");
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your donation.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container py-12 md:py-16">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline sm:text-5xl md:text-6xl">
          Benched Presents
        </h1>
        <p className="mt-6 text-lg max-w-3xl mx-auto text-muted-foreground">
          Give the gift of collecting. Donate your spare cards and coins to the
          'Benched Presents' program. We partner with children's hospitals across
          Australia to bring joy to kids who need it most.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8 font-headline">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="bg-primary/10 p-6 rounded-full mb-4">
              <Gift className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              1. Tell Us What You're Sending
            </h3>
            <p className="text-muted-foreground">
              Fill out the simple donation form below.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-primary/10 p-6 rounded-full mb-4">
              <Package className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              2. We Handle the Shipping
            </h3>
            <p className="text-muted-foreground">
              We'll instantly email you a prepaid Australia Post shipping
              label.
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-primary/10 p-6 rounded-full mb-4">
              <Send className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              3. You Make a Difference
            </h3>
            <p className="text-muted-foreground">
              Your donation is received, sorted, and delivered to our hospital partners.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8 font-headline">
          Donation Form
        </h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="donationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Donation Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select what you're donating" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Cards">Cards</SelectItem>
                        <SelectItem value="Coins">Coins</SelectItem>
                        <SelectItem value="Mixed Collectibles">
                          Mixed Collectibles
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Quantity</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Approx. 100 cards" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brief Description of Items</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., A mix of basketball cards from the 90s."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Donation
            </Button>
          </form>
        </Form>
      </section>
    </div>
  );
}
