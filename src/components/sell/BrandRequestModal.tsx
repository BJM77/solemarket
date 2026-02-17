'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { requestBrandAction } from '@/app/actions/brand-requests';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export function BrandRequestModal() {
    const [brandName, setBrandName] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brandName.trim()) {
            toast({ title: "Brand name is required", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) throw new Error("Auth required");

            const result = await requestBrandAction(idToken, brandName, notes);
            if (result.success) {
                toast({ title: "Success", description: result.message });
                setIsOpen(false);
                setBrandName('');
                setNotes('');
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-primary font-bold hover:bg-primary/5 px-2">
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Missing a brand?
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Request a Brand</DialogTitle>
                        <DialogDescription>
                            Can't find the brand you're looking for? Let us know and we'll review it for addition.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brandName">Brand Name</Label>
                            <Input
                                id="brandName"
                                placeholder="e.g. A Bathing Ape"
                                value={brandName}
                                onChange={(e) => setBrandName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Additional Info (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Why should we add this brand?"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading} className="w-full font-bold">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Request"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
