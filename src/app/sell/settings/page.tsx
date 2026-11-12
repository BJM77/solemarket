import { AbnSettings } from '@/components/seller/AbnSettings';
import { PayIdSettings } from '@/components/seller/PayIdSettings';

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seller settings</h1>
        <p className="text-muted-foreground">Manage your PayID, ABN and sales export.</p>
      </div>
      <PayIdSettings />
      <AbnSettings />
    </div>
  );
}
