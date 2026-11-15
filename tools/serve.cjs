// Optional local QA server for hosts without Python; no runtime dependency of dist/.
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml'};
function createServer(){return http.createServer(async(req,res)=>{
 try {
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{'Allow':'GET, HEAD'});return res.end();}
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname);
  const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  const stat=await fs.stat(file);
  if(stat.isDirectory()){res.writeHead(301,{'Location':url.pathname+'/'});return res.end();}
  const data=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(req.method==='HEAD'?undefined:data);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('Não encontrado.');}
});}
if(require.main===module){const server=createServer();server.listen(Number(process.argv[2])||8080,'127.0.0.1',()=>console.log('Nexus: http://127.0.0.1:'+server.address().port));}
module.exports={createServer};
