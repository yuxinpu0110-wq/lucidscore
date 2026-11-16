import {describe,it,expect} from 'vitest';
import doc from '../content/INSPIRATION_PROMPTS.md?raw';
import {serializePrompts,parsePromptEdits,type PromptEntry} from '../src/promptDocument';
import {authorGuideLibrary} from '../src/guideLibrary';
const entries:PromptEntry[]=[{id:'guide:example',title:'示例',location:'第 1 乐章 · 第 1—5 小节',source:'example.md',maxLength:90,text:'听低音的第一次冲撞。'}];
describe('editable inspiration document',()=>{
 it('accepts statements and preserves IDs, while rejecting incomplete or ambiguous imports',()=>{
  const doc=serializePrompts(entries);expect(parsePromptEdits(doc,entries).get(entries[0].id)).toBe(entries[0].text);
  const changed=doc.replace(entries[0].text,'注意声音落下后留下的空白。');expect(parsePromptEdits(changed,entries).get(entries[0].id)).toBe('注意声音落下后留下的空白。');
  for(const invalid of [doc.replace('guide:example','guide:other'),doc.replace(entries[0].text,''),doc.replace(entries[0].text,'一'.repeat(91)),doc.replace(entries[0].text,'第一行\n第二行'),doc+'\n'+doc.slice(doc.indexOf('## '))])expect(()=>parsePromptEdits(invalid,entries)).toThrow();
 });
 it('exports all 102 active author prompts, including every movement',()=>{
  for(const d of Object.values(authorGuideLibrary))for(const g of d.guides)expect(doc).toContain(`## guide:${g.id} |`);
  expect((doc.match(/^## /gm)||[]).length).toBe(109);
 });
});
