(function(){
  const config=window.ALKHALEEL_SUPABASE;
  if(!config||!config.url||!config.key)return;
  window.alkhaleelIqamaRules=[];
  const headers={apikey:config.key,Authorization:'Bearer '+config.key};
  const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const short=value=>String(value||'').slice(0,5);
  async function get(path){const response=await fetch(config.url+'/rest/v1/'+path,{headers,cache:'no-store'});if(!response.ok)throw new Error('Remote data '+response.status);return response.json()}
  async function refresh(){
    try{
      const now=new Date(),tomorrow=new Date(now);tomorrow.setDate(now.getDate()+1);
      const [days,rules,contentRows]=await Promise.all([
        get(`effective_prayer_times?select=*&prayer_date=gte.${dateKey(now)}&prayer_date=lte.${dateKey(tomorrow)}`),
        get('iqama_rules?select=prayer,mode,value,valid_from,valid_to&order=valid_from.asc'),
        get('mosque_display_content?select=news_ar,news_sv,ticker_label,ticker_text,is_configured&id=eq.1')
      ]);
      const map={fajr:'Fajr',sunrise:'Shuruq',dhuhr:'Duhur',asr:'Asr',maghrib:'Maghrib',isha:'Ishâ'};
      for(const day of days){
        const date=day.prayer_date+' 00:00:00';let target=prayerData.find(item=>item.Datum===date);
        if(!target){target={Datum:date};prayerData.push(target)}
        for(const [remote,local] of Object.entries(map))target[local]=short(day[remote]);
      }
      window.alkhaleelIqamaRules=rules||[];
      const content=contentRows?.[0];
      if(content?.is_configured){
        const ar=document.querySelector('#left-card-top p'),sv=document.querySelector('#left-card-bottom p'),label=document.querySelector('.ticker-label');
        if(ar)ar.textContent=content.news_ar||'';
        if(sv)sv.textContent=content.news_sv||'';
        if(label)label.textContent=content.ticker_label||'';
        if(typeof startTicker==='function')startTicker('ticker-ar',(content.ticker_text||'')+'          ',1,'ltr');
      }
      document.body.dataset.remote='ready';
    }catch(error){document.body.dataset.remote='offline';console.warn('Using the embedded screen content.',error)}
  }
  refresh();setInterval(refresh,60000);
})();
