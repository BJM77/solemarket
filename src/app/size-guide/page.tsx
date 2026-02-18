import { SITE_NAME } from '@/config/brand';

export default function SizeGuidePage() {
    return (
        <div className="container max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-black mb-8 uppercase tracking-tighter italic">Size Guide</h1>
            <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg text-muted-foreground mb-8">
                    Finding the perfect fit is essential for performance. Use our guide to ensure your next pickup is game-ready.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <section>
                        <h2 className="text-2xl font-bold mb-4">Men's Sizing</h2>
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2">US</th>
                                    <th className="text-left py-2">UK</th>
                                    <th className="text-left py-2">EU</th>
                                    <th className="text-left py-2">CM</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b"><td className="py-2">7</td><td className="py-2">6</td><td className="py-2">40</td><td className="py-2">25</td></tr>
                                <tr className="border-b"><td className="py-2">8</td><td className="py-2">7</td><td className="py-2">41</td><td className="py-2">26</td></tr>
                                <tr className="border-b"><td className="py-2">9</td><td className="py-2">8</td><td className="py-2">42.5</td><td className="py-2">27</td></tr>
                                <tr className="border-b"><td className="py-2">10</td><td className="py-2">9</td><td className="py-2">44</td><td className="py-2">28</td></tr>
                                <tr className="border-b"><td className="py-2">11</td><td className="py-2">10</td><td className="py-2">45</td><td className="py-2">29</td></tr>
                                <tr className="border-b"><td className="py-2">12</td><td className="py-2">11</td><td className="py-2">46</td><td className="py-2">30</td></tr>
                            </tbody>
                        </table>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4">Brand Specifics</h2>
                        <ul className="space-y-4">
                            <li><strong>Nike/Jordan:</strong> Generally true to size (TTS). Performance models like the GT Cut series may run snug.</li>
                            <li><strong>Adidas:</strong> Often runs slightly large. Consider going down a half size for a 1:1 lockdown.</li>
                            <li><strong>Yeezy:</strong> 350 V2 and 700 series usually require going up a half size.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
}
