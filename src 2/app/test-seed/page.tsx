'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { seedTestProducts } from './actions';

export default function TestSeedPage() {
    const [status, setStatus] = useState('Idle');

    const handleSeed = async () => {
        setStatus('Seeding...');
        try {
            const result = await seedTestProducts();
            setStatus(result.success ? 'Success! Items created.' : 'Failed: ' + result.error);
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        }
    };

    return (
        <div className="p-10 flex flex-col items-center gap-4">
            <h1 className="text-2xl font-bold">Multibuy & Tier Test Seeder</h1>
            <p>Creates 4 items: Bronze ($4), Silver ($15), Gold ($40), Platinum ($100)</p>
            <Button onClick={handleSeed} disabled={status === 'Seeding...'}>
                {status === 'Seeding...' ? 'Creating...' : 'Create Test Items'}
            </Button>
            <p className="font-mono">{status}</p>
        </div>
    );
}
