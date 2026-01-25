
import { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { ConnectionStatus } from '@/components/admin/system/ConnectionStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Server, Key, Activity } from 'lucide-react';
import { AuditLogViewer } from '@/components/admin/system/AuditLogViewer';
import { SeedDatabaseButton } from '@/components/admin/system/SeedDatabaseButton';

export const metadata: Metadata = {
  title: 'System Health | Admin',
  description: 'Monitor API connections and system status.',
};

export default function SystemPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Diagnostics</h1>
        <p className="text-muted-foreground">Monitor external API connections and backend services.</p>
      </div>

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections" className="gap-2"><Key className="h-4 w-4" /> API Connections</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Activity className="h-4 w-4" /> Audit Logs</TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2"><Server className="h-4 w-4" /> Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ConnectionStatus
              serviceName="Google Gemini AI"
              endpoint="/api/health/ai"
              docsUrl="https://ai.google.dev/"
            />
            <ConnectionStatus
              serviceName="Firebase Auth"
              endpoint="/api/health/auth"
              docsUrl="https://firebase.google.com/docs/auth"
            />
            <ConnectionStatus
              serviceName="Firestore DB"
              endpoint="/api/health/db"
              docsUrl="https://firebase.google.com/docs/firestore"
            />
            <ConnectionStatus
              serviceName="Stripe Payments"
              endpoint="/api/health/stripe"
              docsUrl="https://stripe.com/docs/api"
            />
            <ConnectionStatus
              serviceName="SendGrid Email"
              endpoint="/api/health/email"
              docsUrl="https://sendgrid.com/docs"
            />
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>System Audit Log</CardTitle>
              <CardDescription>Recent administrative actions and system errors.</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>Perform administrative tasks and database management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h3 className="font-medium">Database Seeding</h3>
                  <p className="text-sm text-muted-foreground">Populate the database with initial categories and sample products.</p>
                </div>
                <SeedDatabaseButton />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div >
  );
}
