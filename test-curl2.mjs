import fs from 'fs';
async function test(filename) {
    const file = fs.readFileSync(filename);
    const b64 = file.toString('base64');
    const ext = filename.split('.').pop();
    const uri = `data:image/${ext === 'png' ? 'png' : 'jpeg'};base64,${b64}`;
    
    console.log(`\n--- Testing ${filename} ---`);
    const res = await fetch('http://localhost:9007/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
async function run() {
    await test('public/sc-test-card.jpg');
    await test('public/real_cards_test.jpg');
    await test('public/shoe.png');
}
run();
