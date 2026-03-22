import * as cheerio from 'cheerio';
import https from 'https';

const searchKinomania = (query) => {
  return new Promise((resolve) => {
    const url = `https://www.kinomania.ru/search?q=${encodeURIComponent(query)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const $ = cheerio.load(data);
        const firstResult = $('.search-item').first();
        if (firstResult.length) {
          const title = firstResult.find('.search-item__title a').text().trim();
          const posterUrl = firstResult.find('img').attr('data-src') || firstResult.find('img').attr('src');
          resolve({ query, title, posterUrl });
        } else {
          resolve({ query, title: null, posterUrl: null });
        }
      });
    }).on('error', () => resolve({ query, title: null, posterUrl: null }));
  });
};

async function run() {
  const queries = [
    "Носферату",
    "Миссия невыполнима",
    "28 лет спустя",
    "Супермен",
    "Микки 17",
    "Громовержцы"
  ];
  for (const q of queries) {
    const res = await searchKinomania(q);
    console.log(res);
  }
}
run();
