export type PromptEntry={id:string;title:string;location:string;source:string;maxLength:number;text:string};
export function serializePrompts(entries:PromptEntry[]){
 return ['# LucidScore · 启发文本编辑稿','','只修改每条「### 提示」下面的一行文字。可以写观察、聆听建议或问句，无需以问号结尾。','','请保留编号、标题、位置、来源及全部条目；正文用纯文字，不加 Markdown 格式。五乐章导读提示每条最多90字；已核验、演示及核对草稿提示最多50字。','','修改后保存此文件，交给我导入。当前网页仍保留原文，保存本稿不会自动更新网页。','',...entries.flatMap(e=>[`## ${e.id} | ${e.title}`,`位置: ${e.location}`,`来源: ${e.source}`,'','### 提示','',e.text,''])].join('\n');
}
export function parsePromptEdits(markdown:string,reference:PromptEntry[]){
 const normalized=markdown.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 const chunks=normalized.split(/^## /m).slice(1),expected=new Map(reference.map(e=>[e.id,e])),edits=new Map<string,string>();
 for(const chunk of chunks){
  const match=/^([^\n]+) \| ([^\n]+)\n位置: ([^\n]+)\n来源: ([^\n]+)\n\s*### 提示\n([\s\S]*)$/.exec(chunk);
  if(!match)throw Error('条目格式无效，请保留编号、位置、来源及 ### 提示');
  const [,id,title,location,source,body]=match,entry=expected.get(id),text=body.trim();
  if(!entry||edits.has(id))throw Error(`未知或重复的提示编号：${id}`);
  if(title!==entry.title||location!==entry.location||source!==entry.source)throw Error(`${id}：请仅修改提示正文，保留原有对应关系`);
  if(!text||text.length>entry.maxLength||/[\r\n<>\[\]*#]/.test(text))throw Error(`${id}：提示必须是一行纯文字，1—${entry.maxLength}字`);
  edits.set(id,text);
 }
 if(edits.size!==expected.size)throw Error(`提示条目不完整：需要 ${expected.size} 条，实际 ${edits.size} 条`);
 return edits;
}
