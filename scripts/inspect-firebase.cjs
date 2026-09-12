// Read-only inspection using the already authenticated Firebase CLI. Never prints tokens.
const path = require('node:path');
const auth = require(path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib/auth.js'));
const project = 'dashboard-ga4-98b00';
(async () => {
  const account = auth.getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase CLI login required');
  const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const get = async url => {
    const r = await fetch(url, {headers: {Authorization: 'Bearer '+token.access_token}});
    if (!r.ok) throw new Error('HTTP '+r.status+' '+url);
    return r.json();
  };
  const release = await get(`https://firebaserules.googleapis.com/v1/projects/${project}/releases/cloud.firestore`);
  const rules = await get('https://firebaserules.googleapis.com/v1/'+release.rulesetName);
  const config = await get(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`);
  const providers=await get(`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/defaultSupportedIdpConfigs`);
  const users = await get(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/allowed_users?pageSize=100`);
  console.log(JSON.stringify({rules:rules.source,authorizedDomains:config.authorizedDomains,providers:(providers.defaultSupportedIdpConfigs||[]).map(p=>({name:p.name,enabled:p.enabled,clientId:p.clientId})),legacyUsers:(users.documents||[]).map(d=>({fields:Object.keys(d.fields),properties:d.fields.properties,propertyId:d.fields.propertyId,active:d.fields.active})),hasMore:!!users.nextPageToken},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
