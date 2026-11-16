/** Keep existing listeners' saved work when upgrading the application namespace. */
export function upgradeStorage() {
 try {
  const storage=localStorage;
  const prior='lucidscore.prologue.seen.v1';
  if(storage.getItem('lucidscore_prologue_seen')===null&&storage.getItem(prior)==='1')storage.setItem('lucidscore_prologue_seen','1');
  if(storage.getItem('lucidscore_prologue_seen')==='1')storage.removeItem(prior);
  for(const key of Object.keys(storage)){
   if(!key.startsWith('mahler-development-guides-'))continue;
   const next=key.replace('mahler-development-guides-','lucidscore_development_guides_');
   if(storage.getItem(next)===null)storage.setItem(next,(storage.getItem(key)||'').replace(/^format: [^\r\n]*-guides\/1$/m,'format: lucidscore-guides/1'));
   storage.removeItem(key);
  }
 } catch { /* Storage can be disabled by the browser. Listening still works. */ }
}
