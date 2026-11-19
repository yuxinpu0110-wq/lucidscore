const windows=[
 [{start:1.2,end:4.2,text:'生是什么？'},{start:6.2,end:10.2,text:'死又是什么？'}],
 [{start:1,end:4.6,text:'凡诞生者，皆须消亡。'},{start:5,end:9.2,text:'凡消亡者，终将复活。'}]
];
export function captionFrame(scene:number,time:number){
 const cue=windows[scene]?.find(c=>time>=c.start&&time<c.end);
 if(!cue)return {text:'',alpha:0,offset:10};
 const enter=Math.min(1,(time-cue.start)/.65),leave=Math.min(1,(cue.end-time)/.5);
 const alpha=Math.max(0,Math.min(enter,leave));
 return {text:cue.text,alpha,offset:10*(1-enter)};
}
export const captionFontText=windows.flat().map(c=>c.text).join('');
