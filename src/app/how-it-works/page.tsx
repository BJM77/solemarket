
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, Shield, Upload, DollarSign, Package } from "lucide-react";

const forBuyers = [
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: "Discover & Find",
    description: "Use our powerful search and filtering tools to browse thousands of collectibles from sellers across Australia."
  },
  {
    icon: <ShoppingCart className="h-8 w-8 text-primary" />,
    title: "Purchase Securely",
    description: "Add items to your cart and check out with confidence. Your payment is held securely until you confirm receipt of your item."
  },
  {
    icon: <Shield className="h-8 w-8 text-primary" />,
    title: "Receive & Verify",
    description: "For high-value items, use our optional Picksy Vault service for third-party verification and secure storage."
  }
];

const forSellers = [
  {
    icon: <Upload className="h-8 w-8 text-primary" />,
    title: "List Your Items",
    description: "Easily create listings with our AI-powered tools that help you write descriptions, suggest prices, and grade your cards."
  },
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: "Ship to Buyer",
    description: "Once an item is sold, ship it directly to the buyer or to the Picksy Vault for verification, depending on the transaction type."
  },
  {
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    title: "Get Paid Fast",
    description: "Payment is released to you as soon as the buyer confirms receipt or the item is verified by our Vault service."
  }
];

export default function HowItWorksPage() {
  return (
    <div className="bg-gray-50/50">
      <div className="container py-12 md:py-16">
        <PageHeader
          title="How Picksy Works"
          description="A simple, secure, and modern marketplace for Australian collectors."
        />

        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">For Buyers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {forBuyers.map((item) => (
              <Card key={item.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                    {item.icon}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">For Sellers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {forSellers.map((item) => (
              <Card key={item.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                    {item.icon}
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
