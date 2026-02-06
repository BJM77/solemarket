
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, Shield, Upload, DollarSign, Package } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works | Picksy Marketplace',
  description: 'Learn how to buy and sell collectibles securely on Picksy. From AI-powered listings to secure payments and the Picksy Vault.',
};

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
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is Picksy safe for buyers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Picksy uses secure payment processing and offers the Picksy Vault for high-value item verification to ensure you get exactly what you paid for.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I sell on Picksy?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can easily list items using our AI-powered tools. Simply upload a photo, and our AI will help with the description, pricing, and grading.'
        }
      },
      {
        '@type': 'Question',
        name: 'What is the Picksy Vault?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Picksy Vault is a third-party verification and secure storage service for high-value collectibles. It ensures authenticity and eliminates shipping risks.'
        }
      }
    ]
  };

  return (
    <div className="bg-gray-50/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
