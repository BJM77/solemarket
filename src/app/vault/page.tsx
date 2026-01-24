
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, PackageCheck, Lock } from "lucide-react";
import Image from "next/image";

const vaultFeatures = [
    {
        icon: <ShieldCheck className="h-8 w-8 text-primary" />,
        title: "Expert Authentication",
        description: "Our team of specialists physically inspects your high-value items, verifying authenticity and condition to eliminate counterfeits."
    },
    {
        icon: <PackageCheck className="h-8 w-8 text-primary" />,
        title: "Secure Handling",
        description: "Items are professionally handled in a secure facility, ensuring they remain in pristine condition throughout the verification process."
    },
    {
        icon: <Lock className="h-8 w-8 text-primary" />,
        title: "Trusted Escrow",
        description: "Funds are held securely in escrow and are only released to the seller once the item is authenticated and shipped to the buyer."
    }
]

export default function VaultPage() {
  return (
    <div className="bg-gray-50/50">
        <div className="container py-12 md:py-16">
            <PageHeader
                title="Picksy Vault"
                description="The ultimate peace of mind for high-value collectibles. We authenticate, secure, and guarantee your transaction."
            />
             <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg mt-8">
                <Image 
                    src="https://images.unsplash.com/photo-1583912268183-a34d4a132dc0?q=80&w=1740&auto=format&fit=crop"
                    alt="A secure vault"
                    fill
                    className="object-cover"
                    data-ai-hint="secure vault"
                />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                 <div className="absolute bottom-8 left-8 text-white">
                    <h2 className="text-4xl font-bold">Security. Authenticity. Trust.</h2>
                    <p className="text-lg mt-2 max-w-xl">The Picksy Vault is our premium service for transactions over $250.</p>
                 </div>
            </div>

            <div className="mt-16 md:mt-24">
                <h2 className="text-3xl font-bold text-center mb-12 font-headline">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {vaultFeatures.map((p) => (
                        <Card key={p.title} className="text-center">
                            <CardHeader>
                                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-2">
                                    {p.icon}
                                </div>
                                <CardTitle>{p.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{p.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
             <div className="prose lg:prose-lg max-w-4xl mx-auto mt-16 text-center">
                <h3>For Sellers</h3>
                <p>When you list an item over $250, you can opt-in to use the Picksy Vault. When the item sells, you'll ship it directly to our secure facility. We handle the rest.</p>
                <h3>For Buyers</h3>
                <p>Purchase any Vault-eligible item with confidence. We verify the item's authenticity and condition before it's shipped to you, guaranteeing you get exactly what you paid for.</p>
            </div>
        </div>
    </div>
  );
}
