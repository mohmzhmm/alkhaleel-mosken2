import{SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY}from'./config.js';
import{MonthlyScheduleRenderer,getMonthMeta,monthTitleWithoutYear,safeFilename}from'./monthly-schedule.mjs?v=20260923-2';

const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const names={fajr:'الفجر',sunrise:'الشروق',dhuhr:'الظهر',asr:'العصر',maghrib:'المغرب',isha:'العشاء'};
const iqamaPrayers=['fajr','dhuhr','asr','maghrib','isha'];
const allPrayers=['fajr','sunrise','dhuhr','asr','maghrib','isha'];
const $=id=>document.getElementById(id);
const state={iqama:[],prayer:[],content:null,announcements:[],calendarDefaults:null,layouts:{},layoutDrafts:{},layoutElement:null};
const calendar=new MonthlyScheduleRenderer($('calendar-canvas'));
const layoutDefaults={
 'alkhaleel-mosken2':{logo_size:180,logo_x:15,logo_y:15,clock_font:64,date_font:26,countdown_font:112,countdown_label_font:29,next_prayer_font:48,prayer_name_font:29,swedish_name_font:19,prayer_time_font:26,iqama_label_font:13,iqama_time_font:19,header_offset:0,countdown_offset:80,cards_offset:15,cards_width:45,card_gap:15,news_font:19,side_width:450,side_x:60,ticker_font:32,ticker_height:80},
 'alkhaleel-mosken':{logo_size:70,logo_x:10,logo_y:10,clock_font:48,date_font:16,countdown_font:80,countdown_label_font:17,next_prayer_font:32,prayer_name_font:20,swedish_name_font:12,prayer_time_font:18,iqama_label_font:10,iqama_time_font:16,header_offset:8,countdown_offset:12,cards_offset:12,cards_width:92,card_gap:8}
};
const layoutFields=[
 ['الشعار','logo_size','حجم الشعار',30,400,1,'px'],['الشعار','logo_x','المسافة الأفقية للشعار',0,300,1,'px'],['الشعار','logo_y','المسافة الرأسية للشعار',0,300,1,'px'],
 ['الرأس والعداد','clock_font','حجم الساعة',24,120,1,'px'],['الرأس والعداد','date_font','حجم التاريخ',10,60,1,'px'],['الرأس والعداد','header_offset','موضع الرأس من الأعلى',-50,300,1,'px'],['الرأس والعداد','countdown_font','حجم العداد التنازلي',36,200,1,'px'],['الرأس والعداد','countdown_label_font','حجم عبارة العداد',10,60,1,'px'],['الرأس والعداد','next_prayer_font','حجم اسم الصلاة القادمة',14,90,1,'px'],['الرأس والعداد','countdown_offset','موضع العداد من الأعلى',-50,300,1,'px'],
 ['بطاقات الصلاة','prayer_name_font','حجم اسم الصلاة',12,70,1,'px'],['بطاقات الصلاة','swedish_name_font','حجم الاسم السويدي',8,50,1,'px'],['بطاقات الصلاة','prayer_time_font','حجم وقت الصلاة',12,70,1,'px'],['بطاقات الصلاة','iqama_label_font','حجم كلمة الإقامة',8,40,1,'px'],['بطاقات الصلاة','iqama_time_font','حجم وقت الإقامة',10,60,1,'px'],['بطاقات الصلاة','cards_offset','موضع البطاقات من الأعلى',-50,300,1,'px'],['بطاقات الصلاة','cards_width','عرض منطقة البطاقات',40,100,1,'%'],['بطاقات الصلاة','card_gap','المسافة بين البطاقات',0,50,1,'px'],
 ['الشاشة الأفقية','news_font','حجم خط الأخبار',10,60,1,'px',['alkhaleel-mosken2']],['الشاشة الأفقية','side_width','عرض الجانبين',200,700,1,'px',['alkhaleel-mosken2']],['الشاشة الأفقية','side_x','بعد الجانبين عن الحافة',0,300,1,'px',['alkhaleel-mosken2']],['الشاشة الأفقية','ticker_font','حجم خط الشريط',12,60,1,'px',['alkhaleel-mosken2']],['الشاشة الأفقية','ticker_height','ارتفاع الشريط',40,160,1,'px',['alkhaleel-mosken2']]
];
const layoutTargets={
 logo:['logo_size','logo_x','logo_y'],
 header:['clock_font','date_font','header_offset'],
 countdown:['countdown_font','countdown_label_font','next_prayer_font','countdown_offset'],
 prayer_cards:['prayer_name_font','swedish_name_font','prayer_time_font','iqama_label_font','iqama_time_font','cards_offset','cards_width','card_gap'],
 news:['news_font','side_width','side_x'],side_images:['side_width','side_x'],ticker:['ticker_font','ticker_height']
};
const layoutElementNames={logo:'الشعار',header:'الساعة والتاريخ',countdown:'العداد التنازلي',prayer_cards:'بطاقات الصلوات',news:'بطاقات الأخبار',side_images:'الصور الجانبية',ticker:'الشريط السفلي'};

function busy(on){$('busy').classList.toggle('hidden',!on)}
function notice(message,error=false){const el=$('notice');el.textContent=message;el.classList.toggle('error',error);el.classList.remove('hidden');clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.classList.add('hidden'),6000)}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function addYear(date){const d=new Date(date+'T12:00:00Z');d.setUTCFullYear(d.getUTCFullYear()+1);return d.toISOString().slice(0,10)}
function fillPrayerOptions(id,list){$(id).replaceChildren(...list.map(key=>new Option(names[key],key)))}
function setDefaults(prefix){$(prefix+'-id').value='';$(prefix+'-from').value=today();$(prefix+'-to').value=addYear(today());$(prefix+'-cancel').classList.add('hidden');updateValueField(prefix)}
function updateValueField(prefix){const fixed=$(prefix+'-mode').value==='fixed';const input=$(prefix+'-value');const label=$(prefix+'-value-label');input.value='';input.type=fixed?'time':'text';input.inputMode=fixed?'numeric':'numeric';input.placeholder=fixed?'13:30':prefix==='prayer'?'-5 أو 10':'10';label.firstChild.textContent=fixed?'الوقت الثابت':'عدد الدقائق'+(prefix==='prayer'?' (+ أو -)':'')}
function showDashboard(yes){$('login-view').classList.toggle('hidden',yes);$('dashboard').classList.toggle('hidden',!yes);$('logout').classList.toggle('hidden',!yes)}
async function assertAdmin(){const{data,error}=await db.rpc('is_mosque_admin');if(error)throw error;if(data!==true)throw new Error('هذا الحساب غير مخوّل لإدارة المسجد.')}

async function loadAll(){
 busy(true);
 try{
  const[iqama,prayer,content,announcements,calendarDefaults,layouts]=await Promise.all([
   db.from('iqama_rules').select('id,prayer,mode,value,valid_from,valid_to,updated_at').order('valid_from'),
   db.from('prayer_time_periods').select('id,prayer,mode,value,valid_from,valid_to,updated_at').order('valid_from'),
   db.from('mosque_display_content').select('news_ar,news_sv,ticker_label,ticker_text,updated_at').eq('id',1).single(),
   db.from('announcements').select('id,title_ar,title_sv,body_ar,body_sv,created_at').order('created_at',{ascending:false}).limit(10),
   db.from('mosque_calendar_defaults').select('left_text,right_text,updated_at').eq('id',1).single(),
   db.from('mosque_screen_layouts').select('screen_key,settings,updated_at')
  ]);
  if(iqama.error)throw iqama.error;if(prayer.error)throw prayer.error;if(content.error)throw content.error;if(announcements.error)throw announcements.error;if(calendarDefaults.error)throw calendarDefaults.error;if(layouts.error)throw layouts.error;
  state.iqama=iqama.data||[];state.prayer=prayer.data||[];state.content=content.data;state.announcements=announcements.data||[];state.calendarDefaults=calendarDefaults.data;
  state.layouts=Object.fromEntries((layouts.data||[]).map(row=>[row.screen_key,row.settings]));
  state.layoutDrafts=Object.fromEntries(Object.keys(layoutDefaults).map(key=>[key,{...layoutDefaults[key],...(state.layouts[key]||{})}]));
  renderPeriods('iqama');renderPeriods('prayer');fillContent();renderAnnouncementHistory();fillCalendarDefaults();renderLayoutEditor();
 }finally{busy(false)}
}

function valueLabel(row){return row.mode==='fixed'?row.value.slice(0,5):`${Number(row.value)>=0?'+':''}${row.value} دقيقة`}
function renderPeriods(kind){
 const body=$(kind+'-rows');body.replaceChildren();const rows=state[kind];
 if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.className='empty';td.textContent='لا توجد فترات محفوظة';tr.append(td);body.append(tr);return}
 for(const row of rows){
  const tr=document.createElement('tr');
  for(const text of[names[row.prayer],valueLabel(row),`${row.valid_from} — ${row.valid_to}`]){const td=document.createElement('td');td.textContent=text;tr.append(td)}
  const actions=document.createElement('td');actions.className='row-actions';
  const edit=document.createElement('button');edit.type='button';edit.className='button ghost';edit.textContent='تعديل';edit.onclick=()=>editPeriod(kind,row);
  const del=document.createElement('button');del.type='button';del.className='button danger';del.textContent='حذف';del.onclick=()=>deletePeriod(kind,row);
  actions.append(edit,del);tr.append(actions);body.append(tr);
 }
}
function editPeriod(kind,row){
 $(kind+'-id').value=row.id;$(kind+'-prayer').value=row.prayer;$(kind+'-mode').value=row.mode;
 const input=$(kind+'-value');input.type=row.mode==='fixed'?'time':'text';input.value=row.value.slice(0,5);
 $(kind+'-from').value=row.valid_from;$(kind+'-to').value=row.valid_to;$(kind+'-cancel').classList.remove('hidden');
 $(kind+'-form').scrollIntoView({behavior:'smooth',block:'center'});
}
async function savePeriod(kind,event){
 event.preventDefault();const id=$(kind+'-id').value||null,prayer=$(kind+'-prayer').value,mode=$(kind+'-mode').value,value=$(kind+'-value').value.trim(),from=$(kind+'-from').value,to=$(kind+'-to').value;
 if(!from||!to||from>to)return notice('تحقق من تاريخ بداية الفترة ونهايتها.',true);
 if(mode==='fixed'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return notice('أدخل وقتًا صحيحًا بصيغة 24 ساعة.',true);
 if(mode==='offset'&&!new RegExp(kind==='prayer'?'^[-+]?\\d{1,3}$':'^\\d{1,3}$').test(value))return notice('أدخل عدد دقائق صحيحًا.',true);
 busy(true);
 try{
  const fn=kind==='iqama'?'save_iqama_period':'save_prayer_period';
  const{error}=await db.rpc(fn,{p_id:id,p_prayer:prayer,p_mode:mode,p_value:value,p_from:from,p_to:to});if(error)throw error;
  setDefaults(kind);await loadAll();notice('تم حفظ الفترة وتحديث التطبيقات الثلاثة.');
 }catch(error){notice(friendlyError(error),true)}finally{busy(false)}
}
async function deletePeriod(kind,row){
 if(!confirm(`هل تريد حذف فترة ${names[row.prayer]} من ${row.valid_from} إلى ${row.valid_to}؟`))return;
 busy(true);try{const fn=kind==='iqama'?'delete_iqama_period':'delete_prayer_period';const{error}=await db.rpc(fn,{p_id:row.id});if(error)throw error;await loadAll();notice('تم حذف الفترة.')}catch(error){notice(friendlyError(error),true)}finally{busy(false)}
}
function friendlyError(error){const message=error?.message||'حدث خطأ غير متوقع.';if(/overlap/i.test(message))return'تتداخل هذه الفترة مع فترة موجودة للصلاة نفسها. عدّل الفترة القديمة أو اختر تواريخ أخرى.';if(/Prayer order/i.test(message))return'هذا التعديل يجعل ترتيب أوقات الصلوات غير صحيح في أحد الأيام.';if(/Iqama outside/i.test(message))return'وقت الإقامة يقع قبل الأذان أو بعد الصلاة التالية في أحد الأيام.';if(/Missing prayer/i.test(message))return'الفترة المختارة تتجاوز حدود جدول المواقيت المتوفر.';if(/Forbidden|permission|policy/i.test(message))return'لا يملك هذا الحساب صلاحية تنفيذ العملية.';return message}
function fillContent(){const c=state.content||{};$('news-ar').value=c.news_ar||'';$('news-sv').value=c.news_sv||'';$('ticker-label').value=c.ticker_label||'';$('ticker-text').value=c.ticker_text||''}
async function saveContentPart(part,event){event.preventDefault();const current=state.content||{};busy(true);try{const values=part==='news'?{p_news_ar:$('news-ar').value,p_news_sv:$('news-sv').value,p_ticker_label:current.ticker_label||'',p_ticker_text:current.ticker_text||''}:{p_news_ar:current.news_ar||'',p_news_sv:current.news_sv||'',p_ticker_label:$('ticker-label').value,p_ticker_text:$('ticker-text').value};const{error}=await db.rpc('save_display_content',values);if(error)throw error;await loadAll();notice(part==='news'?'تم حفظ الأخبار فقط، وبقي الشريط كما هو.':'تم حفظ الشريط فقط، وبقيت الأخبار كما هي.')}catch(error){notice(friendlyError(error),true)}finally{busy(false)}}

function notificationValues(){return{title_ar:$('notification-title-ar').value.trim(),title_sv:$('notification-title-sv').value.trim(),body_ar:$('notification-body-ar').value.trim(),body_sv:$('notification-body-sv').value.trim()}}
function previewNotification(){const value=notificationValues(),preview=$('notification-preview');if(!value.title_ar||!value.title_sv||!value.body_ar||!value.body_sv)return notice('أكمل العنوان والنص باللغتين أولًا.',true);preview.replaceChildren();const ar=document.createElement('div'),sv=document.createElement('div');ar.innerHTML='<strong></strong><span></span>';sv.innerHTML='<strong></strong><span></span>';ar.querySelector('strong').textContent=value.title_ar;ar.querySelector('span').textContent=value.body_ar;sv.querySelector('strong').textContent=value.title_sv;sv.querySelector('span').textContent=value.body_sv;sv.dir='ltr';sv.style.marginTop='16px';preview.append(ar,sv);preview.classList.remove('hidden')}
async function publishNotification(event){event.preventDefault();const value=notificationValues();if(!confirm(`سيتم إرسال الإشعار الآن إلى مستخدمي تطبيق الهاتف.\n\n${value.title_ar}\n\nهل تريد المتابعة؟`))return;busy(true);try{const id=crypto.randomUUID(),{error}=await db.rpc('publish_announcement',{p_id:id,p_title_ar:value.title_ar,p_title_sv:value.title_sv,p_body_ar:value.body_ar,p_body_sv:value.body_sv});if(error)throw error;event.target.reset();$('notification-preview').classList.add('hidden');await loadAll();notice('تمت إضافة الإشعار إلى طابور الإرسال، وسيصل خلال نحو دقيقة.')}catch(error){notice(friendlyError(error),true)}finally{busy(false)}}
function renderAnnouncementHistory(){const root=$('notification-history');root.replaceChildren();if(!state.announcements.length){root.textContent='لا توجد إشعارات سابقة.';return}for(const item of state.announcements){const card=document.createElement('div');card.className='history-card';const title=document.createElement('strong'),body=document.createElement('div'),date=document.createElement('small');title.textContent=item.title_ar;body.textContent=item.body_ar;date.textContent=new Intl.DateTimeFormat('ar-SE',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Stockholm'}).format(new Date(item.created_at));card.append(title,body,date);root.append(card)}}

function fillCalendarDefaults(){const value=state.calendarDefaults||{};$('calendar-left-text').value=value.left_text||'';$('calendar-right-text').value=value.right_text||''}
async function saveCalendarDefaults(){busy(true);try{const{error}=await db.rpc('save_calendar_defaults',{p_left_text:$('calendar-left-text').value,p_right_text:$('calendar-right-text').value});if(error)throw error;state.calendarDefaults={left_text:$('calendar-left-text').value.trim(),right_text:$('calendar-right-text').value.trim()};fillCalendarDefaults();notice('تم حفظ نصّي المربعين، وسيبقيان محفوظين حتى تغيّرهما.')}catch(error){notice(friendlyError(error),true)}finally{busy(false)}}

function selectedLayoutKey(){return $('layout-screen').value}
function layoutDraft(screenKey=selectedLayoutKey()){return state.layoutDrafts[screenKey]||(state.layoutDrafts[screenKey]={...layoutDefaults[screenKey],...(state.layouts[screenKey]||{})})}
function currentLayoutValues(){return{...layoutDraft()}}
function previewLayout(){const frame=$('layout-preview');if(frame.contentWindow)frame.contentWindow.postMessage({type:'alkhaleel-layout-preview',screenKey:selectedLayoutKey(),settings:currentLayoutValues()},'*')}
function enableLayoutSelection(){const frame=$('layout-preview');if(frame.contentWindow)frame.contentWindow.postMessage({type:'alkhaleel-layout-select-mode',screenKey:selectedLayoutKey(),enabled:true},'*')}
function resizeLayoutPreview(){const shell=$('layout-preview-shell'),stage=$('layout-preview-stage'),frame=$('layout-preview'),landscape=selectedLayoutKey()==='alkhaleel-mosken2',width=landscape?1920:1080,height=landscape?1080:1920,available=Math.max(240,shell.clientWidth-24),scale=Math.min(1,available/width,720/height);frame.style.width=`${width}px`;frame.style.height=`${height}px`;frame.style.transform=`scale(${scale})`;stage.style.width=`${Math.round(width*scale)}px`;stage.style.height=`${Math.round(height*scale)}px`}
function renderLayoutEditor(forceDefaults=false){
 const screenKey=selectedLayoutKey(),element=state.layoutElement,values=layoutDraft(screenKey),root=$('layout-controls'),status=$('layout-selection-status');root.replaceChildren();
 $('screen-content-settings').classList.toggle('hidden',screenKey!=='alkhaleel-mosken2');
 if(!element||!layoutTargets[element]){status.textContent='اضغط على أي عنصر داخل الشاشة المعروضة بالأسفل لتعديله.';status.classList.remove('selected');updateLayoutPreviewSource();setTimeout(()=>{previewLayout();enableLayoutSelection()},250);return}
 const keys=layoutTargets[element];if(forceDefaults)for(const key of keys)values[key]=layoutDefaults[screenKey][key];status.textContent=`العنصر المحدد: ${layoutElementNames[element]}`;status.classList.add('selected');let group='';
 for(const[fieldGroup,key,label,min,max,step,unit,screens]of layoutFields){
  if(!keys.includes(key)||(screens&&!screens.includes(screenKey)))continue;
  if(group!==fieldGroup){group=fieldGroup;const title=document.createElement('h3');title.className='layout-group-title';title.textContent=group;root.append(title)}
  const box=document.createElement('div');box.className='layout-control';const labelEl=document.createElement('label'),name=document.createElement('span'),output=document.createElement('output'),input=document.createElement('input');name.textContent=label;output.textContent=`${values[key]} ${unit}`;input.type='range';input.min=min;input.max=max;input.step=step;input.value=values[key];input.dataset.layoutKey=key;input.oninput=()=>{values[key]=Number(input.value);output.textContent=`${input.value} ${unit}`;previewLayout()};labelEl.append(name,output);box.append(labelEl,input);root.append(box);
 }
 updateLayoutPreviewSource();setTimeout(()=>{previewLayout();enableLayoutSelection()},250);
}
function updateLayoutPreviewSource(){const frame=$('layout-preview'),screenKey=selectedLayoutKey(),next=screenKey==='alkhaleel-mosken2'?'../index.html?adminPreview=20260923-3':'/alkhaleel-mosken/?adminPreview=20260923-3';resizeLayoutPreview();if(frame.getAttribute('src')!==next)frame.src=next}
async function saveLayout(){const screenKey=selectedLayoutKey(),settings=currentLayoutValues();busy(true);try{const{error}=await db.rpc('save_screen_layout',{p_screen_key:screenKey,p_settings:settings});if(error)throw error;state.layouts[screenKey]={...settings};notice('تم حفظ التصميم. ستلتقط الشاشة الإعدادات الجديدة خلال دقيقة واحدة.')}catch(error){notice(friendlyError(error),true)}finally{busy(false)}}

function defaultMonth(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit'}).formatToParts(new Date()),year=parts.find(x=>x.type==='year').value,month=parts.find(x=>x.type==='month').value;return`${year}-${month}`}
function updateCalendarTitle(){try{$('calendar-title').value=getMonthMeta($('calendar-month').value).title}catch{}}
async function renderCalendar(){const meta=getMonthMeta($('calendar-month').value),title=monthTitleWithoutYear($('calendar-title').value,meta);$('calendar-title').value=title;const{data,error}=await db.from('effective_prayer_times').select('prayer_date,fajr,sunrise,dhuhr,asr,maghrib,isha').gte('prayer_date',meta.start).lte('prayer_date',meta.end).order('prayer_date');if(error)throw error;await calendar.render({meta,rows:data||[],title,leftText:$('calendar-left-text').value.trim(),rightText:$('calendar-right-text').value.trim(),tableFontSize:Number($('calendar-font-size').value)});$('calendar-preview-wrap').classList.remove('hidden');$('calendar-preview-wrap').scrollIntoView({behavior:'smooth',block:'start'});return meta}
async function prepareCalendar(){busy(true);try{const meta=await renderCalendar();notice(`تم إنشاء معاينة ${meta.title} باستخدام قالب ${meta.days} يومًا.`);return meta}catch(error){notice(friendlyError(error),true);throw error}finally{busy(false)}}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function exportCalendar(format){try{const meta=await prepareCalendar(),title=monthTitleWithoutYear($('calendar-title').value,meta),blob=format==='png'?await calendar.pngBlob():await calendar.pdfBlob();downloadBlob(blob,safeFilename(title,format));notice(`تم إنشاء ملف ${format.toUpperCase()} بنجاح.`)}catch{}}

$('login-form').addEventListener('submit',async event=>{event.preventDefault();busy(true);try{const{error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;await assertAdmin();$('password').value='';showDashboard(true);await loadAll()}catch(error){await db.auth.signOut();notice(friendlyError(error),true)}finally{busy(false)}});
$('logout').onclick=async()=>{await db.auth.signOut();showDashboard(false)};
for(const prefix of['iqama','prayer']){$(prefix+'-mode').onchange=()=>updateValueField(prefix);$(prefix+'-cancel').onclick=()=>setDefaults(prefix);$(prefix+'-form').onsubmit=event=>savePeriod(prefix,event)}
$('news-form').onsubmit=event=>saveContentPart('news',event);$('ticker-form').onsubmit=event=>saveContentPart('ticker',event);
$('notification-preview-button').onclick=previewNotification;$('notification-form').onsubmit=publishNotification;
$('layout-screen').onchange=()=>{state.layoutElement=null;renderLayoutEditor()};$('layout-reset').onclick=()=>{if(!state.layoutElement)return notice('اختر عنصرًا من المعاينة أولًا.',true);renderLayoutEditor(true);previewLayout();notice('تمت استعادة القيم الأصلية لهذا العنصر في المعاينة. اضغط حفظ وتطبيق لتثبيتها.')};$('layout-save').onclick=()=>void saveLayout();$('layout-preview').onload=()=>setTimeout(()=>{resizeLayoutPreview();previewLayout();enableLayoutSelection()},100);window.addEventListener('resize',resizeLayoutPreview);
window.addEventListener('message',event=>{const data=event.data;if(data?.type!=='alkhaleel-layout-element-selected'||data.screenKey!==selectedLayoutKey()||!layoutTargets[data.element])return;state.layoutElement=data.element;renderLayoutEditor();$('layout-controls').scrollIntoView({behavior:'smooth',block:'nearest'})});
$('calendar-month').value=defaultMonth();updateCalendarTitle();$('calendar-month').onchange=updateCalendarTitle;$('calendar-font-size').oninput=()=>{$('calendar-font-size-output').textContent=`${$('calendar-font-size').value} px`};$('calendar-save-texts-button').onclick=()=>void saveCalendarDefaults();$('calendar-preview-button').onclick=()=>void prepareCalendar();$('calendar-png-button').onclick=()=>void exportCalendar('png');$('calendar-pdf-button').onclick=()=>void exportCalendar('pdf');
$('calendar-form').onsubmit=event=>event.preventDefault();
document.querySelectorAll('.tab').forEach(button=>button.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===button));document.querySelectorAll('.tab-panel').forEach(x=>x.classList.add('hidden'));$('tab-'+button.dataset.tab).classList.remove('hidden');if(button.dataset.tab==='layout')requestAnimationFrame(resizeLayoutPreview)});
fillPrayerOptions('iqama-prayer',iqamaPrayers);fillPrayerOptions('prayer-prayer',allPrayers);setDefaults('iqama');setDefaults('prayer');

const{data:{session}}=await db.auth.getSession();if(session){try{await assertAdmin();showDashboard(true);await loadAll()}catch{await db.auth.signOut();showDashboard(false)}}
