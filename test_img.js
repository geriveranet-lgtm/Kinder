import https from 'https';

https.get('https://image.tmdb.org/t/p/w500/598888.jpg', (res) => {
  console.log(res.statusCode);
});
