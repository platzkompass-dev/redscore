"""Render the original RedScore first-aid motion-graphics lesson.
Requires Pillow and imageio-ffmpeg; audio comes from synthesize-first-aid.ps1.
All artwork is drawn locally. No third-party photographs, footage or music.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,subprocess,wave,math,argparse,textwrap
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2]
SPEC=json.loads((Path(__file__).parent/'first-aid-scenes.json').read_text(encoding='utf-8-sig'))
W,H,FPS=1280,720,24
NAVY='#071924'; WHITE='#f2f6fa'; MUTED='#b5c8d5'; RED='#ff3447'; LINE='#314a5a'
FONT='C:/Windows/Fonts/segoeui.ttf'; BOLD='C:/Windows/Fonts/segoeuib.ttf'
def font(n,bold=False):return ImageFont.truetype(BOLD if bold else FONT,n)
def wrap(draw,text,f,width):
 out=[]
 for paragraph in text.split('\n'):
  line=''
  for word in paragraph.split():
   test=(line+' '+word).strip()
   if draw.textlength(test,font=f)>width and line:out.append(line);line=word
   else:line=test
  out.append(line)
 return out

def make_slide(scene,index,lang):
 im=Image.new('RGB',(W,H),NAVY);d=ImageDraw.Draw(im)
 # Restrained architectural lines rather than decorative icons or cartoon figures.
 for x in range(W):
  k=max(0,1-abs(x-1090)/1000)
  d.line([(x,0),(x,H)],fill=(7+int(k*3),25+int(k*9),36+int(k*12)))
 d.line((64,130,1216,130),fill=LINE,width=1)
 logo=Image.open(ROOT/'dist/assets/redscore-logo.png').convert('RGBA');logo.thumbnail((66,66),Image.Resampling.LANCZOS);im.paste(logo,(58,31),logo)
 d.text((138,35),'Red',font=font(36,True),fill=RED)
 d.text((138+d.textlength('Red',font=font(36,True)),35),'Score',font=font(36,True),fill=WHITE)
 d.text((139,81),'ERSTE HILFE' if lang=='de' else 'FIRST AID',font=font(14,True),fill=MUTED,stroke_width=0)
 d.text((1100,53),f'{index+1:02d} / {len(SPEC["scenes"]):02d}',font=font(21),fill=MUTED)
 s=scene[lang]
 d.rectangle((64,170,69,199),fill=RED)
 d.text((85,173),s['tag'],font=font(17,True),fill=MUTED)
 heading=wrap(d,s['heading'],font(44,True),790)
 y=220
 for line in heading:d.text((64,y),line,font=font(44,True),fill=WHITE);y+=56
 y=max(370,y+34)
 for text in s['lines']:
  lines=wrap(d,text,font(25),762)
  d.line((65,y+17,79,y+17),fill=RED,width=3)
  for j,line in enumerate(lines):d.text((94,y+j*34),line,font=font(25),fill=MUTED)
  y+=len(lines)*34+19
 if y>637:raise ValueError(f'Text overflow {lang}/{scene["id"]}: {y}')
 d.rounded_rectangle((923,190,1216,597),radius=12,fill='#0b2433',outline=LINE,width=2)
 d.rectangle((950,219,1004,223),fill=RED)
 metric=s['metric'].split('\n');size=68
 if len(max(metric,key=len))>=7:size=51
 if len(metric)>1:size=48
 for j,line in enumerate(metric):
  f=font(size,True);x=1070-d.textlength(line,font=f)/2
  d.text((x,320+j*64-(len(metric)-1)*28),line,font=f,fill=RED if scene['id'] in ['intro','call'] or(line=='Red') else WHITE)
 lines=wrap(d,s['metricLabel'],font(14,True),235)
 for j,line in enumerate(lines):d.text((1070-d.textlength(line,font=font(14,True))/2,466+j*24),line,font=font(14,True),fill=MUTED)
 if scene['id']=='summary':d.text((1007,550),'redscore.de',font=font(20,True),fill=WHITE)
 d.line((64,643,1216,643),fill=LINE,width=1)
 for n in range(len(SPEC['scenes'])):
  x=64+n*129;d.rectangle((x,641,x+112,644),fill=RED if n<=index else LINE)
 label='RedScore-Kurztraining · Erwachsene · kein Kursnachweis' if lang=='de' else 'RedScore mini training · Adults · not a course certificate'
 d.text((64,664),label,font=font(16),fill=MUTED)
 d.text((64,692),'Grundlagen: GRC · DRK · DGUV' if lang=='de' else 'Based on: GRC · DRK · DGUV',font=font(13),fill='#8da4b5')
 stamp='Stand: 18.11.2026' if lang=='de' else 'Updated: 18 Nov 2026'
 d.text((1216-d.textlength(stamp,font=font(14)),687),stamp,font=font(14),fill='#8da4b5')
 return im

def stamp(seconds):
 ms=round(seconds*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02d}:{m:02d}:{s:02d}.{ms:03d}'
def render(lang,frames_only=False):
 tmp=ROOT/'tmp/first-aid-video'/lang;tmp.mkdir(parents=True,exist_ok=True)
 out=ROOT/'dist/media/training';out.mkdir(parents=True,exist_ok=True)
 ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();start=0;vtt=['WEBVTT',''];chapters=[]
 for i,scene in enumerate(SPEC['scenes']):
  image=make_slide(scene,i,lang);image.save(tmp/(scene['id']+'.png'))
  if i==0:image.save(out/f'redscore-erste-hilfe-{lang}-poster.webp',quality=88)
  if frames_only:continue
  audio=tmp/(scene['id']+'.wav')
  with wave.open(str(audio),'rb') as f:voice_duration=f.getnframes()/f.getframerate()
  duration=voice_duration+1.1
  # Sentence-length captions, timed proportionally to speech length.
  import re
  sentences=re.split(r'(?<=[.!?])\s+',scene[lang]['voice'])
  total=sum(len(s) for s in sentences);elapsed=0
  for sentence in sentences:
   end=elapsed+voice_duration*len(sentence)/total
   vtt.extend([f'{stamp(start+elapsed)} --> {stamp(start+end)}',textwrap.fill(sentence,76),''])
   elapsed=end
  chapters.append({'id':scene['id'],'start':round(start,3),'end':round(start+duration,3),'title':scene[lang]['tag']})
  target=tmp/(scene['id']+'.mp4')
  cmd=[ffmpeg,'-hide_banner','-loglevel','error','-y','-loop','1','-framerate',str(FPS),'-i',str(tmp/(scene['id']+'.png')),'-i',str(audio),'-t',str(duration),'-vf',f'fade=t=in:st=0:d=0.35,fade=t=out:st={duration-.35:.3f}:d=0.35','-af','apad=pad_dur=1.1','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-ar','44100','-ac','1','-movflags','+faststart',str(target)]
  subprocess.run(cmd,check=True)
  print(f'Rendered {lang}/{scene["id"]}: {duration:.1f}s',flush=True)
  start+=duration
 if frames_only:return
 (tmp/'concat.txt').write_text('\n'.join("file '"+str((tmp/(s['id']+'.mp4')).resolve()).replace('\\','/')+"'" for s in SPEC['scenes']),encoding='utf-8')
 target=out/f'redscore-erste-hilfe-{lang}.mp4'
 subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(tmp/'concat.txt'),'-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=7','-c:a','aac','-b:a','96k','-ar','44100','-movflags','+faststart','-metadata','title=RedScore | First aid for adults','-metadata',f'language={lang}','-metadata','comment=Original RedScore motion graphics. Guidance overview; not a course certificate.',str(target)],check=True)
 (out/f'redscore-erste-hilfe-{lang}.vtt').write_text('\n'.join(vtt),encoding='utf-8')
 (tmp/'chapters.json').write_text(json.dumps({'duration':start,'chapters':chapters},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'COMPLETE {lang}: {start:.1f}s / {target.stat().st_size/1024/1024:.1f} MB',flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--lang',choices=['de','en','both'],default='both');parser.add_argument('--frames-only',action='store_true');args=parser.parse_args()
 for lang in (['de','en'] if args.lang=='both' else [args.lang]):render(lang,args.frames_only)
