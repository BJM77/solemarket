import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SignInForm from '@/components/auth/SignInForm';
import Link from 'next/link';
import { withRedirectParam } from '@/lib/auth/sanitize-redirect';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Benched to buy and sell sneakers and collector cards across Australia.',
  robots: { index: false, follow: true },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const rawRedirect = typeof resolved.redirect === 'string' ? resolved.redirect : undefined;
  const signUpHref = withRedirectParam('/sign-up', rawRedirect);

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <Card className="w-full max-w-md p-6 shadow-xl border-t-4 border-primary h-fit bg-card text-card-foreground">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold font-headline text-center"><h1>Sign In</h1></CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">New here? </span>
            <Link href={signUpHref} className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
