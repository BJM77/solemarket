
const cheerio = require('cheerio');

async function testMetadata() {
  try {
    const res = await fetch('http://localhost:9007/shoes/jordan-aerospace-720-white-vast-grey/xMbOwQjgLCjyJcWNQDgs');
    const html = await res.text();
    const $ = cheerio.load(html);
    
    console.log('--- META TAGS IN DOM ---');
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

testMetadata();
