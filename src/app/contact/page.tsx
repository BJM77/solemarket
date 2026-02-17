import type { Metadata } from 'next';
import ContactForm from '@/components/contact/ContactForm';

export const metadata: Metadata = {
    title: 'Contact Us | Benched',
    description: 'Get in touch with the Benched team. We\'re here to help with any questions or feedback you may have.',
};

export default function ContactPage() {
    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
                <p className="text-lg text-muted-foreground">
                    Have a question or feedback? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                </p>
            </div>

            <ContactForm />

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                    <div className="text-2xl mb-2">📧</div>
                    <h3 className="font-semibold mb-2">Email</h3>
                    <p className="text-sm text-muted-foreground">support@benched.au</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                    <div className="text-2xl mb-2">⏰</div>
                    <h3 className="font-semibold mb-2">Response Time</h3>
                    <p className="text-sm text-muted-foreground">Within 24 hours</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                    <div className="text-2xl mb-2">🌏</div>
                    <h3 className="font-semibold mb-2">Location</h3>
                    <p className="text-sm text-muted-foreground">Australia</p>
                </div>
            </div>
        </div>
    );
}
