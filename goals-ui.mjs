import {fields,monthWindow,assessment,pacing,monthlyActual} from './goals-core.mjs';
const labels={revenue:'Receita',budget:'Orçamento de mídia',orders:'Pedidos',roas:'ROAS mínimo',cpa:'CPA máximo'};
export function mountGoals(service){
  let panel,p=null,token='',version=0,generation=0,access=null,goal=null,actual=null,previous=null,period=null;
  const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;Object.assign(n,attrs);return n;};
  const input=(type,value='')=>el('input',null,{type,value});
  const status=el('p','', {className:'attr-note',role:'status'});
  const month=input('month');
  const controls={},form=el('form'),summary=el('div'),history=el('details'),save=el('button','Salvar metas',{type:'submit',className:'btn'});
  const copy=el('button','Copiar mês anterior',{type:'button',className:'btn'});
  const refresh=el('button','Recarregar',{type:'button',className:'btn'});
  const title=el('h2','Metas e resultado mensal');
  const scope=el('p','',{className:'attr-note'});
  const editFields=el('fieldset');
  function build(){
    panel=el('section',null,{className:'tcard',hidden:true});panel.id='goalsPanel';
    panel.append(title,scope,el('p','Realizado do mês selecionado: mês atual até hoje, mês passado completo. Hoje é parcial e o GA4 pode atualizar os valores depois. Os filtros dos demais gráficos não alteram esta visão.',{className:'attr-note'}),month,refresh,status,summary);
    const row=el('div',null,{className:'sgrid'});
    for(const key of fields){const label=el('label',labels[key]);controls[key]=input('number');controls[key].min='0';controls[key].step=key==='orders'?'1':'any';controls[key].style.cssText='width:100%;padding:9px;margin-top:6px';label.append(controls[key]);row.append(label);}
    editFields.style.cssText='border:0;border-top:1px solid var(--border);margin-top:18px;padding-top:16px';
    save.style.cssText='background:var(--accent);color:white;margin:14px 8px 10px 0';
    copy.style.cssText='background:var(--bg);color:var(--text);border:1px solid var(--border)';
    month.style.cssText='padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);margin:10px 8px 10px 0';
    refresh.style.cssText='background:var(--bg);color:var(--text);border:1px solid var(--border)';
    editFields.append(row,save,copy);form.append(editFields);panel.append(form,history);
    document.querySelector('#filterCard').after(panel);
    month.addEventListener('change',load);refresh.onclick=load;
    form.onsubmit=async e=>{e.preventDefault();const run=generation,target=p,m=month.value;save.disabled=true;try{
      const payload={month:m};for(const f of fields)payload[f]=controls[f].value;
      await service.save(target,payload,version);
      if(run===generation){await load();status.textContent='Meta salva. O histórico registra autor e versão.';}
    }catch(e){if(run===generation)status.textContent=e.message;}finally{if(run===generation)save.disabled=false;}};
    copy.onclick=async()=>{const run=generation;try{const [y,m]=month.value.split('-').map(Number);const old=await service.load(p,new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7));if(run!==generation)return;if(!old)throw new Error('Não há meta no mês anterior.');fields.forEach(f=>controls[f].value=old[f]??'');status.textContent='Valores copiados. Clique em Salvar para confirmar.';}catch(e){if(run===generation)status.textContent=e.message;}};
  }
  async function report(range){
    const target=p;
    const accessToken=token;
    async function query(names,dimensions=[]){
    const r=await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${target.id}:runReport`,{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({dateRanges:[range],dimensions:dimensions.map(name=>({name})),metrics:names.map(name=>({name})),limit:'100000'})});
    const json=await r.json();if(!r.ok)throw new Error(json.error?.message||'Erro ao consultar GA4.');
    return json.rows||[];
    }
    const [base,cost]=await Promise.allSettled([query(['purchaseRevenue','ecommercePurchases']),query(['advertiserAdCost'],['sessionSource'])]);
    if(base.status==='rejected')throw base.reason;
    const baseValues=base.value[0]?.metricValues?.map(v=>Number(v.value))||[0,0];
    const costValue=cost.status==='fulfilled'?cost.value.reduce((sum,row)=>sum+Number(row.metricValues?.[0]?.value||0),0):null;
    return {...monthlyActual(baseValues[0],baseValues[1],costValue),costError:cost.status==='rejected'?cost.reason.message:null};
  }
  function format(v,key){if(v==null)return 'Indisponível';if(key==='roas')return v.toFixed(2)+'x';if(key==='orders')return new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}).format(v);return new Intl.NumberFormat('pt-BR',{style:'currency',currency:p.currency}).format(v);}
  function direction(key,current,reference){
    if(current==null||reference==null)return {className:'rn',arrow:'',change:null};
    const diff=current-reference,inverse=['budget','cpa'].includes(key),good=Math.abs(diff)<1e-9||(!inverse&&diff>0)||(inverse&&diff<0);
    return {className:Math.abs(diff)<1e-9?'rg':good?'rg':'rr',arrow:diff>0?'▲':diff<0?'▼':'●',change:reference!==0?Math.abs(diff/reference)*100:null};
  }
  function render(){
    summary.replaceChildren();
    const table=el('table'),head=el('tr'),thead=el('thead'),tbody=el('tbody');['Indicador','Realizado no mês','Meta do mês','Atingimento / limite mensal','Esperado até a data','Desvio vs. esperado','Período anterior equivalente'].forEach(x=>head.append(el('th',x)));thead.append(head);table.append(thead,tbody);
    fields.forEach(key=>{
      const v=actual?.[key],target=goal?.[key],a=assessment(v,target,['budget','cpa'].includes(key)),pace=pacing(v,target,key,period),tr=el('tr');
      [labels[key],format(v,key),target==null?'Não definida':format(target,key),a.ratio==null?a.label:(100*a.ratio).toFixed(1)+'% — '+a.label,pace.expected==null?'—':format(pace.expected,key)].forEach(x=>tr.append(el('td',x)));
      const deviation=direction(key,v,pace.expected),devCell=el('td',pace.deviation==null?'—':`${deviation.arrow} ${format(Math.abs(pace.deviation),key)}`,{className:deviation.className});tr.append(devCell);
      const prior=previous?.[key],trend=direction(key,v,prior),priorText=prior==null?'Indisponível':`${format(prior,key)} · ${trend.arrow}${trend.change==null?'':` ${trend.change.toFixed(1)}%`}`;tr.append(el('td',priorText,{className:trend.className}));
      tbody.append(tr);
    });
    const wrap=el('div',null,{className:'twrap'});wrap.append(table);summary.append(wrap);
    summary.append(el('p','Fonte do gasto: advertiserAdCost do GA4, consultado no mesmo período da receita e dos pedidos. ROAS deste resumo = receita total de compras ÷ gasto disponível; CPA = gasto disponível ÷ compras. Não são métricas atribuídas a uma campanha.',{className:'attr-note'}));
    if(actual?.costError)summary.append(el('p','Falha ao consultar custo: '+actual.costError,{className:'attr-note'}));
    else if(actual?.budget===0)summary.append(el('p','O GA4 retornou custo zero neste período; confira as integrações/importações. Zero retornado não comprova ausência de investimento. ROAS não pode ser calculado sem custo positivo.',{className:'attr-note'}));
    summary.append(el('p','Esperado = meta mensal × dias considerados ÷ dias do mês para receita, gasto e pedidos. ROAS e CPA mantêm seus limites sem rateio. Desvio = realizado − esperado; gasto acima do ritmo não significa necessariamente eficiência pior.',{className:'attr-note'}));
    if(period?.elapsed&&actual){summary.append(el('p',`Estimativa linear de receita ao fechar o mês: ${format(actual.revenue/period.elapsed*period.days,'revenue')}. Base: ${period.elapsed} dias considerados, incluindo hoje se mês atual; valor provisório, sem sazonalidade.`,{className:'attr-note'}));}
  }
  async function load(){
    const run=++generation;version=0;goal=actual=previous=null;history.replaceChildren();fields.forEach(f=>controls[f].value='');summary.replaceChildren();editFields.disabled=true;status.textContent='Carregando metas e resultados…';
    if(!p?.clientId){status.textContent='Cadastro legado: o administrador precisa vincular esta propriedade a um cliente para habilitar metas.';return;}
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month.value)){status.textContent='Selecione um mês.';return;}
    try{
      if(!p.configConfirmed){
        const target=p;
        const r=await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${p.id}`,{headers:{Authorization:'Bearer '+token}});
        if(!r.ok)throw new Error('Confirme moeda e fuso da propriedade na Administração antes de usar metas.');
        const metadata=await r.json();if(run!==generation)return;
        target.currency=metadata.currencyCode;target.timeZone=metadata.timeZone;target.configConfirmed=true;
      }
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:p.timeZone||'America/Sao_Paulo'}).format(new Date());
      period=monthWindow(month.value,today);
      const result=await Promise.allSettled([service.load(p,month.value),period.elapsed?report({startDate:period.startDate,endDate:period.endDate}):Promise.resolve(null),period.comparison?report(period.comparison):Promise.resolve(null),service.history(p,month.value)]);
      if(run!==generation)return;
      if(result[0].status==='rejected')throw result[0].reason;
      goal=result[0].value;version=goal?.version||0;fields.forEach(f=>controls[f].value=goal?.[f]??'');
      actual=result[1].status==='fulfilled'?result[1].value:null;previous=result[2].status==='fulfilled'?result[2].value:null;
      editFields.disabled=!['manager','admin'].includes(p.role);
      save.disabled=false;
      status.textContent=`${p.currency} · ${p.timeZone} · ${period.elapsed?'Resultados de '+period.startDate+' até '+period.endDate:'Mês futuro: sem realizado'} · ${p.role==='viewer'?'Somente leitura':'Edição autorizada'}`;
      if(result[1].status==='rejected')status.textContent+=' · Resultado GA4 indisponível: '+result[1].reason.message;
      if(result[2].status==='rejected')status.textContent+=' · Comparação indisponível.';
      history.append(el('summary','Histórico de alterações'));
      if(result[3].status==='fulfilled')result[3].value.forEach(h=>{const line=el('p',`Versão ${h.version} · ${h.updatedBy} · ${h.updatedAt?.toDate?.().toLocaleString('pt-BR')||''}`);history.append(line);fields.forEach(f=>history.append(el('span',`${labels[f]}: ${h[f]==null?'não definida':format(h[f],f)}; `)));});
      else history.append(el('p','Histórico indisponível.'));
      render();
    }catch(e){if(run===generation)status.textContent=e.message;}
  }
  window.addEventListener('dashboard-access',e=>{access=e.detail;document.getElementById('adminPanel')?.remove();if(access.isAdmin)mountAdmin();});
  window.addEventListener('dashboard-property',e=>{if(!panel)build();p=e.detail.property;token=e.detail.token;panel.hidden=false;scope.textContent=(p?.clientName||'Cliente')+' / '+(p?.nome||'')+' · GA4 '+p?.id;if(!month.value)month.value=new Intl.DateTimeFormat('en-CA',{timeZone:p?.timeZone||'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);load();});
  window.addEventListener('dashboard-logout',()=>{generation++;p=null;token='';goal=actual=previous=null;if(panel){panel.hidden=true;summary.replaceChildren();history.replaceChildren();fields.forEach(f=>controls[f].value='');}document.getElementById('adminPanel')?.remove();});
  function mountAdmin(){
    if(document.getElementById('adminPanel'))return;
    const box=el('details',null,{className:'tcard',id:'adminPanel'});box.append(el('summary','Administração de clientes e acessos — somente administrador da plataforma'));
    const note=el('p','Selecione um cliente para editar ou preencha um novo ID. Um usuário pode ser associado a vários clientes.',{className:'attr-note'}),select=el('select'),f=el('form'),inputs={},message=el('p','',{role:'status'});
    select.append(el('option','Novo cliente',{value:''}));
    service.listClients().then(clients=>{clients.forEach(c=>select.append(el('option',c.name,{value:c.id})));select.onchange=()=>{const c=clients.find(x=>x.id===select.value);if(c){inputs.clientId.value=c.id;inputs.name.value=c.name;inputs.active.checked=c.active;inputs.plan.value=c.plan||'report';}};}).catch(e=>message.textContent=e.message);
    const defs={clientId:'ID do cliente',name:'Nome do cliente',plan:'Plano',propertyId:'ID GA4',propertyName:'Nome da propriedade',currency:'Moeda (ex.: BRL)',timeZone:'Fuso (ex.: America/Sao_Paulo)',email:'E-mail do usuário'};
    const grid=el('div',null,{className:'sgrid'});
    Object.entries(defs).forEach(([k,label])=>{const l=el('label',label);inputs[k]=input(k==='email'?'email':'text');inputs[k].required=true;inputs[k].style.cssText='width:100%;padding:8px';l.append(inputs[k]);grid.append(l);});
    inputs.role=el('select');inputs.role.append(el('option','Visualizador',{value:'viewer'}),el('option','Gestor — edita metas',{value:'manager'}));grid.append(inputs.role);
    for(const [k,text] of [['active','Cliente ativo'],['memberActive','Usuário ativo neste cliente']]){inputs[k]=input('checkbox');inputs[k].checked=true;const label=el('label',text);label.prepend(inputs[k]);grid.append(label);}
    const submit=el('button','Salvar cadastro',{type:'submit',className:'btn'});f.append(grid,submit);f.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{const d={};Object.entries(inputs).forEach(([k,i])=>d[k]=i.type==='checkbox'?i.checked:i.value.trim());await service.configure(d);message.textContent='Cadastro salvo. Entre novamente para atualizar a lista de propriedades.';}catch(e){message.textContent=e.message;}finally{submit.disabled=false;}};
    box.append(note,select,f,message);document.querySelector('.app').append(box);
  }
}
