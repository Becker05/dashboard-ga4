export const fields = ['revenue','budget','orders','roas','cpa'];
export function validateGoal(input) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error('Selecione um mês válido.');
  const out = {month: input.month};
  for (const key of fields) {
    const raw = input[key];
    const n = raw === '' || raw == null ? null : Number(raw);
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1e12)) throw new Error('Metas devem ser números não negativos.');
    if (key === 'orders' && n !== null && !Number.isInteger(n)) throw new Error('Pedidos devem ser inteiros.');
    out[key] = n;
  }
  return out;
}
export function monthWindow(month, today) {
  const [y,m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y,m,0)).getUTCDate();
  const startDate = month+'-01';
  const monthEnd = month+'-'+last;
  const yesterday = new Date(today+'T00:00:00Z'); yesterday.setUTCDate(yesterday.getUTCDate()-1);
  const endDate = [monthEnd,yesterday.toISOString().slice(0,10)].sort()[0];
  const elapsed = endDate < startDate ? 0 : Number(endDate.slice(8,10));
  const priorMonth = new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);
  const priorDays = new Date(Date.UTC(y,m-1,0)).getUTCDate();
  return {startDate,endDate,days:last,elapsed,comparison:elapsed ? {startDate:priorMonth+'-01',endDate:priorMonth+'-'+String(Math.min(elapsed,priorDays)).padStart(2,'0')} : null};
}
export function assessment(actual,target,inverse=false) {
  if (actual == null || target == null) return {label:'Sem referência',ratio:null};
  if (target === 0) return {label:actual===0?'Meta zero atendida':inverse?'Acima do limite zero':'Acima da meta zero',ratio:null};
  return {label:inverse?(actual<=target?'Dentro do limite':'Acima do limite'):(actual>=target?'Meta atingida':'Em andamento'),ratio:actual/target};
}
export function legacyProperties(data) {
  let p = data.properties;
  if (p && !Array.isArray(p)) p=[p];
  if (!p?.length && data.propertyId) p=[{id:data.propertyId,nome:data.nome}];
  return (p||[]).filter(x=>/^\d+$/.test(String(x.id))).map(x=>({id:String(x.id),nome:x.nome||String(x.id)}));
}
