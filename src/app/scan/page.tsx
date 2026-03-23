import { PageHeader } from '@/components/layout/PageHeader';
import { SneakerScanner } from '@/components/scan/SneakerScanner';

export const metadata = {
    title: 'Sneaker Scanner | Benched',
    description: 'Instantly identify and list your sneakers using AI vision technology.',
};

export default function ScanPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-2xl mx-auto text-center mb-8">
                    <PageHeader
                        title="AI Sneaker Scanner"
                        description="Snap a photo of your kicks. We'll identify them and prep your listing."
                    />
                </div>
                
                <SneakerScanner />

                <div className="mt-20 pt-16 border-t border-slate-100 dark:border-white/5 max-w-2xl mx-auto">
                    <h2 className="text-2xl font-black uppercase mb-4 tracking-tight">AI-Powered Sneaker Identification</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        The Benched AI Sneaker Scanner is the fastest and most advanced tool for Australian collectors to list their gear. By leveraging state-of-the-art computer vision technology, our scanner instantly identifies your sneakers from a single photo, automatically pulling in model names, brand data, and market specifications to prep your listing in seconds.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Say goodbye to manual typing and human error. Our local Aussie-based marketplace is designed to make selling as seamless as possible, helping you turn your pre-loved kicks into your next big purchase without the friction of traditional platforms.
                    </p>
                </div>
            </div>
        </div>
    );
}
