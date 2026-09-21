export const MONTH_LAYOUT=Object.freeze({
 width:1414,height:2000,
 columns:[75,143,254,372,494,624,752,883,1008],
 rows:[516,559,601,643,686,728,771,813,856,898,941,983,1026,1068,1110,1153,1195,1238,1280,1323,1365,1408,1450,1492,1534,1577,1619,1661,1702,1745,1787,1829],
 monthBox:{x:258,y:43,w:367,h:386},
 rightBox:{x:805,y:51,w:370,h:379}
});

const prayers=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
const weekdays=['Sön','Mån','Tis','Ons','Tor','Fre','Lör'];
const swedishMonths=['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

export function getMonthMeta(value){
 if(!/^\d{4}-\d{2}$/.test(value))throw new Error('اختر شهرًا صحيحًا.');
 const [year,month]=value.split('-').map(Number);
 if(year<2026||year>2100||month<1||month>12)throw new Error('الشهر خارج النطاق المدعوم.');
 const days=new Date(Date.UTC(year,month,0)).getUTCDate();
 return{year,month,days,start:`${year}-${String(month).padStart(2,'0')}-01`,end:`${year}-${String(month).padStart(2,'0')}-${days}`,title:`${swedishMonths[month-1]} ${year}`};
}

export function validateMonthRows(rows,meta){
 if(!Array.isArray(rows)||rows.length!==meta.days)throw new Error(`قاعدة البيانات لا تحتوي على جميع أيام الشهر (${meta.days} يومًا).`);
 for(let i=0;i<rows.length;i++){
  const expected=`${meta.year}-${String(meta.month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
  if(rows[i].prayer_date!==expected)throw new Error(`اليوم ${i+1} مفقود أو في غير موضعه.`);
  for(const prayer of prayers)if(!/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(String(rows[i][prayer]||'')))throw new Error(`وقت ${prayer} غير صالح في اليوم ${i+1}.`);
 }
 return true;
}

function wrapLines(ctx,text,maxWidth){
 const paragraphs=String(text||'').replace(/\r/g,'').split(/\n/),lines=[];
 for(const paragraph of paragraphs){
  const words=paragraph.trim().split(/\s+/).filter(Boolean);if(!words.length){lines.push('');continue;}
  let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth)line=test;else{if(line)lines.push(line);line=word;}}
  if(line)lines.push(line);
 }
 return lines;
}

function drawBoxText(ctx,box,text,{size=32,minSize=14,color='#073f3e',weight=700,paddingX=38,paddingY=28}={}){
 ctx.save();ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=/[\u0600-\u06ff]/.test(text)?'rtl':'ltr';
 const maxWidth=box.w-paddingX*2,maxHeight=box.h-paddingY*2;
 let chosenSize=size,lines=[],lineHeight=0;
 for(let candidate=size;candidate>=minSize;candidate--){
  ctx.font=`${weight} ${candidate}px Tajawal, Arial, sans-serif`;
  const candidateLines=wrapLines(ctx,text,maxWidth),candidateLineHeight=candidate*1.36;
  const widest=candidateLines.reduce((value,line)=>Math.max(value,ctx.measureText(line).width),0);
  if(candidateLines.length*candidateLineHeight<=maxHeight&&widest<=maxWidth){chosenSize=candidate;lines=candidateLines;lineHeight=candidateLineHeight;break;}
 }
 if(!lines.length){ctx.font=`${weight} ${minSize}px Tajawal, Arial, sans-serif`;chosenSize=minSize;lines=wrapLines(ctx,text,maxWidth);lineHeight=minSize*1.3;}
 ctx.font=`${weight} ${chosenSize}px Tajawal, Arial, sans-serif`;
 const total=(lines.length-1)*lineHeight;
 lines.forEach((line,i)=>ctx.fillText(line,box.x+box.w/2,box.y+box.h/2-total/2+i*lineHeight));ctx.restore();
}

function drawMonthTitle(ctx,title){
 ctx.save();ctx.fillStyle='#073f3e';ctx.textAlign='center';ctx.textBaseline='top';ctx.direction='ltr';
 let size=38;do{ctx.font=`700 ${size}px Tajawal, Arial, sans-serif`;if(ctx.measureText(title).width<=500)break;size--;}while(size>24);
 ctx.fillText(title,MONTH_LAYOUT.width/2,20);ctx.restore();
}

function imageFor(days){return`templates/${days}-days.png`}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('تعذّر تحميل قالب الشهر.'));image.src=src;});}
function rowBounds(day){const top=MONTH_LAYOUT.rows[day-1],bottom=MONTH_LAYOUT.rows[day];if(top==null||bottom==null)throw new Error('صف اليوم خارج القالب.');return{top,bottom,center:(top+bottom)/2};}

export class MonthlyScheduleRenderer{
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.last=null;}
 async render({meta,rows,title,leftText,rightText}){
  validateMonthRows(rows,meta);if(![28,29,30,31].includes(meta.days))throw new Error('لا يوجد قالب مناسب لهذا الشهر.');
  await document.fonts.ready;const image=await loadImage(imageFor(meta.days));
  const{ctx}=this;ctx.clearRect(0,0,MONTH_LAYOUT.width,MONTH_LAYOUT.height);ctx.drawImage(image,0,0,MONTH_LAYOUT.width,MONTH_LAYOUT.height);
  for(let day=1;day<=meta.days;day++){
   const date=new Date(Date.UTC(meta.year,meta.month-1,day)),isFriday=date.getUTCDay()===5,{top,bottom}=rowBounds(day);
   ctx.save();ctx.fillStyle=isFriday?'#f7e8b6':'#ffffff';for(let c=0;c<8;c++)ctx.fillRect(MONTH_LAYOUT.columns[c]+1,top+1,MONTH_LAYOUT.columns[c+1]-MONTH_LAYOUT.columns[c]-2,bottom-top-2);ctx.restore();
  }
  drawMonthTitle(ctx,title);
  drawBoxText(ctx,MONTH_LAYOUT.monthBox,leftText,{size:32,minSize:14,weight:700});
  drawBoxText(ctx,MONTH_LAYOUT.rightBox,rightText,{size:32,minSize:14,weight:700});
  ctx.fillStyle='#073f3e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='ltr';
  for(let index=0;index<rows.length;index++){
   const day=index+1,row=rows[index],date=new Date(Date.UTC(meta.year,meta.month-1,day)),friday=date.getUTCDay()===5,{center}=rowBounds(day);
   ctx.fillStyle=friday?'#7b3515':'#073f3e';
   ctx.font='700 24px Tajawal, Arial, sans-serif';ctx.fillText(String(day),(MONTH_LAYOUT.columns[0]+MONTH_LAYOUT.columns[1])/2,center+1);
   ctx.font='700 23px Tajawal, Arial, sans-serif';ctx.fillText(weekdays[date.getUTCDay()],(MONTH_LAYOUT.columns[1]+MONTH_LAYOUT.columns[2])/2,center+1);
   ctx.font='700 25px Tajawal, Arial, sans-serif';
   prayers.forEach((prayer,p)=>{const value=String(row[prayer]).slice(0,5),x=(MONTH_LAYOUT.columns[p+2]+MONTH_LAYOUT.columns[p+3])/2;ctx.fillText(value,x,center+1);});
  }
  this.last={meta,title};return this.canvas;
 }
 async pngBlob(){if(!this.last)throw new Error('أنشئ المعاينة أولًا.');return new Promise((resolve,reject)=>this.canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذّر إنشاء PNG.')),'image/png'));}
 async pdfBlob(){if(!this.last)throw new Error('أنشئ المعاينة أولًا.');const url=this.canvas.toDataURL('image/jpeg',.98),bytes=Uint8Array.from(atob(url.split(',')[1]),c=>c.charCodeAt(0));return buildPdfFromJpeg(bytes,MONTH_LAYOUT.width,MONTH_LAYOUT.height);}
}

export function buildPdfFromJpeg(jpeg,width,height){
 const enc=new TextEncoder(),parts=[],offsets=[0],push=value=>parts.push(typeof value==='string'?enc.encode(value):value),length=()=>parts.reduce((sum,p)=>sum+p.length,0);
 push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 const object=(id,body)=>{offsets[id]=length();push(`${id} 0 obj\n`);push(body);push('\nendobj\n');};
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
 const stream=`q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;object(4,`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);
 offsets[5]=length();push('5 0 obj\n');push(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);push(jpeg);push('\nendstream\nendobj\n');
 const xref=length();push('xref\n0 6\n0000000000 65535 f \n');for(let i=1;i<=5;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'});
}

export function safeFilename(title,extension){const value=String(title||'prayer-times').normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,80)||'prayer-times';return`${value}.${extension}`;}
