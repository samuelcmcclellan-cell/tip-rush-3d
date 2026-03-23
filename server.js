const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const root = __dirname;
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
http.createServer((req, res) => {
    let f = req.url === '/' ? '/index.html' : req.url;
    let fp = path.join(root, f);
    fs.readFile(fp, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        let ext = path.extname(fp);
        res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
        res.end(data);
    });
}).listen(port, () => console.log('Server running on port ' + port));
