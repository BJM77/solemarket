import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
function initializeAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!.firestore();
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'picksy-app';
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const config = { projectId, storageBucket };

    // 1. Try secrets_staging first (likely valid credentials)
    const secretsDir = path.resolve(process.cwd(), 'secrets_staging');
    if (fs.existsSync(secretsDir)) {
        try {
            const secretProjectId = fs.readFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_PROJECT_ID.txt'), 'utf8').trim();
            const clientEmail = fs.readFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_CLIENT_EMAIL.txt'), 'utf8').trim();
            const privateKey = fs.readFileSync(path.join(secretsDir, 'FIREBASE_ADMIN_PRIVATE_KEY.txt'), 'utf8').trim();

            console.log(`✅ Using credentials from secrets_staging for project: ${secretProjectId}`);
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: secretProjectId,
                    clientEmail,
                    privateKey
                }),
                storageBucket
            });
            return admin.firestore();
        } catch (e) {
            console.warn('⚠️  Failed to read secrets_staging, falling back to other methods:', e);
        }
    }

    // 2. Try service-account.json in root
    const saPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
        console.log(`✅ Using local service account file: ${path.basename(saPath)}`);
        try {
            const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            admin.initializeApp({ ...config, credential: admin.credential.cert(serviceAccount) });
            return admin.firestore();
        } catch (e) {
            console.error('Error parsing service account JSON:', e);
        }
    }

    // 3. Fallback to ADC
    console.log('✅ Using application default credentials');
    admin.initializeApp({ ...config, credential: admin.credential.applicationDefault() });

    return admin.firestore();
}

const db = initializeAdmin();

const nflPlayers = [
    "Saquon Barkley", "Lamar Jackson", "Josh Allen", "Ja'Marr Chase", "Patrick Mahomes",
    "Joe Burrow", "Derrick Henry", "Myles Garrett", "Justin Jefferson", "Patrick Surtain II",
    "T. J. Watt", "Chris Jones", "Penei Sewell", "Trey Hendrickson", "Jared Goff",
    "Fred Warner", "Dexter Lawrence", "Derek Stingley Jr.", "Jalen Hurts", "Amon-Ra St. Brown",
    "Jayden Daniels", "Maxx Crosby", "Lane Johnson", "Brock Bowers", "Danielle Hunter",
    "Zack Baun", "Jahmyr Gibbs", "Tristan Wirfs", "A. J. Brown", "Xavier McKinney",
    "George Kittle", "Nico Collins", "Josh Jacobs", "Budda Baker", "CeeDee Lamb",
    "Micah Parsons", "Travis Kelce", "Nik Bonitto", "C. J. Stroud", "Roquan Smith",
    "Puka Nacua", "Dion Dawkins", "Jalen Carter", "Mike Evans", "Trent Williams",
    "Will Anderson Jr.", "Tyreek Hill", "Jonathan Greenard", "Quinyon Mitchell", "Baker Mayfield",
    "Kyle Hamilton", "Terry McLaurin", "Jared Verse", "Derwin James", "Aidan Hutchinson",
    "Justin Herbert", "Nick Bosa", "Joe Mixon", "Matthew Stafford", "Cooper DeJean",
    "Brian Thomas Jr.", "Bijan Robinson", "Josh Hines-Allen", "Bo Nix", "Trey McBride",
    "Jalen Ramsey", "Malik Nabers", "Jordan Love", "Jordan Mailata", "Frankie Luvu",
    "Kerby Joseph", "Sam Darnold", "Christian McCaffrey", "Bobby Wagner", "Patrick Queen",
    "Vita Vea", "Tee Higgins", "Khalil Mack", "Dak Prescott", "Rashan Gary",
    "Trent McDuffie", "Jerry Jeudy", "Cameron Heyward", "Christian Gonzalez", "Kyren Williams",
    "Laremy Tunsil", "Quinnen Williams", "Andrew Van Ginkel", "James Cook", "Zach Allen",
    "Tua Tagovailoa", "Jessie Bates", "Creed Humphrey", "Sam LaPorta", "Josh Sweat",
    "Lavonte David", "Drake London", "Aaron Jones", "Leonard Williams", "Ladd McConkey"
];

async function addNFLPlayersToKeepList() {
    console.log(`\n🏈 Adding ${nflPlayers.length} NFL players to keep list...\n`);

    let added = 0;
    let alreadyExists = 0;
    const errors: string[] = [];

    for (const playerName of nflPlayers) {
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
                category: 'NFL',
                sport: 'Football',
                addedAt: new Date().toISOString(),
                source: 'nfl_top_100_2025'
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
    console.log(`   📝 Total processed: ${nflPlayers.length}`);

    if (errors.length > 0) {
        console.log('\n⚠️  Failed players:', errors.join(', '));
    }
}

addNFLPlayersToKeepList()
    .then(() => {
        console.log('\n✅ NFL players keep list update complete!\n');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
