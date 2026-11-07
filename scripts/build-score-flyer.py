"""Print-ready A4 score campaign flyer; branded BBK attribution is not endorsement."""
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
OUT=ROOT/'output/pdf/RedScore-Score-Flugblatt-A4.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('Segoe',r'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold',r'C:/Windows/Fonts/segoeuib.ttf'))
W,H=A4
NAVY=HexColor('#071e2b');INK=HexColor('#112f43');MUTED=HexColor('#486577');RED=HexColor('#ff3447');GREEN=HexColor('#32d5aa')
c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
c.setTitle('Ab heute zählt dein RedScore - Wie vorbereitet bist du?')
c.setAuthor('RedScore');c.setSubject('Dein persönlicher Vorsorgestand: erfassen, Lücken erkennen, gezielt handeln.')
def text(x,y,copy,size=11,color=INK,bold=False):
 c.setFillColor(color);c.setFont('SegoeBold' if bold else 'Segoe',size);c.drawString(x,y,copy)
def para(x,top,width,copy,size=11,color=INK,bold=False,leading=None):
 p=Paragraph(copy,ParagraphStyle('body',fontName='SegoeBold' if bold else 'Segoe',fontSize=size,leading=leading or size*1.45,textColor=color));_,height=p.wrap(width,600);p.drawOn(c,x,top-height);return height

# Score is the hero, not a badge lost among feature photos.
c.setFillColor(NAVY);c.rect(0,415,W,H-415,fill=1,stroke=0)
c.drawImage(str(ROOT/'dist/assets/redscore-logo.png'),40,H-80,49,49,mask='auto')
text(101,H-62,'Red',31,RED,True);text(101+pdfmetrics.stringWidth('Red','SegoeBold',31),H-62,'Score',31,white,True)
text(42,H-101,'Weil der Ernstfall nicht fragt, ob du bereit bist.',10,HexColor('#c8d9e3'))
text(42,H-156,'Ab heute zählt',38,white,True)
x=42;y=H-201
for word,color in [('dein ',white),('Red',white),('Score',RED),('.',white)]:
 text(x,y,word,38,color,True);x+=pdfmetrics.stringWidth(word,'SegoeBold',38)
para(43,604,261,'Wie vorbereitet bist du wirklich?',20,white,True,leading=25)
para(43,541,247,'Dein RedScore macht deinen erfassten Vorsorgestand sichtbar. Er zeigt dir, wo du bereits gut aufgestellt bist und was du als Nächstes angehen kannst.',11.5,HexColor('#d2e3e9'))
text(43,440,'Deine Angaben. Deine nächsten Schritte.',11,GREEN,True)
# Crisp vector gauge. The number is clearly illustrative, never an actual assessment.
cx,cy,r=444,539,82
c.setLineWidth(14);c.setStrokeColor(HexColor('#24404e'));c.circle(cx,cy,r,fill=0,stroke=1)
c.setLineCap(1);c.setStrokeColor(GREEN);c.arc(cx-r,cy-r,cx+r,cy+r,startAng=90,extent=-230.4)
c.setFillColor(white);c.setFont('SegoeBold',65);c.drawCentredString(cx,cy-14,'64')
c.setFont('Segoe',11);c.setFillColor(HexColor('#c8d9e3'));c.drawCentredString(cx,cy-38,'von 100')
c.setFont('SegoeBold',8.5);c.setFillColor(GREEN);c.drawCentredString(cx,432,'BEISPIEL-SCORE')

text(42,382,'Mach aus Unsicherheit einen nächsten Schritt.',19,INK,True)
cols=[('01','Stand erfassen','Beantworte deinen Vorsorge-Check und trage deine vorhandenen Vorräte ein.'),('02','Lücken erkennen','Sieh, wo noch etwas fehlt: etwa bei Wasser, Energie oder deinem Notfallplan.'),('03','Gezielt verbessern','Ergänze deine Vorsorge und aktualisiere deine Angaben. So wird Fortschritt sichtbar.')]
for i,(number,title,body) in enumerate(cols):
 x=42+i*174
 text(x,349,number,11,HexColor('#008965'),True)
 text(x,327,title,14,INK,True)
 para(x,313,155,body,10.3,MUTED)

c.setFillColor(NAVY);c.roundRect(42,155,W-84,103,12,fill=1,stroke=0)
text(60,231,'Kenn deinen Stand.',22,white,True)
text(61,208,'Jetzt kostenlos deinen RedScore ermitteln.',10.5,HexColor('#d2e3e9'))
text(61,177,'www.redscore.de',20,GREEN,True)
c.linkURL('https://www.redscore.de/',(59,168,303,195),relative=0,thickness=0)
c.setFillColor(white);c.roundRect(W-146,165,90,83,5,fill=1,stroke=0)
qr=QrCodeWidget('https://www.redscore.de/',barLevel='M');bounds=qr.getBounds();size=79
d=Drawing(size,size,transform=[size/(bounds[2]-bounds[0]),0,0,size/(bounds[3]-bounds[1]),0,0]);d.add(qr);renderPDF.draw(d,c,W-140,167)
c.linkURL('https://www.redscore.de/',(W-146,165,W-56,248),relative=0,thickness=0)
# Same BBK mark as website, unmodified and on white, with explicit source role.
c.drawImage(str(ROOT/'dist/assets/bbk-logo-print.png'),42,64,width=169,height=84,mask='auto')
para(225,131,W-267,'Deine Aufgaben beruhen auf den Empfehlungen des Bundesamts für Bevölkerungsschutz und Katastrophenhilfe (BBK).<br/><b>Es existiert keine behördliche Zusammenarbeit.</b>',9,MUTED,leading=12.5)
para(42,50,W-84,'Dein Score beruht auf deinen Angaben. Er ist keine Gefahrenprognose oder Sicherheitsgarantie. Im Ereignisfall gelten amtliche Warnungen und Anweisungen.',8,MUTED,leading=11)
c.save()
PUBLIC=ROOT/'dist/downloads/redscore-score-flugblatt-a4.pdf';PUBLIC.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(OUT,PUBLIC)
print(OUT);print(PUBLIC)
