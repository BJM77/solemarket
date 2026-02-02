import { NextResponse } from 'next/server';
import { bulkAddPlayersToKeepList } from '@/app/actions/research';
import type { Player } from '@/lib/research-types';

export async function POST(request: Request) {
    try {
        const { uid, players } = await request.json();

        if (!uid || !players || !Array.isArray(players)) {
            return NextResponse.json(
                { error: 'Missing uid or players array' },
                { status: 400 }
            );
        }

        const result = await bulkAddPlayersToKeepList(uid, players);

        return NextResponse.json({
            success: true,
            totalPlayers: result.length,
            message: `Successfully processed ${players.length} players`,
        });
    } catch (error) {
        console.error('Bulk add error:', error);
        return NextResponse.json(
            { error: 'Failed to add players', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
