import { PageHeader } from '@/components/layout/PageHeader';
import { CardScanner } from '@/components/scan/CardScanner';

export const metadata = {
    title: 'Card Scanner | Benched',
    description: 'Instantly identify, grade, and list your trading cards using AI vision technology.',
};

export default function CardScanPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-black">
            <div className="container mx-auto px-4 py-8 md:py-12">
                <div className="max-w-2xl mx-auto text-center mb-8">
                    <PageHeader
                        title="AI Card Scanner"
                        description="Snap a photo of your cards. We'll identify the player, set, and estimate the grade."
                    />
                </div>
                
                <CardScanner />
            </div>
        </div>
    );
}
