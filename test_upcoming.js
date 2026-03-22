import https from 'https';

const url = 'https://www.kinomania.ru/film/releases/russia';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.substring(0, 2000));
  });
});
