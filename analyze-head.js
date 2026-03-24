async function analyzeRawHtml() {
  const url = 'https://benched.au/shoes/nike-lebron-22-monopoly/s4PBdJTdQKxogInTa19Z';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1' }
  });
  const html = await res.text();
  
  console.log('--- FIRST 5000 BYTES OF HTML ---');
  console.log(html.substring(0, 5000));
}

analyzeRawHtml();
