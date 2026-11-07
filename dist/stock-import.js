// Pure review/merge rules. Photos and drafts are never persisted here.
const normalise=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const units={l:'Liter',liter:'Liter',litre:'Liter',litres:'Liter',liters:'Liter',kg:'kg',kilogramm:'kg',kilograms:'kg',g:'g',gramm:'g',stuck:'Stück',stueck:'Stück',pieces:'Stück',piece:'Stück',dosen:'Dosen',cans:'Dosen',flaschen:'Flaschen',bottles:'Flaschen',packungen:'Packungen',packs:'Packungen'};
export const stockUnit=value=>units[normalise(value)]||String(value||'').trim();
const amount=value=>/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(String(value).trim())?Number(String(value).replace(',','.')):NaN;
export function makeStockRows(items,existing=[]){
 return items.map((item,index)=>{
  const unit=stockUnit(item.unit),match=existing.find(old=>normalise(old.label)===normalise(item.label)&&normalise(stockUnit(old.unit))===normalise(unit));
  const water=/^(?:trink|mineral|stilles |drinking )?wasser$|^water$|^mineral water$/i.test(item.label.trim());
  return {...item,index,unit,quantity:item.quantity===null?'':String(item.quantity),litresPerContainer:item.litresPerContainer===null?'':String(item.litresPerContainer),target:match?`custom:${match.id}`:water&&(unit==='Liter'||item.litresPerContainer)?'water':'new',decision:'pending'};
 });
}
export function waterFromRow(row){
 const quantity=amount(row.quantity);
 if(!String(row.quantity).trim()||!Number.isFinite(quantity)||quantity<0)return null;
 if(stockUnit(row.unit)==='Liter')return quantity;
 const size=amount(row.litresPerContainer);
 return size>0&&Number.isFinite(size)&&['Flaschen','Packungen','Kanister','Behälter','Gebinde','containers','bottles'].includes(stockUnit(row.unit))?quantity*size:null;
}
export function planStockImport(rows,existing){
 if(rows.some(row=>row.decision==='pending'))throw Error('pending');
 const accepted=rows.filter(row=>row.decision==='keep');if(!accepted.length)throw Error('empty');
 const entries=existing.map(item=>({...item})),targets=new Set();let water=null;
 for(const row of accepted){
  const quantity=amount(row.quantity);
  if(!row.label.trim()||row.label.length>80||!row.unit.trim()||!String(row.quantity).trim()||!Number.isFinite(quantity)||quantity<0||quantity>999999)throw Error('invalid');
  if(row.target==='water'){
   const litres=waterFromRow(row);if(litres===null)throw Error('water');water=(water??0)+litres;if(water>1000)throw Error('water');continue;
  }
  const index=row.target.startsWith('custom:')?entries.findIndex(item=>item.id===row.target.slice(7)):-1;
  if(row.target!=='new'&&index<0)throw Error('target');
  if(index>=0&&targets.has(row.target))throw Error('duplicate');targets.add(row.target);
  const now=new Date().toISOString();
  const entry={...(index>=0?entries[index]:{}),label:row.label.trim(),quantity,unit:stockUnit(row.unit),category:['Versorgung','Gesundheit','Haushalt','Sonstiges'].includes(row.category)?row.category:'Sonstiges',note:(row.note.trim()||(index>=0?entries[index].note:'')||'').slice(0,160),createdAt:index>=0?entries[index].createdAt:now,updatedAt:now};
  if(index>=0)entries[index]=entry;else entries.push(entry);
 }
 if(entries.length>100)throw Error('capacity');
 return {entries,water,accepted:accepted.length};
}
