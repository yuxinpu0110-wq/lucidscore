import {useId,useRef,type ReactNode} from 'react';
export function ReviewDrawer({children}:{children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),title=useId();
 return <>
  <button className="review-trigger" aria-label="审阅与音源" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><span aria-hidden="true">⚙</span><span className="review-trigger-label"> 审阅与音源</span></button>
  <dialog ref={dialog} className="review-drawer" aria-labelledby={title} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close()}}}>
   <div className="review-drawer-heading"><div><span className="urtext-label">REDAKTION · 资料与校核</span><h2 id={title}>审阅与音源</h2></div><button autoFocus aria-label="关闭审阅与音源" onClick={()=>dialog.current?.close()}>×</button></div>
   <div className="review-drawer-content" data-debug-tools={import.meta.env.DEV||new URLSearchParams(location.search).get('review')==='1'}>{children}</div>
  </dialog>
 </>;
}
