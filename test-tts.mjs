import http from 'http';

const url = 'http://localhost:3000/api/tts?q=' + encodeURIComponent('Xin chào');

const req = http.get(url, (res) => {
  const chunks = [];
  res.on('data', c => chunks.push(c));
  res.on('end', () => {
    console.log('HTTP Status:', res.statusCode);
    console.log('Content-Type:', res.headers['content-type']);
    console.log('Audio size:', Buffer.concat(chunks).length, 'bytes');
    if (res.statusCode !== 200) {
      console.log('Body:', Buffer.concat(chunks).toString());
    }
  });
});
req.on('error', e => console.log('ERROR:', e.message));
req.setTimeout(10000, () => { console.log('TIMEOUT - dev server có đang chạy không?'); req.destroy(); });
