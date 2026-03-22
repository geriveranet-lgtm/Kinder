import https from 'https';
import * as cheerio from 'cheerio';

const getWikiImage = (title) => {
  return new Promise((resolve) => {
    const url = `https://ru.wikipedia.org/wiki/${encodeURIComponent(title)}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const $ = cheerio.load(data);
        const img = $('.infobox img').first().attr('src');
        if (img) {
          resolve({ title, url: 'https:' + img });
        } else {
          resolve({ title, url: null });
        }
      });
    }).on('error', () => resolve({ title, url: null }));
  });
};

async function run() {
  const titles = [
    "Носферату_(фильм,_2024)",
    "Миссия_невыполнима:_Финальная_расплата",
    "28_лет_спустя",
    "Супермен_(фильм,_2025)",
    "Микки_17",
    "Громовержцы_(фильм)"
  ];
  for (const title of titles) {
    const res = await getWikiImage(title);
    console.log(res);
  }
}
run();
