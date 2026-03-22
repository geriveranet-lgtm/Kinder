import https from 'https';
import * as cheerio from 'cheerio';

https.get('https://www.kinomania.ru/a-z/movies', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const $ = cheerio.load(data);
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('page')) {
        links.push(href);
      }
    });
    console.log(links);
  });
}).on('error', (e) => {
  console.error(e);
});
