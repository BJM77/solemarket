import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle, SearchCode, ShieldCheck, Fingerprint } from "lucide-react";
import FAQSchema from "@/components/seo/FAQSchema";

const authenticityFaqs = [
  {
    question: "Does Benched authenticate items?",
    answer: "No single authority can physically authenticate every item traded online instantly. Instead, Benched utilizes a multi-layered trust approach: AI Vision pre-screening during listing, direct PayID or cash-on-pickup payments so buyers can inspect before paying in person, and a strict seller penalty system for counterfeits."
  },
  {
    question: "What is AI Pre-Screening?",
    answer: "Our Genkit AI pipeline analyzes every uploaded listing photo to detect metadata (like card set limits, sneaker style codes) and flag low-quality or suspicious stock images before they go live."
  },
  {
    question: "What happens if I receive a fake item?",
    answer: "Benched doesn't hold payments, so for high-value items we recommend cash on pickup in Perth, where you inspect the item before paying. If a PayID purchase arrives fake or severely misrepresented, report it to us from your order page. We investigate, remove the listing and ban sellers who sell replicas."
  },
  {
    question: "Can anyone sell on Benched?",
    answer: "Yes, we are a peer-to-peer marketplace. However, sellers who abuse the platform or attempt to sell replicas are permanently banned, and we cooperate with police and banks on fraud reports."
  }
];

export default function AuthenticityPage() {
    return (
        <div className="bg-background min-h-screen text-foreground pb-20">
            <FAQSchema questions={authenticityFaqs} />
            <PageHeader
                title="Authenticity & Integrity"
                description="We don't rely on blind faith. We rely on system-enforced trust."
            />

            <div className="container mx-auto px-4 mt-12 max-w-5xl">
                <div className="mb-16">
                    <h2 className="text-3xl font-black mb-6">The Fake Epidemic</h2>
                    <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                        The collectible market—specifically sneakers and cards—is flooded with replicas. Many platforms claim to "Authenticate" everything, but human error is inevitable, and shipping items back and forth is slow and expensive.
                    </p>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        At <strong className="text-foreground">Benched</strong>, we take a different approach. We are a peer-to-peer marketplace, meaning we do not physically hold the inventory. Instead, we have constructed an environment where **selling fakes is unprofitable and mathematically risky**.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <Card className="bg-card border-border hover:border-orange-500/50 transition-colors">
                        <CardContent className="p-8">
                            <SearchCode className="h-12 w-12 text-orange-700 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">1. AI Vision Pre-Screening</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Our listing flow uses advanced AI models to scan every image. If a seller uploads generic images, screenshots, or highly suspicious items lacking physical context, our system flags it for manual review before it ever reaches the public feed.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border hover:border-emerald-500/50 transition-colors">
                        <CardContent className="p-8">
                            <LockIcon className="h-12 w-12 text-emerald-700 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">2. Inspect Before You Pay</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Cash on pickup in Perth lets you check the item in person before any money changes hands. For PayID orders, only pay the PayID shown on your Benched order page, with your order reference.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border hover:border-red-500/50 transition-colors">
                        <CardContent className="p-8">
                            <ShieldAlert className="h-12 w-12 text-red-500 mb-6" />
                            <h3 className="text-xl font-bold text-foreground mb-4">3. Permanent Network Bans</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                If a seller is caught attempting to pass off replicas, their account, IP, and associated payment methods are permanently blacklisted from the Benched network. We operate a zero-tolerance policy.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-gradient-to-br from-primary/20 to-transparent border border-primary/20 rounded-3xl p-10 md:p-16">
                    <h2 className="text-3xl font-black text-foreground mb-6 flex items-center gap-3">
                        <Fingerprint className="text-primary h-8 w-8" />
                        Buyer Responsibility
                    </h2>
                    <p className="text-lg text-foreground/80 leading-relaxed mb-6">
                        While our software and seller checks help, peer-to-peer trading requires vigilance. We encourage all buyers to carefully inspect high-resolution photos provided by sellers, engage in dialogue, and inspect in person with cash on pickup for any significant purchase.
                    </p>
                    <div className="flex items-center gap-4 text-sm font-bold text-muted-foreground">
                        <CheckCircle className="text-green-700 h-5 w-5" /> Never pay a PayID or bank account sent to you by message, email or text.
                    </div>
                </div>
            </div>
        </div>
    );
}

function LockIcon({ className }: { className?: string }) {
    return <ShieldCheck className={className} />;
}
