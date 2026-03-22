import https from 'https';
import * as cheerio from 'cheerio';

https.get('https://www.kinomania.ru/top/films', (res) => {
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
          description: "Описание фильма " + title.trim(),
          rating: Number((Math.random() * (9.5 - 7.0) + 7.0).toFixed(1)),
          totalVotes: Math.floor(Math.random() * 100) + 1,
          battleWins: 0,
          battleLosses: 0,
          swipeLikes: 0,
          swipeDislikes: 0,
          genre: "Кино",
          releaseYear: 2000 + Math.floor(Math.random() * 24)
        });
      }
    });
    console.log(JSON.stringify(movies.slice(0, 6), null, 2));
  });
}).on('error', (e) => {
  console.error(e);
});
