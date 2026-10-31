import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Eye, Heart, MessageSquare, Activity } from 'lucide-react';
import type { ProvenanceData } from '@/hooks/use-provenance-data';

export function ProvenanceLedger({ data }: { data: ProvenanceData }) {
  const listedLabel =
    data.daysListed === 0 ? 'Today' :
    data.daysListed === 1 ? '1 day ago' :
    `${data.daysListed} days ago`;

  // Nothing to show if there's zero real activity. Be honest.
  if (data.uniqueViews === 0 && !data.watchlistCount && !data.enquiryCount) {
    return null;
  }

  return (
    <Card className="bg-background border-border rounded-xl overflow-hidden">
      <CardHeader className="bg-muted/60 pb-4 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-700" />
          Provenance Ledger
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border text-sm">

          <Row icon={<Calendar className="h-4 w-4" />} label="Listed">
            {listedLabel}
          </Row>

          <Row icon={<Eye className="h-4 w-4" />} label="Unique views">
            {data.uniqueViews} {data.uniqueViews === 1 ? 'buyer' : 'buyers'}
          </Row>

          {data.watchlistCount !== null && (
            <Row icon={<Heart className="h-4 w-4" />} label="Watchlist">
              {data.watchlistCount} {data.watchlistCount === 1 ? 'person' : 'people'}
            </Row>
          )}

          {data.enquiryCount !== null && data.enquiryCount > 0 && (
            <Row icon={<MessageSquare className="h-4 w-4" />} label="Enquiries">
              {data.enquiryCount}
            </Row>
          )}

        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center p-4">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-medium text-foreground">{children}</div>
    </div>
  );
}
