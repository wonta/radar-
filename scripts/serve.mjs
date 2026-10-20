import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.txt':'text/plain'};
const headers={
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'"
};
http.createServer((req,res)=>{
  for(const [name,value] of Object.entries(headers))res.setHeader(name,value);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  const localPath=decoded.startsWith('/radar-/')?decoded.slice('/radar-'.length):decoded;
  const requested=localPath.endsWith('/')?localPath+'index.html':localPath;
  let file=path.resolve(root,'.'+requested);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()) {
    file=path.join(root,'404.html');
    if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}
    res.statusCode=404;
  } else res.statusCode=200;
  res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('radar static test server ready'));
