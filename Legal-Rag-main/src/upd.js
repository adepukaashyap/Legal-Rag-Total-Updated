const http = require('http');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');

const port = 3000, hostname = '127.0.0.1';
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello, World!\n');
});
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

console.log('OS Type:', os.type());
console.log('OS Platform:', os.platform());
console.log('OS Architecture:', os.arch());
console.log('CPU Cores:', os.cpus().length);
console.log('Current Working Directory:', process.cwd());
console.log('Joined Path:', path.join(__dirname, 'public', 'images'));

const emitter = new EventEmitter();
emitter.on('customEvent', d => console.log('Custom Event Triggered:', d));
emitter.emit('customEvent', { message: 'Hello from custom event!' });