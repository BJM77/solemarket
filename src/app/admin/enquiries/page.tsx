
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { getEnquiries, updateEnquiryStatus } from '@/app/actions/enquiries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Phone, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AdminEnquiriesPage() {
    const { user } = useUser();
    const { toast } = useToast();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEnquiries = async () => {
            if (!user) return;
            try {
                const idToken = await user.getIdToken();
                const result = await getEnquiries(idToken);
                if (result.error) {
                    toast({ title: 'Error', description: result.error, variant: 'destructive' });
                } else if (result.enquiries) {
                    setEnquiries(result.enquiries);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEnquiries();
    }, [user, toast]);

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!user) return;
        try {
            const idToken = await user.getIdToken();
            const result = await updateEnquiryStatus(idToken, id, newStatus);
            if (result.success) {
                setEnquiries(enquiries.map(e => e.id === id ? { ...e, status: newStatus } : e));
                toast({ title: 'Status Updated', description: `Enquiry marked as ${newStatus}.` });
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-black tracking-tight">DealSafe Enquiries</h1>
                <p className="text-muted-foreground">Manage incoming high-value trade verified concierge requests.</p>
            </div>

            <div className="grid gap-6">
                {enquiries.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No inquiries found.
                        </CardContent>
                    </Card>
                ) : (
                    enquiries.map((enquiry) => (
                        <Card key={enquiry.id} className={enquiry.status === 'new' ? 'border-primary/50 shadow-md' : ''}>
                            <CardHeader className="flex flex-row items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-xl font-bold">{enquiry.name}</CardTitle>
                                        <Badge variant={enquiry.status === 'new' ? 'default' : 'secondary'}>
                                            {enquiry.status === 'new' ? 'New Request' : enquiry.status}
                                        </Badge>
                                        <Badge variant="outline" className="bg-primary/5">{enquiry.type}</Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Mail className="h-4 w-4" />
                                            <a href={`mailto:${enquiry.email}`} className="hover:text-primary underline-offset-4 hover:underline">{enquiry.email}</a>
                                        </div>
                                        {enquiry.phoneNumber && (
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="h-4 w-4" />
                                                <a href={`tel:${enquiry.phoneNumber}`} className="hover:text-primary">{enquiry.phoneNumber}</a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-4 w-4" />
                                            {formatDistanceToNow(new Date(enquiry.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {enquiry.status === 'new' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => handleStatusUpdate(enquiry.id, 'responded')}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Mark Responded
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => handleStatusUpdate(enquiry.id, 'closed')}
                                    >
                                        Archive
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/30 p-4 rounded-xl border">
                                    <p className="whitespace-pre-wrap text-slate-700 leading-relaxed italic">
                                        "{enquiry.message}"
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
