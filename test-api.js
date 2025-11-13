const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('Got response:', res.statusCode);
  process.exit(0);
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.end();

setTimeout(() => {
  console.error('Timeout waiting for response');
  process.exit(1);
}, 5000);

