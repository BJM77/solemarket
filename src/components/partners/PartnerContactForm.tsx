"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { submitPartnerInquiryAction } from "@/app/actions/partners";

const formSchema = z.object({
    storeName: z.string().min(2, "Store name is required"),
    contactName: z.string().min(2, "Contact person name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    storeType: z.string({
        required_error: "Please select a store type",
    }),
    monthlyVolume: z.string().optional(),
    message: z.string().optional(),
});

export function PartnerContactForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            storeName: "",
            contactName: "",
            email: "",
            phone: "",
            message: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);

        try {
            const result = await submitPartnerInquiryAction(values);
            if (result.success) {
                toast({
                    title: "Inquiry Received",
                    description: "Thanks for your interest! Our partnership team will contact you shortly.",
                });
                form.reset();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Submission Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-xl font-bold mb-4 font-headline">Partner Inquiry</h3>
            <p className="text-muted-foreground mb-6 text-sm">
                Tell us about your business and we'll tailor a package for you.
            </p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="storeName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Store Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Vintage Vault" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="contactName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Contact Person</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your Name" className="h-12 sm:h-10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="storeType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="op_shop">Op Shop / Charity Store</SelectItem>
                                            <SelectItem value="antique">Antique Store</SelectItem>
                                            <SelectItem value="collectibles">Collectibles Store</SelectItem>
                                            <SelectItem value="pawn">Pawn Shop</SelectItem>
                                            <SelectItem value="estate">Estate Sales</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="store@example.com" type="email" className="h-12 sm:h-10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="0400..." className="h-12 sm:h-10" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="monthlyVolume"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Est. Monthly Items to List</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select volume" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="new">Just starting</SelectItem>
                                        <SelectItem value="low">1 - 50 items</SelectItem>
                                        <SelectItem value="medium">50 - 200 items</SelectItem>
                                        <SelectItem value="high">200+ items</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message / Questions</FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Any specific needs or questions about our AI tools?"
                                        className="resize-none"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full h-12" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Request Partner Access
                    </Button>
                </form>
            </Form>
        </div>
    );
}
