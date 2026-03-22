import https from 'https';

https.get('https://www.kinomania.ru/a-z/movies', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data.substring(0, 2000));
  });
});
