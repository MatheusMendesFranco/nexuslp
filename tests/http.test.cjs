const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createServer}=require('../tools/serve.cjs');
test('HTTP serves all 4 routes and every referenced asset from dist root',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const assets=new Set();
  for(const route of ['/','/linha-de-frente/','/balcao-digital/','/privacidade/']){
   const response=await fetch(base+route);assert.equal(response.status,200,route);assert.match(response.headers.get('content-type'),/text\/html/);const html=await response.text();
   for(const m of html.matchAll(/(?:src|href)="(\/(?:js|css|fonts)\/[^"#]+)"/g))assets.add(m[1]);
  }
  for(const asset of assets){const response=await fetch(base+asset);assert.equal(response.status,200,asset);assert.ok((await response.arrayBuffer()).byteLength>0);}
  assert.equal((await fetch(base+'/inexistente/')).status,404);
  assert.equal((await fetch(base+'/linha-de-frente',{redirect:'manual'})).status,301);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
