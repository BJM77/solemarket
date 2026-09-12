
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoriesManager from '@/components/admin/management/CategoriesManager';
import AttributesManager from '@/components/admin/management/AttributesManager';
import MaintenanceManager from '@/components/admin/management/MaintenanceManager';
import { PageHeader } from "@/components/layout/PageHeader";

export default function AdminManagementPage() {
  return (
    <div>
      <PageHeader
        title="Marketplace Management"
        description="Manage all dropdown options, categories, and marketplace settings in one place."
      />
      <Tabs defaultValue="categories" className="mt-8">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-4">
            <CategoriesManager />
        </TabsContent>
        <TabsContent value="attributes" className="mt-4">
            <AttributesManager />
        </TabsContent>
        <TabsContent value="maintenance" className="mt-4">
            <MaintenanceManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
