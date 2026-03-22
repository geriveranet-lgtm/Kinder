import https from 'https';

const searchWikipediaImage = (title) => {
  return new Promise((resolve) => {
    const url = `https://ru.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = json.query.pages;
          const pageId = Object.keys(pages)[0];
          if (pageId !== '-1' && pages[pageId].original) {
            resolve({ title, url: pages[pageId].original.source });
          } else {
            resolve({ title, url: null });
          }
        } catch (e) {
          resolve({ title, url: null });
        }
      });
    }).on('error', () => resolve({ title, url: null }));
  });
};

async function run() {
  const titles = [
    "Носферату (фильм, 2024)",
    "Миссия невыполнима: Финальная расплата",
    "28 лет спустя",
    "Супермен (фильм, 2025)",
    "Микки 17",
    "Громовержцы (фильм)"
  ];
  for (const title of titles) {
    const res = await searchWikipediaImage(title);
    console.log(res);
  }
}
run();
