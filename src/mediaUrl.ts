const configured=import.meta.env.VITE_MEDIA_BASE_URL as string|undefined;
export const MEDIA_BASE_URL=(configured??'').replace(/\/$/,'');
export function mediaUrl(path:string){return /^\/(audio|videos)\//.test(path)?MEDIA_BASE_URL+path:path}
