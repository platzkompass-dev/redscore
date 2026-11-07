"""Build the printable RedScore A4 flyer from project-owned assets."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF
from PIL import Image
import shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'pdf'/'RedScore-Flugblatt-A4.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Segoe',r'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold',r'C:/Windows/Fonts/segoeuib.ttf'))
NAVY=HexColor('#071e2b');INK=HexColor('#112f43');MUTED=HexColor('#486577')
GREEN=HexColor('#008965');RED=HexColor('#ff3447')
W,H=A4
c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
c.setTitle('RedScore - Dein Vorsprung durch Vorbereitung')
c.setAuthor('RedScore')
c.setSubject('Kostenloses Vorsorgeangebot für Bürgerinnen und Bürger - A4-Flugblatt zum Auslegen')
c.setCreator('RedScore')

def text(x,y,copy,size=11,color=INK,bold=False):
    c.setFillColor(color);c.setFont('SegoeBold' if bold else 'Segoe',size);c.drawString(x,y,copy)
def paragraph(x,top,width,copy,size=11,color=INK,leading=None,bold=False):
    style=ParagraphStyle('body',fontName='SegoeBold' if bold else 'Segoe',fontSize=size,leading=leading or size*1.45,textColor=color)
    p=Paragraph(copy,style);_,height=p.wrap(width,500);p.drawOn(c,x,top-height);return height
def image_cover(file,x,y,w,h):
    with Image.open(file) as original:
        image=original.convert('RGB');ratio=max(w/image.width,h/image.height)
        cropw,croph=w/ratio,h/ratio
        left=(image.width-cropw)/2;top=(image.height-croph)/2
        image=image.crop((left,top,left+cropw,top+croph))
        c.drawImage(ImageReader(image),x,y,width=w,height=h,mask='auto')

# High-contrast heading and a restrained strip of illustrative scenarios.
c.setFillColor(NAVY);c.rect(0,H-250,W,250,fill=1,stroke=0)
c.drawImage(str(ROOT/'dist/assets/redscore-logo.png'),40,H-79,width=53,height=53,mask='auto')
text(104,H-59,'Red',35,RED,True)
text(104+pdfmetrics.stringWidth('Red','SegoeBold',35),H-59,'Score',35,white,True)
text(43,H-104,'Weil der Ernstfall nicht fragt, ob du bereit bist.',10,HexColor('#c8d9e3'))
text(42,H-159,'Wie gut bist du',34,white,True)
text(42,H-200,'vorbereitet?',34,white,True)
text(43,H-228,'Dein nächster Schritt zählt. Beginne kostenlos.',12,HexColor('#7fe6c3'),True)

names=['blackout','flood','storm','wildfire','heat','supplies']
for i,name in enumerate(names):image_cover(ROOT/f'dist/assets/scenarios/{name}.webp',i*W/6,H-327,W/6+0.3,77)

text(42,H-363,'Wissen, was fehlt. Gezielt ergänzen.',20,INK,True)
paragraph(42,H-377,W-84,'RedScore hilft dir, deinen Haushalt Schritt für Schritt auf Krisen und Versorgungsausfälle vorzubereiten.',11,MUTED)
features=[
    ('Dein persönlicher RedScore','Erfasse deinen Vorsorgestand und erkenne offene Aufgaben.'),
    ('Vorrat und Notfallrucksack','Plane Mengen, halte Bestände fest und hake deine Packliste ab.'),
    ('Information und Orientierung','Finde ausgewählte Lagemeldungen, Warnquellen und wichtige Orte.'),
]
for index,(title,copy) in enumerate(features):
    top=H-432-index*59
    c.setFillColor(HexColor('#e7f5ef'));c.circle(58,top-7,16,fill=1,stroke=0)
    text(48,top-12,f'0{index+1}',11,GREEN,True)
    text(85,top,title,13,INK,True)
    paragraph(85,top-9,W-128,copy,10.5,MUTED)

c.setFillColor(NAVY);c.roundRect(42,94,W-84,136,13,fill=1,stroke=0)
text(61,203,'Kostenlos starten.',20,white,True)
paragraph(61,188,320,'QR-Code scannen, Konto anlegen und<br/>deinen eigenen Vorsorgestand erfassen.',11,HexColor('#d2e3e9'))
text(61,127,'www.redscore.de',21,HexColor('#7fe6c3'),True)
c.linkURL('https://www.redscore.de/',(58,118,300,151),relative=0,thickness=0)
c.setFillColor(white);c.roundRect(W-162,108,106,106,6,fill=1,stroke=0)
qr=QrCodeWidget('https://www.redscore.de/',barLevel='M')
box=qr.getBounds();size=96
d=Drawing(size,size,transform=[size/(box[2]-box[0]),0,0,size/(box[3]-box[1]),0,0]);d.add(qr)
renderPDF.draw(d,c,W-157,113)
c.linkURL('https://www.redscore.de/',(W-162,108,W-56,214),relative=0,thickness=0)
paragraph(42,77,W-84,'Unabhängiges Vorsorgeangebot. Keine behördliche Zusammenarbeit.<br/>Dein Score beruht auf deinen Angaben und ist keine Sicherheitsgarantie.<br/>Im Ereignisfall gelten amtliche Warnungen und Anweisungen.',8,MUTED,leading=11)
text(42,23,'Für Bürgerzentren, Vereine und Einrichtungen zum Ausdrucken und Auslegen.',7.5,MUTED)
c.save()
PUBLIC=ROOT/'dist'/'downloads'/'redscore-flugblatt-a4.pdf'
PUBLIC.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT,PUBLIC)
print(OUT)
print(PUBLIC)
