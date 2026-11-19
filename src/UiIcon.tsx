import type {ReactNode} from 'react';

const shapes = {
 link: <><path d="M10 13.5a4 4 0 0 0 5.7 0l4-4A4 4 0 0 0 14 3.8l-2.5 2.5"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-4 4a4 4 0 0 0 5.7 5.7l2.5-2.5"/></>,
 check: <path d="m5 12 4.5 4.5L19 7"/>,
 settings: <><path d="m10 3-.6 2.4-1.7.9-2.3-.7-2 3.4 1.8 1.7v2.6l-1.8 1.7 2 3.4 2.3-.7 1.7.9.6 2.4h4l.6-2.4 1.7-.9 2.3.7 2-3.4-1.8-1.7v-2.6l1.8-1.7-2-3.4-2.3.7-1.7-.9-.6-2.4z"/><circle cx="12" cy="12" r="3"/></>,
 left: <path d="M20 12H4m6-6-6 6 6 6"/>,
 right: <path d="M4 12h16m-6-6 6 6-6 6"/>,
 external: <path d="M6 18 18 6M8 6h10v10"/>,
 close: <path d="m6 6 12 12M18 6 6 18"/>,
 info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
 replay: <path d="M20 4v6h-6m6-.2A8 8 0 1 0 20 15"/>,
 return: <path d="M4 4v6h6m-6-.2A8 8 0 1 1 4 15"/>,
 expand: <path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>,
 collapse: <path d="M4 9h5V4m6 0v5h5m0 6h-5v5m-6 0v-5H4"/>,
 switch: <path d="M4 8h16m-4-4 4 4-4 4m4 4H4m4-4-4 4 4 4"/>,
} satisfies Record<string,ReactNode>;

export function UiIcon({name,size=14}:{name:keyof typeof shapes;size?:number}){
 return <svg className="ui-icon" width={size} height={size} style={{width:size,height:size}} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
  fill="none" stroke="currentColor" strokeWidth={size===14?1.6:1.5} strokeLinecap="round" strokeLinejoin="round">
  {shapes[name]}
 </svg>;
}
