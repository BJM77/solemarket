'use client';

import { useFormStatus } from 'react-dom';
import { useActionState, useEffect, useRef } from 'react';
import { subscribeToNewsletter, type NewsletterState } from '@/app/actions/newsletter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState: NewsletterState = {
    message: '',
    error: '',
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button size="icon" className="rounded-lg" disabled={pending} type="submit">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
    );
}

export function NewsletterSignup() {
    const [state, formAction] = useActionState(subscribeToNewsletter, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset();
            toast({
                title: "Subscribed!",
                description: state.message,
            });
        } else if (state.error) {
            toast({
                title: "Error",
                description: state.error,
                variant: "destructive",
            });
        }
    }, [state, toast]);

    if (state.success) {
         return (
            <div className="flex items-center gap-2 text-green-600 font-medium h-10 p-2 bg-green-50 rounded-lg border border-green-100">
                <Check className="h-4 w-4" />
                <span className="text-sm">Subscribed!</span>
            </div>
        );
    }

    return (
        <form ref={formRef} action={formAction} className="flex gap-2">
            <Input 
                name="email" 
                className="flex-1 rounded-lg border-[#e7ebf3] dark:border-white/10 bg-transparent text-sm" 
                placeholder="Email" 
                type="email" 
                required
            />
            <SubmitButton />
        </form>
    );
}
