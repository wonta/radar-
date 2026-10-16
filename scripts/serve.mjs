import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain'};
const headers=JSON.parse(fs.readFileSync('vercel.json','utf8')).headers[0].headers;
http.createServer((req,res)=>{
  headers.forEach(({key,value})=>res.setHeader(key,value));
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  const file=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.writeHead(200);if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('radar test server ready'));