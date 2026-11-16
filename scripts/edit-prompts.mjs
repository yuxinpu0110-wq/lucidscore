import {readFile,writeFile,access} from 'node:fs/promises';
import {authorGuideFiles} from '../src/authorFiles.ts';
import {parseGuideMarkdown} from '../src/guideMarkdown.ts';
import {validateGuideDocument} from '../src/guideContent.ts';
import {serializePrompts,parsePromptEdits} from '../src/promptDocument.ts';
const target='content/INSPIRATION_PROMPTS.md',entries=[],sources=new Map();
for(const [movement,name]of Object.entries(authorGuideFiles)){
 const path='content/listen_guide/'+name,raw=await readFile(path,'utf8'),data=validateGuideDocument(parseGuideMarkdown(raw));
 sources.set(path,{raw,data});
 for(const g of data.guides)entries.push({id:'guide:'+g.id,title:g.title,location:`第 ${movement} 乐章 · 第 ${g.from}—${g.to} 小节`,source:path,maxLength:90,text:g.prompt});
}
for(const [kind,path]of [['real','content/real/catalog.json'],['demo','content/demo/catalog.json'],['draft','content/real/alignment-drafts.json']]){
 const raw=await readFile(path,'utf8'),data=JSON.parse(raw);sources.set(path,{raw,data,kind});
 for(const c of kind==='draft'?data.events:data.cues){
  const e=kind==='draft'?c:data.events.find(e=>e.id===c.event);
  entries.push({id:kind+':'+c.id,title:e.title,location:`${kind==='demo'?'交互演示':kind==='draft'?'核对草稿':'已核验片段'} · 第 ${e.movement||data.movement} 乐章 · ${c.start}—${c.end} 秒（原分轨）`,source:path,maxLength:50,text:kind==='draft'?c.guide:c.text});
 }
}
const mode=process.argv[2]||'--export';
if(mode==='--export'){
 try{await access(target);throw Error(`${target} 已存在；为保护编辑稿，导出不会覆盖。`)}catch(error){if(error.code!=='ENOENT')throw error}
 await writeFile(target,serializePrompts(entries));console.log(`已导出 ${entries.length} 条提示：${target}`);
}else if(mode==='--check'||mode==='--apply'){
 const edits=parsePromptEdits(await readFile(target,'utf8'),entries),writes=[];
 for(const [path,source]of sources){
  let next=source.raw;
  if(!source.kind){
   next=source.raw.split(/(?=^## )/m).map(block=>{
    const id=/^## ([\w-]+) \|/.exec(block)?.[1];if(!id)return block;
    const old=source.data.guides.find(g=>g.id===id),edited=edits.get('guide:'+id);
    if(edited===old.prompt)return block;
    return block.replace(/(^### 提示[^\S\r\n]*\r?\n)([\s\S]*?)(?=^### |$(?![\s\S]))/m,(_all,header,body)=>header+body.replace(old.prompt,()=>edited));
   }).join('');
   const parsed=validateGuideDocument(parseGuideMarkdown(next));
   if(parsed.guides.some(g=>g.prompt!==edits.get('guide:'+g.id)))throw Error(`提示替换失败：${path}`);
  }else{
   const data=structuredClone(source.data);
   for(const c of source.kind==='draft'?data.events:data.cues)c[source.kind==='draft'?'guide':'text']=edits.get(source.kind+':'+c.id);
   if(JSON.stringify(data)!==JSON.stringify(source.data))next=JSON.stringify(data,null,2)+'\n';
  }
  if(next!==source.raw)writes.push([path,next]);
 }
 console.log(`校验通过：${entries.length} 条提示，${writes.length} 个源文件有修改。`);
 if(mode==='--apply'){for(const [path,text]of writes)await writeFile(path,text);console.log('已导入提示。运行 npm run build 后更新成品网页。')}
}else throw Error('使用 --export、--check 或 --apply');
