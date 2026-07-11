import fs from 'fs';
async function test() {
    const file = fs.readFileSync('public/sc-test-card.jpg');
    const b64 = file.toString('base64');
    const uri = `data:image/jpeg;base64,${b64}`;
    
    const res = await fetch('http://localhost:9007/api/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test();
