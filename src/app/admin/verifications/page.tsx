'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { approveVerificationRequest, getPendingVerificationRequests, rejectVerificationRequest } from '@/app/actions/verification';
import { VerificationRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, ExternalLink, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminVerificationsPage() {
    const { user, isUserLoading: loadingUser } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const [requests, setRequests] = useState<VerificationRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);

    useEffect(() => {
        if (!user) return;
        // Basic Client-side role check (Server action does the real check)
        if ((user as any).role !== 'admin' && (user as any).role !== 'superadmin') {
            router.push('/');
            return;
        }

        const fetchRequests = async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) return;
                const result = await getPendingVerificationRequests(token);
                if (result.requests) {
                    setRequests(result.requests);
                } else if (result.error) {
                    toast({ variant: 'destructive', title: "Error", description: result.error });
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, [user, router, toast]);

    const handleApprove = async (requestId: string) => {
        setActionLoading(requestId);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) return;

            const result = await approveVerificationRequest(token, requestId);

            if (result.success) {
                toast({ title: "Approved", description: "User has been verified." });
                setRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to approve." });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (requestId: string) => {
        if (!rejectReason) {
            toast({ variant: 'destructive', title: "Reason Required", description: "Please provide a reason for rejection." });
            return;
        }

        setActionLoading(requestId);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) return;

            const result = await rejectVerificationRequest(token, requestId, rejectReason);

            if (result.success) {
                toast({ title: "Rejected", description: "Verification request rejected." });
                setRequests(prev => prev.filter(r => r.id !== requestId));
                setRejectReason('');
                setSelectedRequest(null); // Close dialog
            } else {
                toast({ variant: 'destructive', title: "Error", description: result.error });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "Failed to reject." });
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container py-10 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Verification Requests</h1>
                    <p className="text-muted-foreground">Review user IDs and approve access.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {requests.length} Pending
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-gray-50">
                    <Check className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">All caught up!</h3>
                    <p className="text-muted-foreground">There are no pending verification requests.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map(request => (
                        <Card key={request.id} className="overflow-hidden flex flex-col">
                            <CardHeader className="bg-gray-50/50 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg">{request.userName}</CardTitle>
                                        <CardDescription className="text-xs font-mono">{request.userId}</CardDescription>
                                    </div>
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full uppercase font-bold">Pending</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 flex-grow space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground uppercase">Reason for Joining</Label>
                                    <p className="text-sm bg-gray-50 p-2 rounded border">{request.userMessage || "No reason provided."}</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground uppercase">Submitted Documents</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {request.documentUrls.map((url, idx) => (
                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block group relative aspect-video bg-gray-100 rounded-md overflow-hidden border hover:border-blue-500 transition-all">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt={`Doc ${idx + 1}`} className="object-cover w-full h-full" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all">
                                                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50/50 flex gap-2 pt-4 border-t">
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApprove(request.id)}
                                    disabled={!!actionLoading}
                                >
                                    {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                    Approve
                                </Button>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" className="flex-1" onClick={() => setSelectedRequest(request)}>
                                            <X className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Reject Request</DialogTitle>
                                            <DialogDescription>
                                                Why are you rejecting {request.userName}&apos;s verification? This will be sent to the user.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-4">
                                            <Label htmlFor="reject-reason" className="mb-2 block">Reason</Label>
                                            <Input
                                                id="reject-reason"
                                                value={rejectReason}
                                                onChange={(e) => setRejectReason(e.target.value)}
                                                placeholder="e.g., ID is blurry, Name mismatch..."
                                            />
                                        </div>
                                        <DialogFooter>
                                            <Button
                                                variant="destructive"
                                                onClick={() => handleReject(request.id)}
                                                disabled={!!actionLoading}
                                            >
                                                {actionLoading === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
