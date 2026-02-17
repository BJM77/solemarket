import { ShieldCheck, CheckCircle, UserCheck } from 'lucide-react';

export default function TrustBar() {
    return (
        <section className="bg-gray-50 dark:bg-gray-900/50 py-12 border-t border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Authenticity Guarantee</h3>
                        <p className="text-gray-500 text-sm">Every pair is verified by our experts before shipping.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                            <CheckCircle className="h-7 w-7" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Verified Sellers</h3>
                        <p className="text-gray-500 text-sm">We verify the identity of every seller on our platform.</p>
                    </div>

                    <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                            <UserCheck className="h-7 w-7" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">Community Driven</h3>
                        <p className="text-gray-500 text-sm">Join thousands of sneakerheads buying and selling daily.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
