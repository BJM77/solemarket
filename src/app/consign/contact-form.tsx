'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect, useRef } from 'react';
import { submitConsignmentInquiry, type ConsignmentState } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const initialState: ConsignmentState = {
    message: '',
    error: '',
    fields: {},
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                </>
            ) : (
                'Send Inquiry'
            )}
        </Button>
    );
}

export function ConsignmentForm() {
    const [state, formAction] = useActionState(submitConsignmentInquiry, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.success && formRef.current) {
            formRef.current.reset();
        }
    }, [state.success]);

    return (
        <Card className="w-full max-w-xl mx-auto shadow-lg border-2 border-blue-100">
            <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-6 text-center">Get Your Free Valuation</h3>
                
                {state.success && (
                    <Alert className="mb-6 bg-green-50 border-green-200 text-green-800">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertTitle>Success!</AlertTitle>
                        <AlertDescription>{state.message}</AlertDescription>
                    </Alert>
                )}

                {state.error && (
                    <Alert className="mb-6 bg-red-50 border-red-200 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{state.error}</AlertDescription>
                    </Alert>
                )}

                <form ref={formRef} action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input 
                            id="name" 
                            name="name" 
                            placeholder="Your Name" 
                            required 
                            defaultValue={state.fields?.name}
                        />
                        {state.fields?.name && <p className="text-sm text-red-500">{state.fields.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="you@example.com" 
                            required 
                            defaultValue={state.fields?.email}
                        />
                         {state.fields?.email && <p className="text-sm text-red-500">{state.fields.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number (Optional)</Label>
                        <Input 
                            id="phone" 
                            name="phone" 
                            type="tel" 
                            placeholder="0400 000 000" 
                            defaultValue={state.fields?.phone}
                        />
                         {state.fields?.phone && <p className="text-sm text-red-500">{state.fields.phone}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="itemType">Type of Items</Label>
                            <Select name="itemType" defaultValue={state.fields?.itemType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sports Cards">Sports Cards</SelectItem>
                                    <SelectItem value="TCG">TCG (Pokémon, Magic, etc.)</SelectItem>
                                    <SelectItem value="Coins & Banknotes">Coins & Banknotes</SelectItem>
                                    <SelectItem value="Comics">Comics</SelectItem>
                                    <SelectItem value="Sealed Product">Sealed Product</SelectItem>
                                    <SelectItem value="Memorabilia">Memorabilia</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            {state.fields?.itemType && <p className="text-sm text-red-500">{state.fields.itemType}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="estimatedValue">Estimated Value</Label>
                            <Input 
                                id="estimatedValue" 
                                name="estimatedValue" 
                                placeholder="e.g., $5,000" 
                                required 
                                defaultValue={state.fields?.estimatedValue}
                            />
                            {state.fields?.estimatedValue && <p className="text-sm text-red-500">{state.fields.estimatedValue}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Tell us about your collection</Label>
                        <Textarea 
                            id="description" 
                            name="description" 
                            placeholder="I have a collection of..." 
                            className="min-h-[120px]" 
                            required 
                            defaultValue={state.fields?.description}
                        />
                        <p className="text-xs text-gray-500">Please provide a brief overview of what you have (e.g., '1990s NBA Cards', 'Gold Sovereigns').</p>
                        {state.fields?.description && <p className="text-sm text-red-500">{state.fields.description}</p>}
                    </div>

                    <SubmitButton />
                </form>
            </CardContent>
        </Card>
    );
}
