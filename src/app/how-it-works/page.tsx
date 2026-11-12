
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ShoppingCart, Shield, Upload, DollarSign, Package } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'How buying and selling works on Benched: send a request, pay the seller directly by PayID or cash on pickup in Perth.',
};

const forBuyers = [
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: "Discover & Find",
    description: "Use our search and filters to browse basketball shoes and collector cards from sellers across Australia."
  },
  {
    icon: <ShoppingCart className="h-8 w-8 text-primary" />,
    title: "Send a request",
    description: "Buy Now or make an offer. The seller accepts, then you pay them directly by PayID, or in cash when you collect in Perth. Benched does not hold your payment."
  },
  {
    icon: <Shield className="h-8 w-8 text-primary" />,
    title: "Inspect with care",
    description: "Check photos, ask questions, and for higher-value items consider cash on pickup in Perth so you can inspect before you pay. Benched does not physically authenticate items."
  }
];

const forSellers = [
  {
    icon: <Upload className="h-8 w-8 text-primary" />,
    title: "List Your Items",
    description: "Create a listing with photos, a price and a description. Tools on the site can help you fill in details from a photo."
  },
  {
    icon: <Package className="h-8 w-8 text-primary" />,
    title: "Accept and fulfil",
    description: "When a buyer sends a request, you can accept, decline or counter. After you accept, the buyer pays you directly by PayID or cash on pickup in Perth."
  },
  {
    icon: <DollarSign className="h-8 w-8 text-primary" />,
    title: "Get paid directly",
    description: "There is no platform fee. Mark the order paid or collected when the money or the pickup is complete."
  }
];


export default function HowItWorksPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is Benched safe for buyers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Buyers pay sellers directly by PayID or cash on pickup in Perth. Benched does not hold payments or physically authenticate items. Inspect photos, ask questions, and consider cash on pickup for higher-value purchases. Report a problem from your order or the contact page.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do I sell on Benched?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'You can easily list items using our AI-powered tools. Simply upload a photo, and our AI will help with the description, pricing, and grading.'
        }
      },
      {
        '@type': 'Question',
        name: 'Does Benched authenticate items?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Benched is a peer-to-peer marketplace and does not physically inspect or authenticate items. For graded cards, a PSA certification number can be looked up in PSA\'s records so you can compare the cert details with the listing photos. That check does not confirm the physical card is the same card.'
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
          title="How Benched Works"
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
