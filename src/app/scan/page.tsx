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
            </div>
        </div>
    );
}
