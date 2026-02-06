
import DashboardSidebar from '@/components/dashboard/dashboard-sidebar';

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="hidden lg:block border-r bg-muted/10">
            <DashboardSidebar />
        </div>
        <div className="flex-1">
            {children}
        </div>
    </div>
  );
}
