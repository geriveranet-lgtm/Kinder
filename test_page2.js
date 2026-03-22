import * as cheerio from 'cheerio';
import https from 'https';

const url = 'https://www.kinomania.ru/top/films?page=2';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const $ = cheerio.load(data);
    const movies = [];
    $('.movie-list__item').each((i, el) => {
      const title = $(el).find('.movie-list__title').text().trim();
      const posterUrl = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
      if (title && posterUrl) {
        movies.push({ title, posterUrl });
      }
    });
    console.log(JSON.stringify(movies.slice(0, 6), null, 2));
  });
});
