// Deterministic, local what-if model. Never writes stocks, assessments or scores.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const known = value => typeof value === "number" && Number.isFinite(value) && value >= 0;
const amount = (value, max) => known(value) ? clamp(value, 0, max) : 0;
const quarterUp = value => Math.ceil(Math.max(0, value) * 4 - 1e-9) / 4;
export const newSupplyTwinPlan = () => ({ scenario:"shopping", guests:0, readyPercent:null, water:0, food:0, target:10, hour:0 });

export function supplyTwinModel(snapshot, input = {}) {
  const people = Number.isInteger(snapshot.people) && snapshot.people > 0 && snapshot.people <= 20 ? snapshot.people : null;
  const guests = Math.floor(amount(input.guests,6));
  const totalPeople = people === null ? null : people + guests;
  const water = known(snapshot.water) ? clamp(snapshot.water,0,1000) : null;
  const food = known(snapshot.food) ? clamp(snapshot.food,0,30) : null;
  const target = [3,7,10].includes(input.target) ? input.target : 10;
  const noCook = input.scenario === "no-cook";
  const ready = noCook ? (known(input.readyPercent) && input.readyPercent <= 100 ? input.readyPercent / 100 : null) : 1;
  const addedWater = amount(input.water,1000), addedFood = amount(input.food,100);
  const dailyWater = totalPeople === null ? null : totalPeople * 2;
  const foodPortions = food !== null && people !== null && ready !== null ? food * people * ready : null;
  const waterDays = water !== null && dailyWater !== null ? water / dailyWater : null;
  const foodDays = foodPortions !== null ? foodPortions / totalPeople : null;
  const plannedWaterDays = waterDays === null ? null : (water + addedWater) / dailyWater;
  const plannedFoodDays = foodDays === null ? null : (foodPortions + addedFood * people) / totalPeople;
  const complete = waterDays !== null && foodDays !== null;
  const first = complete ? Math.min(waterDays,foodDays) : null;
  const plannedFirst = complete ? Math.min(plannedWaterDays,plannedFoodDays) : null;
  const bottleneck = !complete ? null : Math.abs(waterDays-foodDays)<1e-8 ? "both" : waterDays < foodDays ? "water" : "food";
  const hour = clamp(amount(input.hour,target*24),0,target*24), day = hour/24;
  const toGoal = complete ? {
    water:Math.max(addedWater,Math.ceil(Math.max(0,target*dailyWater-water)*2-1e-9)/2),
    food:Math.max(addedFood,quarterUp((target*totalPeople-foodPortions)/people)),
  } : null;
  const gainFor = (moreWater,moreFood) => !complete ? null : Math.max(0,Math.min((water+addedWater+moreWater)/dailyWater,(foodPortions+(addedFood+moreFood)*people)/totalPeople)-plannedFirst);
  return {
    people,totalPeople,guests,water,food,target,noCook,ready,addedWater,addedFood,dailyWater,
    waterDays,foodDays,plannedWaterDays,plannedFoodDays,complete,first,plannedFirst,bottleneck,
    hour,day,gain:complete?Math.max(0,plannedFirst-first):null,toGoal,
    waterRemaining:plannedWaterDays===null?null:Math.max(0,water+addedWater-day*dailyWater),
    foodRemaining:plannedFoodDays===null?null:Math.max(0,(foodPortions+addedFood*people)/totalPeople-day),
    waterGain:gainFor(6,0),foodGain:gainFor(0,1),
  };
}

const esc = value => String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
const tr = language => (de,en) => language === "en" ? en : de;
const number = (value,language) => new Intl.NumberFormat(language === "en" ? "en-GB" : "de-DE",{maximumFractionDigits:2}).format(value);
function duration(days,language) {
  const t=tr(language);if(days===null)return t("offen","unknown");
  const hours=Math.floor(days*24+1e-8), d=Math.floor(hours/24), h=hours%24;
  return d ? `${d} ${t(d===1?"Tag":"Tage",d===1?"day":"days")}${h?` ${h} h`:""}` : `${hours} h`;
}
function mobilePreview(model,language) {
  const t=tr(language);
  return `${t("Engpass","Shortfall")}: ${duration(model.first,language)} → ${duration(model.plannedFirst,language)} · ${t("Tag","Day")} ${number(model.day,language)}: ${model.waterRemaining===null?"—":number(model.waterRemaining,language)+" L"} ${t("Wasser","water")} · ${duration(model.foodRemaining,language)} ${t("Essen","food")}`;
}
function timeline(model,language) {
  const t=tr(language), width=720,left=110,right=20,span=width-left-right;
  const x=days=>left+clamp(days/model.target,0,1)*span;
  const cursor=x(model.day);
  return `<svg class="twin-timeline" viewBox="0 0 720 180" role="img" aria-label="${t("Zeitachse für Wasser und Lebensmittel: gestrichelt ist die geplante Ergänzung.","Water and food timeline: dashed lines show planned additions.")}">
    ${[0,1,2,3,4,5].map(index=>{const day=model.target*index/5;return `<line x1="${x(day)}" x2="${x(day)}" y1="25" y2="145" stroke="#244957"/><text x="${x(day)}" y="171" text-anchor="middle">${number(day,language)}</text>`;}).join("")}
    ${[[t("Wasser","Water"),model.waterDays,model.plannedWaterDays,55,"#45cde9"],[t("Lebensmittel","Food"),model.foodDays,model.plannedFoodDays,112,"#efbd69"]].map(([label,base,planned,y,color])=>`<text x="0" y="${y+5}" class="twin-track-label">${label}</text><line x1="${left}" x2="${width-right}" y1="${y}" y2="${y}" stroke="#193e4e" stroke-width="20" stroke-linecap="round"/>${base===null?`<text x="${left+12}" y="${y+4}" class="twin-unknown">${t("Angabe fehlt","Not recorded")}</text>`:`<line x1="${left}" x2="${x(base)}" y1="${y}" y2="${y}" stroke="${color}" stroke-width="13" stroke-linecap="round"/>${planned>base?`<line x1="${x(base)}" x2="${x(planned)}" y1="${y}" y2="${y}" stroke="#42dfab" stroke-width="13" stroke-dasharray="5 5"/>`:""}<circle cx="${x(base)}" cy="${y}" r="5" fill="#eefaff"/>`}`).join("")}
    <line x1="${cursor}" x2="${cursor}" y1="10" y2="145" stroke="#f1fbff" stroke-width="2"/><path d="M${cursor-5} 7L${cursor+5} 7L${cursor} 14Z" fill="#f1fbff"/>
  </svg>`;
}
function results(model,language) {
  const t=tr(language), fmt=value=>number(value,language);
  const missing=[];
  if(model.people===null)missing.push(t("Haushaltsgröße","household size"));
  if(model.water===null)missing.push(t("Wasserbestand","water stock"));
  if(model.food===null)missing.push(t("Lebensmittelbestand","food stock"));
  if(model.noCook&&model.ready===null)missing.push(t("Anteil ohne Kochen","share usable without cooking"));
  const next=model.bottleneck==="both"?t("Wasser und Lebensmittel gleichzeitig","Water and food at the same time"):model.bottleneck==="water"?t("Wasser zuerst","Water first"):t("Lebensmittel zuerst","Food first");
  const gained=model.gain===null?"—":duration(model.gain,language);
  const waterFill=model.waterRemaining===null?0:clamp(model.waterRemaining/Math.max(model.water+model.addedWater,1)*100,0,100);
  const gainText=gain=>gain===null?"—":`+ ${duration(gain,language)}`;
  return `<div class="twin-outcome"><div><small>${t("ERSTER RECHNERISCHER ENGPASS","FIRST CALCULATED SHORTFALL")}</small><strong data-twin-first>${model.complete?duration(model.first,language):t("Noch offen","Not calculated yet")}</strong><span>${model.complete?next:`${t("Es fehlt","Missing")}: ${esc(missing.join(" · "))}`}</span></div><div class="twin-outcome-plan"><small>${t("MIT DEINEM PLAN","WITH YOUR PLAN")}</small><strong data-twin-projected>${model.complete?duration(model.plannedFirst,language):"—"}</strong><span>${model.complete?`+ ${gained} ${t("Handlungsspielraum","extra coverage")}`:t("Erst Angaben vervollständigen","Complete the missing information first")}</span></div></div>
    <div class="twin-snapshot"><div class="twin-water-vessel" style="--twin-fill:${waterFill}%" aria-hidden="true"><i></i><span>H₂O</span></div><div><small>${t("ZEITREISE","TIME TRAVEL")} · ${t("TAG","DAY")} ${fmt(model.day)}</small><h3>${t("Was wäre dann noch da?","What would be left?")}</h3><p><b>${model.waterRemaining===null?"—":`${fmt(model.waterRemaining)} L`}</b> ${t("Wasser","water")}<span>·</span><b>${model.foodRemaining===null?"—":duration(model.foodRemaining,language)}</b> ${t("Lebensmittel-Reichweite","food coverage")}</p><small>${t("Mit geplanter Ergänzung · kein tatsächlicher Verbrauch","Including planned additions · no actual consumption recorded")}</small></div></div>
    ${timeline(model,language)}<div class="twin-chart-key"><span><i></i>${t("Erfasster Bestand","Recorded stock")}</span><span><i></i>${t("Geplante Ergänzung","Planned addition")}</span><span>${t("Achse: Tage","Axis: days")}</span></div>
    <div class="twin-next"><h3>${t("Welcher nächste Schritt bringt wirklich etwas?","Which next step actually helps?")}</h3><div class="twin-moves"><button data-twin-action="water" ${!model.complete?"disabled":""}><span>+ 6 L ${t("Wasser","water")}</span><b>${gainText(model.waterGain)}</b><small>${t("bis zum ersten Engpass","until the first shortfall")}</small></button><button data-twin-action="food" ${!model.complete?"disabled":""}><span>+ 1 ${t("Haushaltstag Essen","household-day of food")}</span><b>${gainText(model.foodGain)}</b><small>${t("bis zum ersten Engpass","until the first shortfall")}</small></button></div><p>${t("0 h Gewinn? Dann begrenzt der andere Vorrat weiterhin. Teste die Kombination.","A gain of 0 h? The other supply still limits coverage. Try combining them.")}</p><button class="green twin-balance" data-twin-action="balance" ${!model.complete||model.plannedFirst>=model.target?"disabled":""}>${t("Beide Vorräte bis Tag","Plan both supplies up to day")} ${model.target} →</button></div>
    ${model.water===null||model.food===null?`<div class="twin-record-actions">${model.water===null?`<button class="outline" data-open-supply="water">${t("Wasser erfassen","Record water stock")}</button>`:""}${model.food===null?`<button class="outline" data-open-supply="food">${t("Lebensmittel erfassen","Record food stock")}</button>`:""}</div>`:""}`;
}

export function supplyTwinMarkup(snapshot,plan,language="de") {
  const t=tr(language), model=supplyTwinModel(snapshot,plan);
  return `<section class="supply-twin" data-supply-twin aria-labelledby="supply-twin-title"><header><div><small>${t("DEIN VORRAT · EIN BLICK VORAUS","YOUR SUPPLIES · A LOOK AHEAD")}</small><h2 id="supply-twin-title">${t("Vorrats-Zeitmaschine","Supply Time Machine")}</h2><p>${t("Spiele die nächsten Tage durch. Finde deinen Engpass. Teste, was ihn verschiebt.","Explore the coming days. Find your shortfall. Test what moves it.")}</p></div><span class="twin-local">${t("Lokal berechnet · auch offline","Calculated locally · works offline")}</span></header>
  <div class="twin-workbench"><div class="twin-controls"><div class="twin-mini-preview" data-twin-preview>${t("Simulation: Engpass","Simulation: shortfall")} ${duration(model.first,language)} → ${duration(model.plannedFirst,language)}</div><div class="twin-step"><small>01</small><h3>${t("Dein Szenario","Your scenario")}</h3></div><div class="twin-scenarios" role="group" aria-label="${t("Versorgungsszenario","Supply scenario")}">${[["shopping","Kein Einkauf möglich","No shopping available"],["no-cook","Zusätzlich ohne Herd","Also without a cooker"]].map(([id,de,en])=>`<button data-twin-scenario="${id}" aria-pressed="${plan.scenario===id}">${t(de,en)}</button>`).join("")}</div><p class="twin-household">${model.people===null?t("Haushalt noch nicht eingerichtet","Household not set up"):t(`${model.people} Personen im gespeicherten Haushalt`,`${model.people} people in your saved household`)}</p>
  <label class="twin-field"><span>${t("Zusätzliche Personen","Additional people")}<output data-twin-value="guests">${model.guests}</output></span><input type="range" min="0" max="6" step="1" value="${model.guests}" data-twin-field="guests" aria-label="${t("Zusätzliche Personen","Additional people")}"></label>
  <label class="twin-ready" data-twin-ready ${!model.noCook?"hidden":""}><span>${t("Wie viel Essen ist ohne Kochen nutzbar?","How much food is usable without cooking?")}</span><select data-twin-field="readyPercent"><option value="">${t("Bitte selbst einschätzen","Please estimate")}</option>${[0,25,50,75,100].map(value=>`<option value="${value}" ${plan.readyPercent===value?"selected":""}>${value}%</option>`).join("")}</select></label>
  <div class="twin-step"><small>02</small><h3>${t("Deine Ergänzung testen","Test your additions")}</h3></div><label class="twin-field"><span>${t("Zusätzliches Wasser","Additional water")}<output data-twin-value="water">${number(model.addedWater,language)} L</output></span><input type="range" min="0" max="${Math.max(120,(model.dailyWater||2)*model.target)}" step="0.5" value="${model.addedWater}" data-twin-field="water" aria-label="${t("Geplante zusätzliche Liter Wasser","Planned additional litres of water")}" ${!model.complete?"disabled":""}></label><label class="twin-field"><span>${t("Zusätzliches Essen","Additional food")}<output data-twin-value="food">${number(model.addedFood,language)}</output></span><input type="range" min="0" max="${Math.max(10,Math.ceil(model.target*(model.totalPeople||1)/(model.people||1)))}" step="0.25" value="${model.addedFood}" data-twin-field="food" aria-label="${t("Geplante zusätzliche Haushaltstage Lebensmittel","Planned additional household-days of food")}" ${!model.complete?"disabled":""}></label><p class="twin-control-note" data-twin-food-note>${t("Ein Haushaltstag Essen versorgt euren gespeicherten Haushalt einen Tag. Ergänzungen gelten als ohne Kochen nutzbar.","One household-day of food covers your saved household for one day. Additions are assumed usable without cooking.")}</p>
  <div class="twin-step"><small>03</small><h3>${t("Durch die Zeit reisen","Travel through time")}</h3></div><div class="twin-targets" role="group" aria-label="${t("Planungshorizont in Tagen","Planning horizon in days")}">${[3,7,10].map(day=>`<button data-twin-target="${day}" aria-pressed="${model.target===day}">${day} ${t("Tage","days")}</button>`).join("")}</div><label class="twin-field"><span>${t("Zeitpunkt ansehen","Inspect a moment")}<output data-twin-value="hour">${number(model.day,language)} ${t("Tage","days")}</output></span><input type="range" min="0" max="${model.target*24}" step="6" value="${model.hour}" data-twin-field="hour" aria-label="${t("Simulationszeitpunkt in Stunden","Simulation time in hours")}"></label><button class="twin-reset" data-twin-action="reset">${t("Planung zurücksetzen","Reset planning")}</button></div>
  <div class="twin-results" data-twin-results>${results(model,language)}</div></div><footer><strong>${t("Nur Simulation: Deine Bestände und dein RedScore werden dadurch nicht verändert.","Simulation only: this does not change your stocks or your RedScore.")}</strong><details><summary>${t("Rechenweg & Grenzen ansehen","View calculation and limits")}</summary><p>${t("Wasser: 2 Liter je Person und Tag als Planungswert. Essen: erfasste Haushaltstage × Haushaltsgröße, verteilt auf alle Personen im Szenario. Ohne Herd zählt nur dein selbst geschätzter Anteil; neue Ergänzungen werden als ohne Kochen nutzbar geplant. Fehlende Angaben bleiben offen. Es wird nicht mit kleineren Trinkmengen gerechnet.","Water: a planning rate of 2 litres per person per day. Food: recorded household-days × household size, shared between everyone in the scenario. Without a cooker, only your estimated usable share counts; new additions are planned as usable without cooking. Missing information stays unknown. Drinking quantities are not reduced.")}</p><p>${t("Das Modell betrachtet nur Wasser und Lebensmittel für Personen. Tierbedarf, Medikamente, Hygiene, Allergien, Hitze und besonderer Bedarf sind separat zu prüfen. Es ist eine Rechenhilfe, keine Vorhersage oder Sicherheitsgarantie. Eigene Vorratseinträge werden ohne passende Verbrauchseinheit nicht automatisch eingerechnet.","The model covers water and food for people only. Pet supplies, medication, hygiene, allergies, heat and special needs require separate checks. This is a calculation aid, not a prediction or safety guarantee. Custom inventory items are not automatically counted without a matching consumption unit.")}</p><a href="https://www.bbk.bund.de/DE/Warnung-Vorsorge/Vorsorge/So-koennen-Sie-sich-vorbereiten/Bevorraten/bevorraten.html" target="_blank" rel="noopener noreferrer">${t("BBK: Essen und Trinken bevorraten","BBK: storing food and drinks")} ↗</a></details></footer></section>`;
}

// Keep the controls mounted while dragging sliders; replacing the entire page
// would interrupt pointer capture, keyboard focus and continuous exploration.
export function updateSupplyTwin(root,snapshot,plan,language="de") {
  if(!root)return;
  const model=supplyTwinModel(snapshot,plan),t=tr(language);
  root.querySelector('[data-twin-preview]').textContent=mobilePreview(model,language);
  const active=root.ownerDocument.activeElement;
  const action=active?.dataset?.twinAction;
  root.querySelector('[data-twin-results]').innerHTML=results(model,language);
  for(const field of root.querySelectorAll('[data-twin-field]')){
    const key=field.dataset.twinField;
    if(key==='water')field.max=String(Math.max(120,(model.dailyWater||2)*model.target,model.addedWater));
    if(key==='food')field.max=String(Math.max(10,Math.ceil(model.target*(model.totalPeople||1)/(model.people||1)),model.addedFood));
    if(key==='hour')field.max=String(model.target*24);
    field.value=key==='readyPercent'?(plan.readyPercent??''):String(key==='hour'?model.hour:plan[key]);
    if(['water','food'].includes(key))field.disabled=!model.complete;
  }
  for(const output of root.querySelectorAll('[data-twin-value]')){
    const key=output.dataset.twinValue,value=key==='hour'?model.day:plan[key];
    output.textContent=`${number(value,language)}${key==='water'?' L':key==='hour'?` ${t('Tage','days')}`:''}`;
  }
  root.querySelector('[data-twin-ready]').hidden=!model.noCook;
  for(const button of root.querySelectorAll('[data-twin-scenario]'))button.setAttribute('aria-pressed',String(button.dataset.twinScenario===plan.scenario));
  for(const button of root.querySelectorAll('[data-twin-target]'))button.setAttribute('aria-pressed',String(Number(button.dataset.twinTarget)===model.target));
  if(action)root.querySelector(`[data-twin-action="${action}"]`)?.focus({preventScroll:true});
}
