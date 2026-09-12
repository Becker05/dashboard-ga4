// Defaults to read-only dry run. --apply creates new documents atomically, never overwrites.
// Backups contain customer configuration and must stay in .private (gitignored).
const fs=require('node:fs'),path=require('node:path');
const auth=require(path.join(process.env.APPDATA,'npm/node_modules/firebase-tools/lib/auth.js'));
const project='dashboard-ga4-98b00';
const encode=v=>v===null?{nullValue:null}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:typeof v==='string'?{stringValue:v}:Array.isArray(v)?{arrayValue:{values:v.map(encode)}}:{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,v])=>[k,encode(v)]))}};
const decode=v=>'stringValue'in v?v.stringValue:'booleanValue'in v?v.booleanValue:'integerValue'in v?Number(v.integerValue):v.arrayValue?(v.arrayValue.values||[]).map(decode):v.mapValue?Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,v])=>[k,decode(v)])):null;
(async()=>{
 const {legacyProperties}=await import('../goals-core.mjs');
 const account=auth.getGlobalDefaultAccount();if(!account)throw Error('Login Firebase necessário.');
 const token=await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform']);
 async function request(url,method='GET',body){const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('HTTP '+r.status+' em '+url);return r.json();}
 const root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
 const legacy=await request(root+'/allowed_users?pageSize=100');if(legacy.nextPageToken)throw Error('Mais de 100 cadastros: paginar antes da migração.');
 const planned=new Map();
 const add=(p,data)=>planned.set(p,data);
 for(const doc of legacy.documents||[]){const email=decodeURIComponent(doc.name.split('/').pop()),d=decode({mapValue:{fields:doc.fields}}),properties=legacyProperties(d),active=[true,'true'].includes(d.active);
  if(!properties.length)throw Error('Cadastro sem propriedades válidas. Corrigir antes da migração.');
  const clientIds=[];
  for(const p of properties){const c='ga4-'+p.id;clientIds.push(c);if(!planned.has('clients/'+c))add('clients/'+c,{name:p.nome,active:true,plan:'report'});
   add(`clients/${c}/properties/${p.id}`,{nome:p.nome,active:true,currency:'BRL',timeZone:'America/Sao_Paulo',configConfirmed:false,costCoverage:false});
   add(`clients/${c}/members/${email}`,{active,role:'viewer'});
  }
  add('users/'+email,{active,clientIds});
 }
 // Bootstrap only the already authenticated project operator, never a hard-coded client.
 const owner=account.user.email;
 add('platformAdmins/'+owner,{active:true});
 const existingOwner=planned.get('users/'+owner);
 add('users/'+owner,{active:true,clientIds:[...new Set([...(existingOwner?.clientIds||[]),...[...planned.keys()].filter(k=>/^clients\/[^/]+$/.test(k)).map(k=>k.split('/')[1])])]});
 const release=await request(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
 const rules=await request('https://firebaserules.googleapis.com/v1/'+release.rulesetName);
 const config=await request(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`);
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',legacyUsers:legacy.documents.length,clients:[...planned.keys()].filter(k=>/^clients\/[^/]+$/.test(k)).length,documents:planned.size,roles:'legacy viewers; project operator admin',addDomain:!config.authorizedDomains.includes('app.ad5experts.online')}));
 if(!process.argv.includes('--apply'))return;
 fs.mkdirSync('.private',{recursive:true});const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 fs.writeFileSync(`.private/migration-${stamp}.json`,JSON.stringify({legacy,ruleSource:rules.source,ruleRelease:release,authorizedDomains:config.authorizedDomains,createdPaths:[...planned.keys()]},null,2));
 const writes=[...planned].map(([p,d])=>({update:{name:`projects/${project}/databases/(default)/documents/${p}`,fields:encode(d).mapValue.fields},currentDocument:{exists:false}}));
 await request(root+':commit','POST',{writes});
 if(!config.authorizedDomains.includes('app.ad5experts.online'))await request(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config?updateMask=authorizedDomains`,'PATCH',{authorizedDomains:[...config.authorizedDomains,'app.ad5experts.online']});
 console.log('Migração concluída; cadastros legados preservados; backup privado salvo. Regras ainda precisam de implantação.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
