import {readdir,stat,readFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const root=resolve('dist');let total=0,count=0;
async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,entry.name),name=relative(root,file).replaceAll('\\','/');if(entry.isDirectory()){await scan(file)}else{const size=(await stat(file)).size;if(size>=24000000)throw Error(`Oversized static asset: ${name}`);if(/^videos\/intro-.*\.mp4$/.test(name)&&size>=6000000)throw Error(`Video over 6MB: ${name}`);total+=size;count++}}}
await scan(root);const html=await readFile(resolve(root,'index.html'),'utf8');for(const text of ['LucidScore','og:title','og:description','og:url','https://lucidscore.org'])if(!html.includes(text))throw Error('Missing metadata: '+text);
console.log(`PASS Pages build: ${count} files, ${(total/1048576).toFixed(1)} MiB, every file <24MB, prologue clips <6MB, social metadata present`);
