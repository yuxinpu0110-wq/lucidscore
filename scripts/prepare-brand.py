"""Generate brand assets: python scripts/prepare-brand.py (requires Pillow)."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'logo-source.png'
if not source.exists(): source=ROOT/'assets/Logo.png'
out=ROOT/'public';out.mkdir(exist_ok=True)
original=Image.open(source).convert('RGB')
# Remove only the outer empty margin, retaining all staff lines and the waveform.
edge=round(min(original.size)*.045)
art=ImageOps.fit(original,(min(original.size),)*2).crop((edge,edge,min(original.size)-edge,min(original.size)-edge))
def png(name,size):
 im=art.resize((size,size),Image.Resampling.LANCZOS);im.save(out/name,optimize=True);return im
logo=png('logo-512.png',512)
logo.save(out/'logo-512.webp',quality=88,method=6)
logo.save(out/'favicon.ico',format='ICO',sizes=[(16,16),(32,32)])
png('android-chrome-192x192.png',192)
png('logo-512x512.png',512)
# Opaque backing; iOS applies its own home-screen corner mask.
apple=png('apple-touch-icon.png',180)
mask=Image.new('L',(180,180));ImageDraw.Draw(mask).rounded_rectangle((0,0,179,179),radius=36,fill=255)
back=Image.new('RGB',(180,180),'#08090c');back.paste(apple,(0,0),mask);back.save(out/'apple-touch-icon.png',optimize=True)
og=Image.new('RGB',(1200,630),'#08090c');og.paste(art.resize((530,530),Image.Resampling.LANCZOS),(25,50))
draw=ImageDraw.Draw(og)
def font(size):
 for path in ['C:/Windows/Fonts/georgia.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf']:
  if Path(path).exists():return ImageFont.truetype(path,size)
 return ImageFont.load_default(size=size)
draw.text((585,230),'LucidScore',font=font(72),fill='#f4f0ea')
draw.text((590,335),'Interactive Score',font=font(26),fill='#c8bcab')
draw.text((590,377),'& Listening Guide',font=font(26),fill='#c8bcab')
draw.text((590,520),'lucidscore.org',font=font(22),fill='#aaa49a')
og.save(out/'og-image.png',optimize=True)
manifest={'name':'LucidScore','short_name':'LucidScore','lang':'zh-CN','start_url':'/mahler/symphonie-2','scope':'/','display':'standalone','background_color':'#08090c','theme_color':'#08090c','icons':[{'src':'/android-chrome-192x192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'/logo-512x512.png','sizes':'512x512','type':'image/png','purpose':'any'}]}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name in ['logo-512.png','logo-512.webp','favicon.ico','apple-touch-icon.png','android-chrome-192x192.png','logo-512x512.png','og-image.png']:
 im=Image.open(out/name);print(name,im.size,im.mode,(out/name).stat().st_size)
