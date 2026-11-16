const fs=require('node:fs');
const path=require('node:path');
function files(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(directory,entry.name)):/\.(?:html|css|js)$/.test(entry.name)?[path.join(directory,entry.name)]:[]);}
// Keep strings, template strings and URLs intact; ignore comments, never source strings.
function withoutComments(text,extension){
 if(extension==='.html')return text.replace(/<!--[\s\S]*?-->/g,'');
 let out='',quote='';
 for(let i=0;i<text.length;i++){
  const char=text[i],next=text[i+1];
  if(quote){out+=char;if(char==='\\'&&next){out+=next;i++;}else if(char===quote)quote='';continue;}
  if(char==='"'||char==="'"||char==='`'){quote=char;out+=char;continue;}
  if(char==='/'&&next==='*'){const end=text.indexOf('*/',i+2);i=end<0?text.length:end+1;out+=' ';continue;}
  if(extension==='.js'&&char==='/'&&next==='/'){const end=text.indexOf('\n',i+2);i=end<0?text.length:end-1;continue;}
  out+=char;
 }
 return out;
}
module.exports={files,withoutComments};
