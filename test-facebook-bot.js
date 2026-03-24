const cheerio = require('cheerio');

async function testFacebookBotHead() {
  try {
    const url = 'https://benched.au/shoes/nike-lebron-22-monopoly/s4PBdJTdQKxogInTa19Z';
    console.log(`Fetching HEAD of ${url} as facebookexternalhit...`);
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': '*/*, text/html'
      }
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log('--- RAW HEAD TAGS ---');
    $('head meta').each((i, el) => {
      const prop = $(el).attr('property') || $(el).attr('name');
      const content = $(el).attr('content');
      if (prop && (prop.includes('og:') || prop.includes('twitter:'))) {
        console.log(`<meta property="${prop}" content="${content}">`);
      }
    });

  } catch (err) {
    console.error(err);
  }
}

testFacebookBotHead();
