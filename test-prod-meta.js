const cheerio = require('cheerio');

async function testProdMetadata() {
  try {
    const url = 'https://benched.au/shoes/under-armour-curry-3zero-ii-grey-orange/5xnYKLAyTCFw8RDp3iqH';
    console.log(`Fetching ${url}...`);
    
    // Add a random query parameter to bust any edge cache
    const res = await fetch(`${url}?nocache=${Date.now()}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log('--- META TAGS IN PROD DOM ---');
    $('meta').each((i, el) => {
      const prop = $(el).attr('property') || $(el).attr('name');
      const content = $(el).attr('content');
      if (prop && prop.includes('og:')) {
        console.log(`${prop} = ${content}`);
        
        // Check for alt
        const alt = $(el).attr('alt');
        if (alt) console.log(`${prop} (alt) = ${alt}`);
      }
      if (prop === 'title' || $(el).prop('tagName') === 'title') {
         console.log(`title = ${content} or ${$(el).text()}`);
      }
    });
    
    console.log('--- TITLE TAG ---');
    console.log($('title').text());

  } catch (err) {
    console.error(err);
  }
}

testProdMetadata();
