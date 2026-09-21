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

function fitText(ctx,text,maxWidth,startSize,minSize=18,weight=600){
 let size=startSize;do{ctx.font=`${weight} ${size}px Tajawal, Arial, sans-serif`;if(ctx.measureText(text).width<=maxWidth)return size;size--;}while(size>=minSize);return minSize;
}

function wrapLines(ctx,text,maxWidth,maxLines){
 const paragraphs=String(text||'').split(/\n/),lines=[];
 for(const paragraph of paragraphs){
  const words=paragraph.trim().split(/\s+/).filter(Boolean);if(!words.length){if(lines.length<maxLines)lines.push('');continue;}
  let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width<=maxWidth)line=test;else{if(line)lines.push(line);line=word;if(lines.length>=maxLines)break;}}
  if(lines.length<maxLines&&line)lines.push(line);if(lines.length>=maxLines)break;
 }
 return lines.slice(0,maxLines);
}

function drawBoxText(ctx,box,text,{size=27,maxLines=7,color='#073f3e',weight=600}={}){
 ctx.save();ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction=/[\u0600-\u06ff]/.test(text)?'rtl':'ltr';ctx.font=`${weight} ${size}px Tajawal, Arial, sans-serif`;
 const lines=wrapLines(ctx,text,box.w-64,maxLines),lineHeight=size*1.45,total=(lines.length-1)*lineHeight;
 lines.forEach((line,i)=>ctx.fillText(line,box.x+box.w/2,box.y+box.h/2-total/2+i*lineHeight));ctx.restore();
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
   if(isFriday){ctx.save();ctx.fillStyle='rgba(232,188,48,.28)';for(let c=0;c<8;c++)ctx.fillRect(MONTH_LAYOUT.columns[c]+1,top+1,MONTH_LAYOUT.columns[c+1]-MONTH_LAYOUT.columns[c]-2,bottom-top-2);ctx.restore();}
  }
  drawBoxText(ctx,{...MONTH_LAYOUT.monthBox,y:MONTH_LAYOUT.monthBox.y+22,h:115},title,{size:38,maxLines:2,weight:700});
  drawBoxText(ctx,{x:MONTH_LAYOUT.monthBox.x+15,y:MONTH_LAYOUT.monthBox.y+130,w:MONTH_LAYOUT.monthBox.w-30,h:MONTH_LAYOUT.monthBox.h-145},leftText,{size:25,maxLines:6});
  drawBoxText(ctx,MONTH_LAYOUT.rightBox,rightText,{size:25,maxLines:8});
  ctx.fillStyle='#173f3e';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='ltr';
  for(let index=0;index<rows.length;index++){
   const day=index+1,row=rows[index],date=new Date(Date.UTC(meta.year,meta.month-1,day)),friday=date.getUTCDay()===5,{center}=rowBounds(day);
   ctx.font=`${friday?700:500} 18px Tajawal, Arial, sans-serif`;ctx.fillStyle=friday?'#8b3f16':'#173f3e';ctx.fillText(weekdays[date.getUTCDay()],(MONTH_LAYOUT.columns[1]+MONTH_LAYOUT.columns[2])/2,center+1);
   ctx.font=`${friday?700:600} 20px Tajawal, Arial, sans-serif`;
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
