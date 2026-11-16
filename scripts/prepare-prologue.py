from pathlib import Path
import subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[1]
output=ROOT/'public/videos';output.mkdir(parents=True,exist_ok=True)
clips=[('intro-abyss.mp4','intro-abyss.mp4',16.13,'fade=t=in:st=0:d=0.8,fade=t=out:st=14.93:d=1.2','afade=t=in:st=0:d=0.8,afade=t=out:st=14.6:d=1.53'),('intro-resurrection.mp4.mp4','intro-resurrection.mp4',21.97,'fade=t=in:st=0:d=1','afade=t=in:st=0:d=1,afade=t=out:st=19.5:d=2.47')]
manifest=[]
for source,name,duration,vf,af in clips:
    original=ROOT/'Recording/Video Clip'/source;target=output/name
    subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(original),'-t',str(duration),'-map','0:v:0','-map','0:a:0','-vf',vf+',scale=1280:-2,fps=30,format=yuv420p','-af',af,'-c:v','libx264','-crf','23','-preset','medium','-maxrate','1600k','-bufsize','2000k','-c:a','aac','-b:a','192k','-movflags','+faststart',str(target)],check=True)
    assert target.stat().st_size<6000000, 'Prologue must be below 6MB'
    manifest.append(dict(file=name,source=source,duration=duration,videoFilter=vf,audioFilter=af,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(output/'mastering.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
# One continuous media element avoids requiring a new autoplay grant at scene two.
subprocess.run(['ffmpeg','-nostdin','-v','error','-y','-i',str(output/'intro-abyss.mp4'),'-i',str(output/'intro-resurrection.mp4'),'-filter_complex','[0:v]trim=duration=15.7,setpts=PTS-STARTPTS[v0];[0:a]atrim=duration=15.7,asetpts=PTS-STARTPTS[a0];[v0][1:v]xfade=transition=fade:duration=1.2:offset=14.5[v];[a0][1:a]acrossfade=d=1.2:c1=tri:c2=tri[a]','-map','[v]','-map','[a]','-c:v','libx264','-crf','23','-preset','medium','-pix_fmt','yuv420p','-maxrate','1100k','-bufsize','1600k','-c:a','aac','-b:a','192k','-movflags','+faststart',str(output/'intro-prologue.mp4')],check=True)
assert (output/'intro-prologue.mp4').stat().st_size<6000000
