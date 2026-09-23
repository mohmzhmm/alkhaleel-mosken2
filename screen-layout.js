(function(){
  'use strict';
  const SCREEN_KEY='alkhaleel-mosken2';
  const units={logo_size:'px',logo_x:'px',logo_y:'px',clock_font:'px',date_font:'px',countdown_font:'px',countdown_label_font:'px',next_prayer_font:'px',prayer_name_font:'px',swedish_name_font:'px',prayer_time_font:'px',iqama_label_font:'px',iqama_time_font:'px',header_offset:'px',countdown_offset:'px',cards_offset:'px',cards_width:'%',card_gap:'px',news_font:'px',side_width:'px',side_x:'px',ticker_font:'px',ticker_height:'px'};
  const variable={logo_size:'--logo-size',logo_x:'--logo-x',logo_y:'--logo-y',clock_font:'--clock-font',date_font:'--date-font',countdown_font:'--countdown-font',countdown_label_font:'--countdown-label-font',next_prayer_font:'--next-prayer-font',prayer_name_font:'--prayer-name-font',swedish_name_font:'--swedish-name-font',prayer_time_font:'--prayer-time-font',iqama_label_font:'--iqama-label-font',iqama_time_font:'--iqama-time-font',header_offset:'--header-offset',countdown_offset:'--countdown-offset',cards_offset:'--cards-offset',cards_width:'--cards-width',card_gap:'--card-gap',news_font:'--news-font',side_width:'--side-width',side_x:'--side-x',ticker_font:'--ticker-font',ticker_height:'--ticker-height'};
  const selectable=[['.ticker-bar','ticker'],['.top-left-logo','logo'],['.left-side-cards','news'],['.right-side-images','side_images'],['.timer-wrapper','countdown'],['.header-top','header'],['.cards-and-side','prayer_cards']];
  const style=document.createElement('style');style.textContent='.alkhaleel-selectable{cursor:pointer!important;outline:4px solid #ffca28!important;outline-offset:3px!important;filter:drop-shadow(0 0 8px rgba(255,202,40,.75))}';document.head.append(style);
  let selectionMode=false,highlighted=null;
  function targetFor(node){for(const[selector,target]of selectable){const element=node.closest?.(selector);if(element)return{element,target}}return null}
  function highlight(element){if(highlighted!==element){highlighted?.classList.remove('alkhaleel-selectable');highlighted=element;highlighted?.classList.add('alkhaleel-selectable')}}
  document.addEventListener('mousemove',event=>{if(selectionMode)highlight(targetFor(event.target)?.element||null)},true);
  document.addEventListener('mouseleave',()=>highlight(null),true);
  document.addEventListener('click',event=>{if(!selectionMode)return;const found=targetFor(event.target);if(!found)return;event.preventDefault();event.stopPropagation();highlight(found.element);parent.postMessage({type:'alkhaleel-layout-element-selected',screenKey:SCREEN_KEY,element:found.target},'*')},true);
  function apply(settings){
    if(!settings||typeof settings!=='object')return;
    for(const[key,name]of Object.entries(variable)){
      const value=Number(settings[key]);
      if(Number.isFinite(value))document.documentElement.style.setProperty(name,value+units[key]);
    }
  }
  async function refresh(){
    const config=window.ALKHALEEL_SUPABASE;
    if(!config?.url||!config?.key)return;
    try{
      const url=`${config.url}/rest/v1/mosque_screen_layouts?select=settings&screen_key=eq.${encodeURIComponent(SCREEN_KEY)}&limit=1`;
      const response=await fetch(url,{headers:{apikey:config.key,Authorization:`Bearer ${config.key}`},cache:'no-store'});
      if(!response.ok)return;
      const rows=await response.json();apply(rows[0]?.settings);
    }catch(error){console.warn('تعذّر تحميل إعدادات الشاشة',error)}
  }
  window.addEventListener('message',event=>{const data=event.data;if(data?.screenKey!==SCREEN_KEY)return;if(data.type==='alkhaleel-layout-preview')apply(data.settings);if(data.type==='alkhaleel-layout-select-mode'){selectionMode=Boolean(data.enabled);if(!selectionMode)highlight(null)}});
  refresh();setInterval(refresh,60000);
})();
