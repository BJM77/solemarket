'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Ruler } from 'lucide-react';

const SIZE_CHART = {
    nike: [
        { us: '4', uk: '3.5', eu: '36', cm: '22.5' },
        { us: '4.5', uk: '4', eu: '36.5', cm: '23' },
        { us: '5', uk: '4.5', eu: '37.5', cm: '23.5' },
        { us: '5.5', uk: '5', eu: '38', cm: '24' },
        { us: '6', uk: '5.5', eu: '38.5', cm: '24' },
        { us: '6.5', uk: '6', eu: '39', cm: '24.5' },
        { us: '7', uk: '6', eu: '40', cm: '25' },
        { us: '7.5', uk: '6.5', eu: '40.5', cm: '25.5' },
        { us: '8', uk: '7', eu: '41', cm: '26' },
        { us: '8.5', uk: '7.5', eu: '42', cm: '26.5' },
        { us: '9', uk: '8', eu: '42.5', cm: '27' },
        { us: '9.5', uk: '8.5', eu: '43', cm: '27.5' },
        { us: '10', uk: '9', eu: '44', cm: '28' },
        { us: '10.5', uk: '9.5', eu: '44.5', cm: '28.5' },
        { us: '11', uk: '10', eu: '45', cm: '29' },
        { us: '11.5', uk: '10.5', eu: '45.5', cm: '29.5' },
        { us: '12', uk: '11', eu: '46', cm: '30' },
        { us: '12.5', uk: '11.5', eu: '47', cm: '30.5' },
        { us: '13', uk: '12', eu: '47.5', cm: '31' },
        { us: '14', uk: '13', eu: '48.5', cm: '32' },
        { us: '15', uk: '14', eu: '49.5', cm: '33' },
    ],
};

export function SizeChart({ brand = 'nike' }: { brand?: string }) {
    const sizeData = SIZE_CHART[brand as keyof typeof SIZE_CHART] || SIZE_CHART.nike;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                    <Ruler className="h-3 w-3 mr-1" />
                    Size Guide
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>Sneaker Size Conversion Chart</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Tip:</strong> Sizes may vary slightly between brands and models. When in doubt, measure your foot in centimeters and use the CM column.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-800">
                                    <th className="border border-slate-300 dark:border-slate-600 p-2 text-left font-semibold">US</th>
                                    <th className="border border-slate-300 dark:border-slate-600 p-2 text-left font-semibold">UK</th>
                                    <th className="border border-slate-300 dark:border-slate-600 p-2 text-left font-semibold">EU</th>
                                    <th className="border border-slate-300 dark:border-slate-600 p-2 text-left font-semibold">CM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizeData.map((size, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <td className="border border-slate-300 dark:border-slate-600 p-2">{size.us}</td>
                                        <td className="border border-slate-300 dark:border-slate-600 p-2">{size.uk}</td>
                                        <td className="border border-slate-300 dark:border-slate-600 p-2">{size.eu}</td>
                                        <td className="border border-slate-300 dark:border-slate-600 p-2 font-medium">{size.cm}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 text-xs text-muted-foreground space-y-1">
                        <p>• <strong>Nike/Jordan:</strong> Usually true to size</p>
                        <p>• <strong>Adidas/Yeezy:</strong> Often runs small - consider going half size up</p>
                        <p>• <strong>New Balance:</strong> Generally true to size, wide foot friendly</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
