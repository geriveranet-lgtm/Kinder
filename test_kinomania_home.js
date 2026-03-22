import https from 'https';
import * as cheerio from 'cheerio';

https.get('https://www.kinomania.ru/', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const $ = cheerio.load(data);
    const movies = [];
    
    $('img').each((i, el) => {
      const src = $(el).attr('data-src') || $(el).attr('src');
      const title = $(el).attr('alt') || $(el).attr('title');
      
      if (src && title && src.includes('/film_gallery/')) {
        movies.push({
          title: title.trim(),
          posterUrl: src,
        });
      }
    });
    console.log(JSON.stringify(movies.slice(0, 10), null, 2));
  });
}).on('error', (e) => {
  console.error(e);
});
