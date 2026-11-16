import {open} from 'node:fs/promises';
/** Read MP4 top-level headers only; never load an orchestral track into RAM. */
export async function mp4Atoms(path){
 const file=await open(path,'r');try{
  const size=(await file.stat()).size,atoms=[];let offset=0;
  while(offset+8<=size){const header=Buffer.alloc(16);await file.read(header,0,Math.min(16,size-offset),offset);let length=header.readUInt32BE(0);const type=header.toString('ascii',4,8);
   if(length===1)length=Number(header.readBigUInt64BE(8));else if(length===0)length=size-offset;
   if(length<8||!Number.isSafeInteger(length)||offset+length>size)throw Error(`Invalid MP4 atom in ${path} at ${offset}`);
   atoms.push({type,offset,length});offset+=length;
  }return atoms;
 }finally{await file.close()}
}
export async function isFaststart(path){const atoms=await mp4Atoms(path),moov=atoms.find(a=>a.type==='moov'),mdat=atoms.find(a=>a.type==='mdat');return !!moov&&!!mdat&&moov.offset<mdat.offset}
