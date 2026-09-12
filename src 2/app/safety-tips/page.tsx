
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Eye, Users, MessageSquare } from "lucide-react";

const safetyTips = [
  {
    icon: <ShieldCheck className="h-8 w-8 text-primary" />,
    title: "Verify Item Details",
    description: "Carefully review the item's description, photos, and condition. If a deal seems too good to be true, it probably is. Ask the seller for more information or photos if needed."
  },
  {
    icon: <Eye className="h-8 w-8 text-primary" />,
    title: "Check Seller Reviews",
    description: "Look at the seller's rating and read feedback from other buyers. A strong history of positive reviews is a good sign of a reliable seller."
  },
  {
    icon: <MessageSquare className="h-8 w-8 text-primary" />,
    title: "Communicate on Benched",
    description: "Keep all communication with the other party on the Benched messaging platform. Do not share personal contact information like emails or phone numbers."
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Meet in Public Places",
    description: "For in-person transactions, always arrange to meet in a well-lit, public place. Consider meeting at a police station or a busy coffee shop."
  }
];

export default function SafetyTipsPage() {
  return (
    <div className="bg-gray-50/50">
      <div className="container py-12 md:py-16">
        <PageHeader
          title="Safety Tips for Buyers & Sellers"
          description="Follow these guidelines to ensure a safe and secure experience on Benched."
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            {safetyTips.map((tip) => (
                <Card key={tip.title}>
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="bg-primary/10 p-4 rounded-full w-fit">
                            {tip.icon}
                        </div>
                        <CardTitle>{tip.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{tip.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
