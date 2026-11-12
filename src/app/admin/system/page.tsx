import { Metadata } from 'next';
import { ConnectionStatus } from '@/components/admin/system/ConnectionStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Key } from 'lucide-react';
import { DataMigrationPanel } from '@/components/admin/system/DataMigrationPanel';

export const metadata: Metadata = {
  title: 'System Health | Admin',
  description: 'Monitor API connections and system status.',
};

export default function SystemPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Diagnostics</h1>
        <p className="text-muted-foreground">Monitor backend services and run maintenance tasks.</p>
      </div>

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connections" className="gap-2"><Key className="h-4 w-4" /> API Connections</TabsTrigger>
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
              serviceName="Facebook Catalog Feed"
              endpoint="/api/feeds/facebook"
              docsUrl="https://business.facebook.com/commerce"
            />
          </div>

          <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl dark:bg-orange-900/20 dark:border-orange-800">
            <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-2">
              Manual Facebook Sync
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-300 leading-relaxed max-w-2xl">
              To instantly push new products to your Facebook Shop and Advantage+ Ads:
              <br/>
              1. Copy this URL: <code className="bg-white dark:bg-black/40 px-2 py-0.5 rounded font-mono text-xs select-all">https://benched.au/api/feeds/facebook</code>
              <br/>
              2. Go to <strong>Meta Commerce Manager</strong> &gt; <strong>Data Sources</strong>.
              <br/>
              3. Select your feed and click <strong>&quot;Fetch Now&quot;</strong>.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>System Maintenance</CardTitle>
              <CardDescription>Perform administrative tasks and database management.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataMigrationPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
