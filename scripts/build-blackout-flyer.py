"""A4 outage campaign; historical Berlin event separated from hypothetical prompts."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
import shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/RedScore-Stromausfall-Berlin-Flugblatt-A4.pdf';OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Segoe',r'C:/Windows/Fonts/segoeui.ttf'));pdfmetrics.registerFont(TTFont('SegoeBold',r'C:/Windows/Fonts/segoeuib.ttf'))
W,H=A4;NAVY=HexColor('#071e2b');INK=HexColor('#112f43');MUTED=HexColor('#486577');RED=HexColor('#ff3447');GREEN=HexColor('#32d5aa')
c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1);c.setTitle('Tagelang ohne Strom. Nicht vorbereitet? - RedScore');c.setAuthor('RedScore');c.setSubject('Vorsorge aufschieben ist fahrlässig. Berliner Stromausfall Januar 2026 als historisches Beispiel.')
def text(x,y,copy,size=11,color=INK,bold=False):
 c.setFillColor(color);c.setFont('SegoeBold' if bold else 'Segoe',size);c.drawString(x,y,copy)
def para(x,top,width,copy,size=11,color=INK,bold=False,leading=None):
 p=Paragraph(copy,ParagraphStyle('body',fontName='SegoeBold' if bold else 'Segoe',fontSize=size,leading=leading or size*1.45,textColor=color));_,h=p.wrap(width,600);p.drawOn(c,x,top-h);return h
c.setFillColor(NAVY);c.rect(0,415,W,H-415,fill=1,stroke=0)
c.drawImage(str(ROOT/'dist/assets/redscore-logo.png'),40,H-80,49,49,mask='auto')
text(101,H-62,'Red',31,RED,True);text(101+pdfmetrics.stringWidth('Red','SegoeBold',31),H-62,'Score',31,white,True)
text(42,H-101,'Weil der Ernstfall nicht fragt, ob du bereit bist.',10,HexColor('#c8d9e3'))
text(43,715,'BERLINER SÜDWESTEN  /  JANUAR 2026  /  RÜCKBLICK',9,GREEN,True)
text(42,670,'Tagelang ohne Strom.',34,white,True)
text(42,623,'Und du bist',38,white,True)
text(42,576,'nicht vorbereitet?',38,RED,True)
c.setFillColor(HexColor('#143542'));c.roundRect(42,467,W-84,86,9,fill=1,stroke=0)
text(57,525,'RUND 100 STUNDEN',22,white,True)
para(57,511,W-114,'So lange dauerte die Störung im Berliner Südwesten laut Stromnetz Berlin insgesamt. Erst danach waren alle betroffenen Haushalte und Gewerbekunden wieder versorgt. Einzelne Anschlüsse wurden früher zugeschaltet.',10,HexColor('#d2e3e9'),leading=14)
text(43,435,'Vorsorge aufschieben ist fahrlässig.',21,RED,True)
text(42,382,'Was wäre, wenn es deinen Haushalt trifft?',20,INK,True)
cols=[('01','Licht & Energie','Kein Licht. Handy fast leer. Hast du Taschenlampe, Batterien und eine geladene Powerbank?'),('02','Essen & Trinken','Der Herd bleibt aus. Welche Vorräte und Getränke hast du tatsächlich zu Hause?'),('03','Information & Plan','Dein Handy fällt aus. Wie erhältst du Warnungen? Was habt ihr als Familie vereinbart?')]
for i,(n,title,body) in enumerate(cols):
 x=42+i*174;text(x,349,n,11,HexColor('#008965'),True);text(x,327,title,13.3,INK,True);para(x,313,155,body,10.3,MUTED)
c.setFillColor(NAVY);c.roundRect(42,155,W-84,103,12,fill=1,stroke=0)
text(60,231,'Ausreden laden kein Handy.',20,white,True)
text(61,208,'Prüfe kostenlos deine Vorsorge mit RedScore.',10,HexColor('#d2e3e9'))
text(61,177,'www.redscore.de',20,GREEN,True);c.linkURL('https://www.redscore.de/',(59,168,303,195),relative=0,thickness=0)
c.setFillColor(white);c.roundRect(W-146,165,90,83,5,fill=1,stroke=0)
qr=QrCodeWidget('https://www.redscore.de/',barLevel='M');b=qr.getBounds();size=79
d=Drawing(size,size,transform=[size/(b[2]-b[0]),0,0,size/(b[3]-b[1]),0,0]);d.add(qr);renderPDF.draw(d,c,W-140,167);c.linkURL('https://www.redscore.de/',(W-146,165,W-56,248),relative=0,thickness=0)
c.drawImage(str(ROOT/'dist/assets/bbk-logo-print.png'),42,64,width=169,height=84,mask='auto')
para(225,131,W-267,'Deine Aufgaben beruhen auf den Empfehlungen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe (BBK).<br/><b>Es existiert keine behördliche Zusammenarbeit.</b>',9,MUTED,leading=12.5)
text(42,52,'Faktenquelle: Stromnetz Berlin, 08.01.2026, „Strom ist für alle wieder da“.',7.8,MUTED)
c.linkURL('https://www.stromnetz.berlin/uber-uns/presse/pressemitteilungen-2026/strom-ist-fur-alle-wieder-da/',(42,47,W-42,61),relative=0,thickness=0)
para(42,38,W-84,'RedScore ist ein unabhängiges Vorsorgeangebot. Dein Score beruht auf deinen Angaben und ist keine Sicherheitsgarantie. Im Ereignisfall gelten amtliche Warnungen und Anweisungen.',7.5,MUTED,leading=10)
c.save();PUBLIC=ROOT/'dist/downloads/redscore-stromausfall-berlin-flugblatt-a4.pdf';shutil.copyfile(OUT,PUBLIC);print(OUT);print(PUBLIC)
