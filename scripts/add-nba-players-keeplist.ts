import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
function initializeAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!.firestore();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const config = { projectId, storageBucket };

    const saPath = path.resolve(process.cwd(), 'studio-8322868971-8ca89-firebase-adminsdk-fbsvc-b2a4041fbd.json');
    if (fs.existsSync(saPath)) {
        console.log('✅ Using local service account file');
        admin.initializeApp({ ...config, credential: admin.credential.cert(require(saPath)) });
    } else {
        console.log('✅ Using application default credentials');
        admin.initializeApp({ ...config, credential: admin.credential.applicationDefault() });
    }

    return admin.firestore();
}

const db = initializeAdmin();

// COMBINED LIST: Original 100 + New additions from second list
const allNBAPlayers = [
    // Original Top 100
    "Nikola Jokic", "Shai Gilgeous-Alexander", "Luka Doncic", "Giannis Antetokounmpo",
    "Victor Wembanyama", "Anthony Edwards", "Stephen Curry", "Donovan Mitchell",
    "Cade Cunningham", "Kawhi Leonard", "Jalen Brunson", "Jaylen Brown",
    "Kevin Durant", "Tyrese Maxey", "Devin Booker", "Jamal Murray",
    "Deni Avdija", "Alperen Sengun", "Chet Holmgren", "Jalen Johnson",
    "LeBron James", "Evan Mobley", "Scottie Barnes", "James Harden",
    "Jalen Williams", "Pascal Siakam", "Karl-Anthony Towns", "Lauri Markkanen",
    "Bam Adebayo", "Anthony Davis", "Jalen Duren", "Joel Embiid",
    "Franz Wagner", "Julius Randle", "De'Aaron Fox", "Paolo Banchero",
    "Austin Reaves", "Derrick White", "Rudy Gobert", "Aaron Gordon",
    "Amen Thompson", "OG Anunoby", "Jaren Jackson Jr.", "Norm Powell",
    "LaMelo Ball", "Domantas Sabonis", "Michael Porter Jr.", "Stephon Castle",
    "Trey Murphy III", "Ivica Zubac", "Brandon Ingram", "Desmond Bane",
    "Jaden McDaniels", "Mikal Bridges", "Keyonte George", "Kon Knueppel",
    "Trae Young", "Cooper Flagg", "Zion Williamson", "Darius Garland",
    "Josh Giddey", "Jalen Suggs", "Tyler Herro", "Jrue Holiday",
    "Dillon Brooks", "Ja Morant", "Isaiah Hartenstein", "Andrew Nembhard",
    "Jarrett Allen", "Naz Reid", "Peyton Watson", "Alex Caruso",
    "Draymond Green", "Nickeil Alexander-Walker", "Ausar Thompson", "RJ Barrett",
    "Coby White", "Ajay Mitchell", "Zach LaVine", "Josh Hart",
    "Alex Sarr", "Brandon Miller", "Dyson Daniels", "DeMar DeRozan",
    "Lu Dort", "Payton Pritchard", "Anthony Black", "Onyeka Okongwu",
    "Jaime Jaquez Jr.", "Reed Sheppard", "Paul George", "Tari Eason",
    "Cason Wallace", "Devin Vassell", "Isaiah Stewart", "Toumani Camara",
    "Cam Johnson", "Immanuel Quickley", "Shaedon Sharpe", "VJ Edgecombe",

    // Additional players from second list
    "Jaden Ivey", "Scoot Henderson", "Collin Sexton", "Jordan Hawkins",
    "Aaron Nesmith", "Cam Whitmore", "Donte DiVincenzo", "Gradey Dick",
    "Santi Aldama", "Matas Buzelis", "Jordan Poole", "GG Jackson",
    "Jimmy Butler", "Anfernee Simons", "Jalen Green", "P.J. Washington",
    "Jonathan Kuminga", "Nikola Vucevic", "Donovan Clingan", "Rob Dillingham",
    "Mark Williams", "Jeremy Sochan", "Bennedict Mathurin", "Dejounte Murray",
    "Jaylen Wells", "Herb Jones", "Jared McCain", "Walker Kessler",
    "Jabari Smith Jr.", "De'Andre Hunter", "Kristaps Porzingis", "Damian Lillard",
    "Bilal Coulibaly", "Yves Missi", "Kel'el Ware", "Zaccharie Risacher",
    "Dereck Lively II", "Kyrie Irving", "Tyrese Haliburton", "Jayson Tatum",

    // User Requested Additions (Feb 2 2026)
    "Sam Merrill", "Grayson Allen", "Collin Gillespie", "Klay Thompson",
    "Miles McBride", "AJ Green", "Tim Hardaway Jr.", "Duncan Robinson",
    "Norman Powell", "Royce O'Neale", "Sam Hauser", "CJ McCollum",
    "Max Christie", "Julian Champagnie", "Egor Demin", "Moses Moody",

    // User Requested Additions (Set 2 - Feb 2 2026)
    "Davion Mitchell", "Isaiah Collier", "Russell Westbrook", "Tre Jones",
    "Cam Spencer", "Ryan Rollins", "Jamal Shead", "Dennis Schroder",
    "Kyshawn George", "Ryan Nembhard", "Jimmy Butler III", "Jusuf Nurkic",
    "T.J. McConnell", "Bub Carrington", "Vince Williams Jr.", "Derik Queen"
];

async function addNBAPlayersToKeepList() {
    console.log(`\n🏀 Adding ${allNBAPlayers.length} NBA players to keep list...\n`);

    let added = 0;
    let alreadyExists = 0;
    const errors: string[] = [];

    for (const playerName of allNBAPlayers) {
        try {
            const existingQuery = await db.collection('keepList')
                .where('name', '==', playerName)
                .limit(1)
                .get();

            if (!existingQuery.empty) {
                console.log(`⏭️  ${playerName} - already in keep list`);
                alreadyExists++;
                continue;
            }

            await db.collection('keepList').add({
                name: playerName,
                category: 'NBA',
                sport: 'Basketball',
                addedAt: new Date().toISOString(),
                source: 'nba_comprehensive_2025'
            });

            console.log(`✅ ${playerName} - added to keep list`);
            added++;

        } catch (error: any) {
            console.error(`❌ Error adding ${playerName}:`, error.message);
            errors.push(playerName);
        }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Added: ${added}`);
    console.log(`   ⏭️  Already existed: ${alreadyExists}`);
    console.log(`   ❌ Errors: ${errors.length}`);
    console.log(`   📝 Total processed: ${allNBAPlayers.length}`);

    if (errors.length > 0) {
        console.log('\n⚠️  Failed players:', errors.join(', '));
    }
}

addNBAPlayersToKeepList()
    .then(() => {
        console.log('\n✅ NBA players keep list update complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
