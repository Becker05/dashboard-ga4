const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const assert=require('node:assert/strict');

(async()=>{
  const html=fs.readFileSync('index.html','utf8');
  const script=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].find(m=>m[2].includes("const CLIENT_ID="))[2];
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<table><tbody id="tBody"></tbody></table><span id="tCount"></span><table><tbody id="attrFirstBody"></tbody></table><table><tbody id="attrAuditBody"></tbody></table>');
    await page.addScriptTag({content:'window.Chart=function(){};Chart.register=function(){};window.ChartDataLabels={};window.Sortable={create:function(){}};window.DOMPurify={sanitize:function(x){return x}};'});
    await page.addScriptTag({content:script});
    await page.evaluate(()=>{
      renderTable([{sessionsource:'meta',sessioncampaignname:'campanha A',purchaserevenue:100,advertiseradcost:25,ecommercepurchases:2,sessions:10}]);
      renderAttrRows('attrFirstBody',[{attrfirstsource:'meta',attrfirstmedium:'paid_social',attrfirstcampaign:'campanha A',ecommercepurchases:2,purchaserevenue:100}],'first');
      renderAttrRows('attrAuditBody',[{sessionsource:'google',sessionmedium:'organic',attrlastsource:'meta',attrlastmedium:'paid_social',attrlastcampaign:'campanha A',ecommercepurchases:2,purchaserevenue:100}],'audit');
    });
    assert.equal(await page.locator('#tBody tr').count(),1);assert.equal(await page.locator('#tBody td').count(),8);
    assert.match(await page.locator('#tBody').innerText(),/meta\s+campanha A\s+R\$\s*100,00/);
    assert.equal(await page.locator('#attrFirstBody td').count(),4);assert.match(await page.locator('#attrFirstBody').innerText(),/meta \/ paid_social/);
    assert.equal(await page.locator('#attrAuditBody td').count(),5);assert.match(await page.locator('#attrAuditBody').innerText(),/google \/ organic\s+meta \/ paid_social/);
    assert.deepEqual(errors,[]);console.log('Report DOM OK: executive and attribution tables preserve rows and cells.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
