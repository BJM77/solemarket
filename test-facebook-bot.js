const cheerio = require('cheerio');

async function testFacebookBot() {
  try {
    const url = 'https://benched.au/shoes/under-armour-curry-3zero-ii-grey-orange/5xnYKLAyTCFw8RDp3iqH';
    console.log(`Fetching ${url} as facebookexternalhit...`);
    
    // Use the exact Facebook Scraper User-Agent
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': '*/*, text/html'
      },
      // Do not follow redirects so we can see if it redirects
      redirect: 'manual'
    });
    
    console.log(`Status Code: ${res.status}`);
    console.log(`Redirect Location: ${res.headers.get('location')}`);
    
    if (res.status === 200) {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      console.log('--- META TAGS SEEN BY FACEBOOK ---');
      $('meta').each((i, el) => {
        const prop = $(el).attr('property') || $(el).attr('name');
        const content = $(el).attr('content');
        if (prop && prop.includes('og:')) {
          console.log(`${prop} = ${content}`);
        }
      });
    }

  } catch (err) {
    console.error(err);
  }
}

testFacebookBot();
