'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase/config';
import { getEmailLogs, sendTestEmail } from '@/app/actions/email-admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, RefreshCw, Search, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function EmailManagementPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            const result = await getEmailLogs(token);
            if (result.success) {
                setLogs(result.logs || []);
            } else {
                toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) fetchLogs();
        });
        return () => unsubscribe();
    }, [fetchLogs]);

    const handleSendTest = async () => {
        if (!testEmail) return;
        setSendingTest(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            const result = await sendTestEmail(token, testEmail);
            if (result.success) {
                toast({ title: 'Success', description: 'Test email sent!' });
                setTestEmail('');
                fetchLogs();
            } else {
                toast({ title: 'Failed', description: result.error, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSendingTest(false);
        }
    };

    const filteredLogs = logs.filter(log => 
        log.to.some((email: string) => email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
                    <p className="text-muted-foreground">Monitor and test SendGrid email delivery.</p>
                </div>
                <Button onClick={fetchLogs} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" /> Recent Activity
                        </CardTitle>
                        <CardDescription>Last 50 emails sent from the platform.</CardDescription>
                        <div className="pt-2 relative">
                            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by recipient or subject..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8">Loading logs...</TableCell></TableRow>
                                    ) : filteredLogs.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No logs found.</TableCell></TableRow>
                                    ) : (
                                        filteredLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="font-medium max-w-[200px] truncate">
                                                    {log.to.join(', ')}
                                                </TableCell>
                                                <TableCell className="max-w-[250px] truncate">{log.subject}</TableCell>
                                                <TableCell>
                                                    <Badge className="gap-1 bg-transparent border-none p-0 text-inherit hover:bg-transparent">
                                                        {log.status === 'sent' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                        {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                                                        {log.status === 'dev_skipped' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                                        <span className="capitalize">{log.status}</span>
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="h-5 w-5" /> Test Configuration
                            </CardTitle>
                            <CardDescription>Send a verification email to any address.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Recipient Address</label>
                                <Input 
                                    placeholder="your-email@example.com" 
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                                onClick={handleSendTest}
                                disabled={sendingTest || !testEmail}
                            >
                                {sendingTest ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Test Email
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">System Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Provider</span>
                                <span className="font-medium">SendGrid</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">API Status</span>
                                <Badge className="bg-green-500">Connected</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Default Sender</span>
                                <span className="font-medium">onboarding@benched.au</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
