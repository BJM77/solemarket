
import { Suspense } from 'react';
import SignInForm from '@/components/auth/SignInForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LogPage() {
    return (
        <div className="min-h-screen flex justify-center bg-gray-50 p-4 pt-12">
            <Card className="w-full max-w-md p-6 shadow-xl border-t-4 border-primary h-fit">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold font-headline">Welcome Back</CardTitle>
                    <CardDescription>Sign in to access your Picksy account</CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div>Loading...</div>}>
                        <SignInForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
