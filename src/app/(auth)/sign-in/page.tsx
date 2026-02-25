import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignInForm from '@/components/auth/SignInForm';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card className="w-full max-w-md p-6 shadow-xl border-t-4 border-primary h-fit bg-card text-card-foreground">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold font-headline text-center">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-500">Don&apos;t have an account? </span>
            <Link href="/sign-up" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
