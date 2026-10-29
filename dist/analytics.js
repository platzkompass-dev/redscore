// Optional public-page statistics: no vendor script before an explicit choice.
(() => {
  const KEY="redscore-consent-v1",VERSION=1,MAX_AGE=180*86400000;
  let choice=null,started=false,returnFocus=null,saveFailed=false;
  const read=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||"null"),age=Date.now()-Date.parse(value?.decidedAt);
      return value?.version===VERSION&&typeof value.statistics==='boolean'&&Number.isFinite(age)&&age>=-60000&&age<MAX_AGE?value:null;
    }catch{return null;}
  };
  choice=read();
  const en=()=>document.documentElement.lang.startsWith('en');
  const t=(de,english)=>en()?english:de;
  const publicPage=()=>location.pathname!=='/'||Boolean(document.querySelector('.public-page'));
  const permitted=()=>choice?.statistics===true&&publicPage()&&!document.querySelector('.logged-page');
  function beforeSend(event){
    if(!permitted())return null;
    try{const url=new URL(event.url,location.origin);url.search='';url.hash='';return {...event,url:url.toString()};}catch{return null;}
  }
  function start(){
    if(started||!permitted()||!/(^|\.)redscore\.de$/i.test(location.hostname))return;
    started=true;
    window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};
    window.va('beforeSend',beforeSend);
    const script=document.createElement('script');script.defer=true;script.src='/_vercel/insights/script.js';script.dataset.sdkn='@vercel/analytics';
    document.head.append(script);
  }
  function hide(){document.querySelector('#redscore-consent')?.remove();returnFocus?.focus({preventScroll:true});returnFocus=null;}
  function show(manual=false){
    if(manual)returnFocus=document.activeElement;
    let panel=document.querySelector('#redscore-consent');
    if(!panel){panel=document.createElement('section');panel.id='redscore-consent';panel.className='consent-panel';panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','consent-title');document.body.append(panel);}
    panel.innerHTML=`<h2 id="consent-title">${t('Cookies & Datenschutz','Cookies & privacy')}</h2><p>${t('Für Anmeldung, Sprache und Offline-Vorsorge nutzt RedScore notwendigen lokalen Speicher. Optional kannst du Webstatistik auf öffentlichen Seiten erlauben, damit wir RedScore verbessern können.','RedScore uses necessary local storage for sign-in, language and offline preparedness. You can optionally allow web statistics on public pages to help us improve RedScore.')}</p><details><summary>${t('Was wird verwendet?','What is used?')}</summary><p>${t('Notwendig: Kontositzung, eigene Vorsorgedaten, Sprache, Offline-Cache und deine Datenschutz-Auswahl. Diese Funktionen bleiben immer verfügbar.','Necessary: your account session, preparedness data, language, offline cache and privacy choice. These features always remain available.')}</p><p>${t('Optional: Vercel Web Analytics erfasst Seitenaufrufe und technische Angaben wie Browser, Gerätetyp und ungefähre Region. Der Dienst verwendet keine Tracking-Cookies. Wir übermitteln keine Haushalts- oder Vorsorgeangaben und keine URL-Suchparameter. Es gibt keine Werbepixel.','Optional: Vercel Web Analytics collects page views and technical details such as browser, device type and approximate region. It does not use tracking cookies. We do not send household or preparedness details or URL query parameters. There are no advertising pixels.')}</p><p>${t('Deine Auswahl wird für 180 Tage auf diesem Gerät gespeichert. Du kannst sie jederzeit im Footer unter Cookie-Einstellungen ändern oder widerrufen.','Your choice is stored on this device for 180 days. You can change or withdraw it at any time using Cookie settings in the footer.')}</p></details>${choice?`<p class="consent-current">${choice.statistics?t('Aktuell: Statistik erlaubt','Current choice: statistics allowed'):t('Aktuell: nur notwendige Funktionen','Current choice: necessary features only')}</p>`:''}<div class="consent-actions"><button data-consent-choice="necessary">${t('Nur notwendige','Necessary only')}</button><button data-consent-choice="statistics">${t('Statistik erlauben','Allow statistics')}</button></div><p class="consent-links"><a href="/?lang=${en()?'en':'de'}#/datenschutz">${t('Datenschutz','Privacy')}</a><a href="/?lang=${en()?'en':'de'}#/impressum">${t('Impressum','Legal notice')}</a></p>${saveFailed?`<p role="status">${t('Deine Auswahl konnte nicht dauerhaft gespeichert werden und gilt nur für diese Sitzung.','Your choice could not be saved permanently and applies to this page session only.')}</p>`:''}`;
    if(manual)panel.querySelector('button')?.focus({preventScroll:true});
  }
  function choose(statistics){
    choice={version:VERSION,statistics,decidedAt:new Date().toISOString()};
    try{localStorage.setItem(KEY,JSON.stringify(choice));saveFailed=false;}catch{saveFailed=true;}
    // The callback reads the current choice even after withdrawal, including
    // when the vendor script is still downloading. Existing listeners stay gated.
    start();hide();if(saveFailed)show();
  }
  document.addEventListener('click',event=>{
    const settings=event.target.closest('[data-cookie-settings]');
    if(settings){event.preventDefault();show(true);return;}
    const button=event.target.closest('[data-consent-choice]');
    if(button)choose(button.dataset.consentChoice==='statistics');
  });
  window.addEventListener('storage',event=>{if(event.key!==KEY&&event.key!==null)return;choice=read();if(choice){hide();start();}else show();});
  function ready(){
    if(!choice)show();start();
    new MutationObserver(()=>{if(document.querySelector('#redscore-consent'))show();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // Account loading is asynchronous. Only a rendered public page enables stats.
    const observer=new MutationObserver(()=>{start();if(started)observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
