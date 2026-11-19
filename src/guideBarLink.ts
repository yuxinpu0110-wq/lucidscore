export const barTargetPattern = '(?:m([1-5]):)?(\\d+)(?:-(\\d+))?';
const target = new RegExp(`^bar:${barTargetPattern}$`);

export function parseBarTarget(value:string) {
 const match = target.exec(value);
 if(!match)return null;
 return {movement:match[1]?Number(match[1]):undefined,from:Number(match[2]),to:Number(match[3]??match[2])};
}

export type GuideReference = (from:number,to?:number,movement?:number)=>void;
