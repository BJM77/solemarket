/**
 * Script to add NBA All-Star 2025 roster to the keep list
 * Run with: npx tsx scripts/add-allstar-roster.ts
 */

export {};

const allStarPlayers = [
    // Eastern Conference Starters
    { name: 'Giannis Antetokounmpo', sport: 'Basketball' as const },
    { name: 'Jaylen Brown', sport: 'Basketball' as const },
    { name: 'Jalen Brunson', sport: 'Basketball' as const },
    { name: 'Cade Cunningham', sport: 'Basketball' as const },
    { name: 'Tyrese Maxey', sport: 'Basketball' as const },

    // Eastern Conference Reserves
    { name: 'Scottie Barnes', sport: 'Basketball' as const },
    { name: 'Jalen Duren', sport: 'Basketball' as const },
    { name: 'Jalen Johnson', sport: 'Basketball' as const },
    { name: 'Donovan Mitchell', sport: 'Basketball' as const },
    { name: 'Norman Powell', sport: 'Basketball' as const },
    { name: 'Pascal Siakam', sport: 'Basketball' as const },
    { name: 'Karl-Anthony Towns', sport: 'Basketball' as const },

    // Western Conference Starters
    { name: 'Stephen Curry', sport: 'Basketball' as const },
    { name: 'Luka Dončić', sport: 'Basketball' as const },
    { name: 'Shai Gilgeous-Alexander', sport: 'Basketball' as const },
    { name: 'Nikola Jokić', sport: 'Basketball' as const },
    { name: 'Victor Wembanyama', sport: 'Basketball' as const },

    // Western Conference Reserves
    { name: 'Deni Avdija', sport: 'Basketball' as const },
    { name: 'Devin Booker', sport: 'Basketball' as const },
    { name: 'Kevin Durant', sport: 'Basketball' as const },
    { name: 'Anthony Edwards', sport: 'Basketball' as const },
    { name: 'Chet Holmgren', sport: 'Basketball' as const },
    { name: 'LeBron James', sport: 'Basketball' as const },
    { name: 'Jamal Murray', sport: 'Basketball' as const },
];

async function addAllStarRoster(uid: string) {
    try {
        const response = await fetch('http://localhost:9004/api/bulk-add-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uid,
                players: allStarPlayers,
            }),
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Successfully added All-Star roster!');
            console.log(`📊 Total players in keep list: ${result.totalPlayers}`);
        } else {
            console.error('❌ Failed to add players:', result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Get UID from command line argument
const uid = process.argv[2];

if (!uid) {
    console.error('❌ Usage: npx tsx scripts/add-allstar-roster.ts <user-uid>');
    console.error('   Example: npx tsx scripts/add-allstar-roster.ts O5nCLgbIaRRRF369K0kjgT59io73');
    process.exit(1);
}

console.log(`📝 Adding 24 NBA All-Star players to keep list for user: ${uid}`);
addAllStarRoster(uid);
