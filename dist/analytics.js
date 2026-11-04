// First-party public-page statistics, strictly after an explicit choice.
(() => {
  const KEY="redscore-consent-v2",VERSION=2,MAX_AGE=180*86400000;
  let choice=null,returnFocus=null,saveFailed=false;
  const read=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||"null"),age=Date.now()-Date.parse(value?.decidedAt);
      return value?.version===VERSION&&typeof value.statistics==='boolean'&&Number.isFinite(age)&&age>=-60000&&age<MAX_AGE?value:null;
    }catch{return null;}
  };
  choice=read();
  const en=()=>document.documentElement.lang.startsWith('en');
  const t=(de,english)=>en()?english:de;
  const SESSION='redscore-visit-session-v1';
  let session=null,lastRoute=null,inFlight=null,retryAfter=0;
  function publicRoute(){
    if(document.querySelector('.logged-page'))return null;
    if(location.pathname==='/'){
      if(!document.querySelector('.public-page'))return null;
      const hash=location.hash.split('?')[0];
      if(['','#/home','#/public'].includes(hash))return '/';
      return hash==='#/angebote'?'/angebote':null;
    }
    return /^\/(?:ratgeber\/(?:index|notvorrat|notfallrucksack|stromausfall)|en\/guides\/(?:index|emergency-supplies|emergency-backpack|power-outage))\.html$/.test(location.pathname)?location.pathname:null;
  }
  const permitted=()=>choice?.statistics===true&&read()?.statistics===true&&Boolean(publicRoute())&&!document.hidden;
  function visitSession(){
    const now=Date.now();
    if(!session){try{session=JSON.parse(sessionStorage.getItem(SESSION)||'null');}catch{}}
    if(!session||!Number.isFinite(session.at)||now-session.at>30*60000||now<session.at||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.id||''))session={id:crypto.randomUUID(),at:now};
    session.at=now;try{sessionStorage.setItem(SESSION,JSON.stringify(session));}catch{}
    return session.id;
  }
  function start(){
    if(!permitted()||!/(^|\.)redscore\.de$/i.test(location.hostname)||!navigator.onLine||Date.now()<retryAfter)return;
    const route=publicRoute();if(route===lastRoute||inFlight)return;
    const sessionId=visitSession(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);inFlight=controller;retryAfter=Date.now()+30000;
    fetch('/api/visit',{method:'POST',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},body:JSON.stringify({route,session:sessionId,consent:2})})
      .then(result=>{if(result.ok&&permitted()){lastRoute=route;retryAfter=0;}}).catch(()=>{}).finally(()=>{clearTimeout(timeout);if(inFlight===controller)inFlight=null;if(lastRoute&&publicRoute()!==lastRoute)start();});
  }
  function withdraw(){
    inFlight?.abort();inFlight=null;lastRoute=null;session=null;retryAfter=0;
    try{sessionStorage.removeItem(SESSION);}catch{}
  }
  function hide(){document.querySelector('#redscore-consent')?.remove();returnFocus?.focus({preventScroll:true});returnFocus=null;}
  function show(manual=false){
    if(manual)returnFocus=document.activeElement;
    let panel=document.querySelector('#redscore-consent');
    if(!panel){panel=document.createElement('section');panel.id='redscore-consent';panel.className='consent-panel';panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','consent-title');document.body.append(panel);}
    panel.innerHTML=`<h2 id="consent-title">${t('Cookies & Datenschutz','Cookies & privacy')}</h2><p>${t('Für Anmeldung, Sprache und Offline-Vorsorge nutzt RedScore notwendigen lokalen Speicher. Optional kannst du Webstatistik auf öffentlichen Seiten erlauben, damit wir RedScore verbessern können.','RedScore uses necessary local storage for sign-in, language and offline preparedness. You can optionally allow web statistics on public pages to help us improve RedScore.')}</p><details><summary>${t('Was wird verwendet?','What is used?')}</summary><p>${t('Notwendig: Kontositzung, eigene Vorsorgedaten, Sprache, Offline-Cache und deine Datenschutz-Auswahl. Diese Funktionen bleiben immer verfügbar.','Necessary: your account session, preparedness data, language, offline cache and privacy choice. These features always remain available.')}</p><p>${t('Optional: RedScore zählt öffentliche Seitenaufrufe und tägliche Besuche in unserer Supabase-Datenbank. Eine zufällige Kennung im Sitzungsspeicher gilt für diesen Browser-Tab und läuft nach 30 Minuten Inaktivität ab. Der Server speichert täglich wechselnde Kennungs-Hashes für höchstens drei Tage und Tageszahlen für 400 Tage. Keine Namen, E-Mails, IP-Adressen, Haushaltsdaten oder URL-Suchparameter in der Statistik. Keine Werbepixel.','Optional: RedScore counts public page views and daily visits in our Supabase database. A random session-storage identifier applies to this browser tab and expires after 30 minutes of inactivity. The server stores daily changing identifier hashes for at most three days and daily totals for 400 days. No names, emails, IP addresses, household data or URL query parameters in the statistics. No advertising pixels.')}</p><p>${t('Deine Auswahl wird für 180 Tage auf diesem Gerät gespeichert. Du kannst sie jederzeit im Footer unter Cookie-Einstellungen ändern oder widerrufen.','Your choice is stored on this device for 180 days. You can change or withdraw it at any time using Cookie settings in the footer.')}</p></details>${choice?`<p class="consent-current">${choice.statistics?t('Aktuell: Statistik erlaubt','Current choice: statistics allowed'):t('Aktuell: nur notwendige Funktionen','Current choice: necessary features only')}</p>`:''}<div class="consent-actions"><button data-consent-choice="necessary">${t('Nur notwendige','Necessary only')}</button><button data-consent-choice="statistics">${t('Statistik erlauben','Allow statistics')}</button></div><p class="consent-links"><a href="/?lang=${en()?'en':'de'}#/datenschutz">${t('Datenschutz','Privacy')}</a><a href="/?lang=${en()?'en':'de'}#/impressum">${t('Impressum','Legal notice')}</a></p>${saveFailed?`<p role="status">${t('Deine Auswahl konnte nicht dauerhaft gespeichert werden und gilt nur für diese Sitzung.','Your choice could not be saved permanently and applies to this page session only.')}</p>`:''}`;
    if(manual)panel.querySelector('button')?.focus({preventScroll:true});
  }
  function choose(statistics){
    choice={version:VERSION,statistics,decidedAt:new Date().toISOString()};
    try{localStorage.setItem(KEY,JSON.stringify(choice));saveFailed=false;}catch{saveFailed=true;}
    if(!statistics)withdraw();start();hide();if(saveFailed)show();
  }
  document.addEventListener('click',event=>{
    const settings=event.target.closest('[data-cookie-settings]');
    if(settings){event.preventDefault();show(true);return;}
    const button=event.target.closest('[data-consent-choice]');
    if(button)choose(button.dataset.consentChoice==='statistics');
  });
  window.addEventListener('storage',event=>{if(event.key!==KEY&&event.key!==null)return;choice=read();if(!choice?.statistics)withdraw();if(choice){hide();start();}else show();});
  window.addEventListener('hashchange',start);window.addEventListener('popstate',start);window.addEventListener('online',start);
  document.addEventListener('visibilitychange',start);
  function ready(){
    if(!choice)show();start();
    new MutationObserver(()=>{if(document.querySelector('#redscore-consent'))show();}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    // Re-renders do not count twice, but public route changes can count.
    new MutationObserver(()=>{start();}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
