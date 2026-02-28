'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { getAdminWantedCriteria, addAdminWantedCriterion, deleteAdminWantedCriterion, type AdminWantedCriterion } from '@/app/actions/admin-wanted';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ShieldAlert, Search, Inbox, Tag, X } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function AdminWantedManager() {
    const [criteria, setCriteria] = useState<AdminWantedCriterion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Form state
    const [newKeywords, setNewKeywords] = useState('');
    const [newCategory, setNewCategory] = useState('All');
    const [newNotes, setNewNotes] = useState('');

    const fetchCriteria = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error("Not authenticated");
            const res = await getAdminWantedCriteria(token);
            if (res.success && res.criteria) {
                setCriteria(res.criteria);
            } else {
                throw new Error(res.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to load watch list", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchCriteria();
    }, [fetchCriteria]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeywords.trim()) return;

        const keywordsArray = newKeywords.split(',').map(k => k.trim()).filter(Boolean);

        startTransition(async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error("Not authenticated");
                const res = await addAdminWantedCriterion(token, keywordsArray, newCategory, newNotes);

                if (res.success) {
                    toast({ title: "Criterion Added", description: "Any new listings matching these keywords will be held for review." });
                    setNewKeywords('');
                    setNewNotes('');
                    fetchCriteria();
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Failed to add", description: error.message, variant: "destructive" });
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure you want to remove this watch criterion?")) return;

        startTransition(async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error("Not authenticated");
                const res = await deleteAdminWantedCriterion(token, id);

                if (res.success) {
                    toast({ title: "Criterion Removed" });
                    fetchCriteria();
                } else {
                    throw new Error(res.error);
                }
            } catch (error: any) {
                toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                        <ShieldAlert className="h-8 w-8 text-primary" />
                        Admin Watch List
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        Listings matching these criteria will be automatically held for your review.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Card */}
                <Card className="lg:col-span-1 border-none shadow-premium-sm rounded-2xl overflow-hidden h-fit sticky top-24">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                        <CardTitle className="text-xl font-bold">Add New Watch</CardTitle>
                        <CardDescription>Target specific keywords and categories.</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleAdd}>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="keywords" className="font-bold text-xs uppercase tracking-widest text-slate-500">Keywords (comma separated)</Label>
                                <Input
                                    id="keywords"
                                    placeholder="e.g. Kobe 6, Wembanyama Prizm"
                                    value={newKeywords}
                                    onChange={(e) => setNewKeywords(e.target.value)}
                                    className="rounded-xl h-12"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category" className="font-bold text-xs uppercase tracking-widest text-slate-500">Category</Label>
                                <Select value={newCategory} onValueChange={setNewCategory}>
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Categories</SelectItem>
                                        <SelectItem value="Sneakers">Sneakers</SelectItem>
                                        <SelectItem value="Collector Cards">Collector Cards</SelectItem>
                                        <SelectItem value="Accessories">Accessories</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="font-bold text-xs uppercase tracking-widest text-slate-500">Internal Notes</Label>
                                <Input
                                    id="notes"
                                    placeholder="Why are you watching this?"
                                    value={newNotes}
                                    onChange={(e) => setNewNotes(e.target.value)}
                                    className="rounded-xl h-12"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="p-6 pt-0">
                            <Button type="submit" disabled={isPending} className="w-full h-12 font-bold rounded-xl gap-2">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Initialize Watch Protocol
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                {/* List Card */}
                <Card className="lg:col-span-2 border-none shadow-premium-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Search className="h-5 w-5 text-primary" />
                            Active Watch Criteria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground font-medium">Scanning protocol...</p>
                            </div>
                        ) : criteria.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                                <div className="h-20 w-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                                    <Inbox className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Watches</h3>
                                <p className="text-slate-500 max-w-sm">You haven&apos;t added any personal wanted items to your watch list yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="pl-6">Keywords</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {criteria.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.keywords.map((kw, i) => (
                                                        <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-bold">
                                                            {kw}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium bg-white dark:bg-slate-950">
                                                    {item.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 italic line-clamp-1">
                                                    {item.notes || '-'}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-slate-400 hover:text-rose-600 rounded-full"
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 p-6 rounded-2xl">
                <h4 className="font-bold text-indigo-800 dark:text-indigo-400 mb-2 flex items-center gap-2 uppercase tracking-widest text-xs">
                    <Tag className="h-4 w-4" />
                    How the Watch List works
                </h4>
                <ul className="text-sm text-indigo-700 dark:text-indigo-300 space-y-2 list-disc list-inside">
                    <li>When any user attempts to <strong>Publish</strong> a listing, our system cross-checks the title against your keywords.</li>
                    <li>If a match is found, the listing is immediately placed <strong>On Hold</strong> instead of going live.</li>
                    <li>You will be able to find these matching listings in the <strong>Escrow Ledger</strong> or <strong>Products</strong> section with the reason &quot;Personal Wanted Match&quot;.</li>
                    <li>This gives you the first opportunity to view the listing before the public sees it.</li>
                </ul>
            </div>
        </div>
    );
}
