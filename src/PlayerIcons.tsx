export function PlayIcon({playing}:{playing:boolean}) {
 return <svg className="player-control-icon" viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
  {playing?<><rect x="6.5" y="4" width="3.5" height="16" rx="1.5"/><rect x="14" y="4" width="3.5" height="16" rx="1.5"/></>:<path d="M8 4.5 Q7 4 7 5.5 V18.5 Q7 20 8.5 19 L20 12.8 Q21 12 20 11.2 Z"/>}
 </svg>;
}

export function SkipIcon({forward=false}:{forward?:boolean}) {
 return <svg className="player-control-icon player-skip-icon" viewBox="0 0 18 12" aria-hidden="true" fill="currentColor">
  <g transform={forward?undefined:'translate(18 0) scale(-1 1)'}>
   <path d="M1.8.7C.9.1 0 .7 0 1.7v8.6c0 1 .9 1.6 1.8 1l6.3-4.4c.7-.4.7-1.4 0-1.8Z"/>
   <path d="M10.8.7C9.9.1 9 .7 9 1.7v8.6c0 1 .9 1.6 1.8 1l6.3-4.4c.7-.4.7-1.4 0-1.8Z"/>
  </g>
 </svg>;
}
