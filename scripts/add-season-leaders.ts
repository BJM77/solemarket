/**
 * Script to add NBA Season Leaders to the keep list
 * Run with: npx tsx scripts/add-season-leaders.ts
 */

export {};

const seasonLeaders = [
    // Points Leaders
    { name: 'Luka Dončić', sport: 'Basketball' as const },
    { name: 'Shai Gilgeous-Alexander', sport: 'Basketball' as const },
    { name: 'Anthony Edwards', sport: 'Basketball' as const },
    { name: 'Jaylen Brown', sport: 'Basketball' as const },
    { name: 'Tyrese Maxey', sport: 'Basketball' as const },

    // Rebounds Leaders
    { name: 'Karl-Anthony Towns', sport: 'Basketball' as const },
    { name: 'Rudy Gobert', sport: 'Basketball' as const },
    { name: 'Victor Wembanyama', sport: 'Basketball' as const },
    { name: 'Donovan Clingan', sport: 'Basketball' as const },
    { name: 'Ivica Zubac', sport: 'Basketball' as const },

    // Assists Leaders
    { name: 'Cade Cunningham', sport: 'Basketball' as const },
    { name: 'James Harden', sport: 'Basketball' as const },
    { name: 'Jalen Johnson', sport: 'Basketball' as const },
    { name: 'LaMelo Ball', sport: 'Basketball' as const },

    // Blocks Leaders
    { name: 'Alex Sarr', sport: 'Basketball' as const },
    { name: 'Chet Holmgren', sport: 'Basketball' as const },
    { name: 'Jay Huff', sport: 'Basketball' as const },
    { name: 'Evan Mobley', sport: 'Basketball' as const },

    // Steals Leaders
    { name: 'Kawhi Leonard', sport: 'Basketball' as const },
    { name: 'Cason Wallace', sport: 'Basketball' as const },
    { name: 'Dyson Daniels', sport: 'Basketball' as const },
    { name: 'Ausar Thompson', sport: 'Basketball' as const },

    // FG% Leaders
    { name: 'Deandre Ayton', sport: 'Basketball' as const },
    { name: 'Mark Williams', sport: 'Basketball' as const },
    { name: 'Giannis Antetokounmpo', sport: 'Basketball' as const },
    { name: 'Neemias Queta', sport: 'Basketball' as const },

    // 3PT Made Leaders
    { name: 'Stephen Curry', sport: 'Basketball' as const },
    { name: 'Donovan Mitchell', sport: 'Basketball' as const },
    { name: 'Kon Knueppel', sport: 'Basketball' as const },
    { name: 'Donte DiVincenzo', sport: 'Basketball' as const },

    // 3PT% Leaders
    { name: 'Luke Kennard', sport: 'Basketball' as const },
    { name: 'Tari Eason', sport: 'Basketball' as const },
    { name: 'Jaylon Tyson', sport: 'Basketball' as const },
    { name: 'Cam Spencer', sport: 'Basketball' as const },
    { name: 'Bobby Portis', sport: 'Basketball' as const },

    // Advanced Stats
    { name: 'Ryan Kalkbrenner', sport: 'Basketball' as const },
    { name: 'Jaxson Hayes', sport: 'Basketball' as const },
    { name: 'Goga Bitadze', sport: 'Basketball' as const },
    { name: 'Luke Kornet', sport: 'Basketball' as const },
    { name: 'Andre Drummond', sport: 'Basketball' as const },
    { name: 'Moussa Diabaté', sport: 'Basketball' as const },
    { name: 'Luka Garza', sport: 'Basketball' as const },
    { name: 'Yves Missi', sport: 'Basketball' as const },

    // Miscellaneous
    { name: 'LeBron James', sport: 'Basketball' as const },
    { name: 'Anthony Davis', sport: 'Basketball' as const },
    { name: 'Nikola Jokić', sport: 'Basketball' as const },
    { name: 'Walker Kessler', sport: 'Basketball' as const },
    { name: 'Zion Williamson', sport: 'Basketball' as const },
    { name: 'Alperen Sengun', sport: 'Basketball' as const },
    { name: 'Jalen Duren', sport: 'Basketball' as const },

    // Tracking Stats
    { name: 'Jalen Brunson', sport: 'Basketball' as const },
    { name: 'Trae Young', sport: 'Basketball' as const },
    { name: 'De\'Aaron Fox', sport: 'Basketball' as const },
    { name: 'Franz Wagner', sport: 'Basketball' as const },
    { name: 'Obi Toppin', sport: 'Basketball' as const },
    { name: 'Payton Pritchard', sport: 'Basketball' as const },
    { name: 'Josh Hart', sport: 'Basketball' as const },
    { name: 'Guerschon Yabusele', sport: 'Basketball' as const },
    { name: 'Sandro Mamukelashvili', sport: 'Basketball' as const },
    { name: 'Jamal Murray', sport: 'Basketball' as const },
    { name: 'Michael Porter Jr.', sport: 'Basketball' as const },
    { name: 'Nickeil Alexander-Walker', sport: 'Basketball' as const },
    { name: 'Tim Hardaway Jr.', sport: 'Basketball' as const },
    { name: 'Andrew Nembhard', sport: 'Basketball' as const },
    { name: 'Mikal Bridges', sport: 'Basketball' as const },
    { name: 'Amen Thompson', sport: 'Basketball' as const },
    { name: 'Toumani Camara', sport: 'Basketball' as const },

    // Hustle Stats
    { name: 'Matisse Thybulle', sport: 'Basketball' as const },
    { name: 'Ryan Rollins', sport: 'Basketball' as const },
    { name: 'Kelly Oubre Jr.', sport: 'Basketball' as const },
    { name: 'VJ Edgecombe', sport: 'Basketball' as const },
    { name: 'Austin Reaves', sport: 'Basketball' as const },
    { name: 'Jusuf Nurkić', sport: 'Basketball' as const },
    { name: 'Domantas Sabonis', sport: 'Basketball' as const },
    { name: 'Jakob Poeltl', sport: 'Basketball' as const },

    // Clutch Stats
    { name: 'Deni Avdija', sport: 'Basketball' as const },
    { name: 'Jarrett Allen', sport: 'Basketball' as const },
    { name: 'Desmond Bane', sport: 'Basketball' as const },
    { name: 'Tobias Harris', sport: 'Basketball' as const },

    // Scoring Stats
    { name: 'Klay Thompson', sport: 'Basketball' as const },
    { name: 'Duncan Robinson', sport: 'Basketball' as const },
    { name: 'Collin Gillespie', sport: 'Basketball' as const },
    { name: 'Julian Champagnie', sport: 'Basketball' as const },
    { name: 'Brandon Ingram', sport: 'Basketball' as const },
    { name: 'Kevin Durant', sport: 'Basketball' as const },
    { name: 'Joel Embiid', sport: 'Basketball' as const },
    { name: 'DeMar DeRozan', sport: 'Basketball' as const },
    { name: 'Devin Carter', sport: 'Basketball' as const },
    { name: 'Mohamed Diawara', sport: 'Basketball' as const },
    { name: 'Eric Gordon', sport: 'Basketball' as const },
    { name: 'T.J. McConnell', sport: 'Basketball' as const },

    // Bio Stats
    { name: 'Naz Reid', sport: 'Basketball' as const },
    { name: 'Naji Marshall', sport: 'Basketball' as const },
    { name: 'Brandon Williams', sport: 'Basketball' as const },

    // Position-Specific
    { name: 'Julius Randle', sport: 'Basketball' as const },
    { name: 'Jaren Jackson Jr.', sport: 'Basketball' as const },
    { name: 'Bam Adebayo', sport: 'Basketball' as const },
    { name: 'Derik Queen', sport: 'Basketball' as const },
    { name: 'Nic Claxton', sport: 'Basketball' as const },
    { name: 'Paolo Banchero', sport: 'Basketball' as const },
    { name: 'Scottie Barnes', sport: 'Basketball' as const },

    // Rookies
    { name: 'Cooper Flagg', sport: 'Basketball' as const },
    { name: 'Cedric Coward', sport: 'Basketball' as const },
    { name: 'Jeremiah Fears', sport: 'Basketball' as const },
    { name: 'Maxime Raynaud', sport: 'Basketball' as const },

    // Additional
    { name: 'Norman Powell', sport: 'Basketball' as const },
    { name: 'Dillon Brooks', sport: 'Basketball' as const },
    { name: 'Jerami Grant', sport: 'Basketball' as const },
    { name: 'Devin Booker', sport: 'Basketball' as const },
];

async function addSeasonLeaders(uid: string) {
    try {
        const response = await fetch('http://localhost:9004/api/bulk-add-players', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                uid,
                players: seasonLeaders,
            }),
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ Successfully added Season Leaders!');
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
    console.error('❌ Usage: npx tsx scripts/add-season-leaders.ts <user-uid>');
    console.error('   Example: npx tsx scripts/add-season-leaders.ts O5nCLgbIaRRRF369K0kjgT59io73');
    process.exit(1);
}

console.log(`📝 Adding ${seasonLeaders.length} NBA Season Leaders to keep list for user: ${uid}`);
console.log('⚠️  Duplicates will be automatically filtered out');
addSeasonLeaders(uid);
