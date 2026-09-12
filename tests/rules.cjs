const {test,before,after}=require('node:test');
const fs=require('node:fs');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,writeBatch,serverTimestamp}=require('firebase/firestore');
let env;
before(async()=>{
 env=await initializeTestEnvironment({projectId:'demo-dashboard-ga4',firestore:{host:'127.0.0.1',port:8085,rules:fs.readFileSync('firestore.rules','utf8')}});
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();for(const c of ['a','b']){await setDoc(doc(db,'clients',c),{active:true});await setDoc(doc(db,'clients',c,'properties','123'),{active:true});}await setDoc(doc(db,'clients','a','members','manager@test.com'),{active:true,role:'manager'});await setDoc(doc(db,'clients','a','members','viewer@test.com'),{active:true,role:'viewer'});});
 await env.withSecurityRulesDisabled(async ctx=>{for(const email of ['manager@test.com','viewer@test.com'])await setDoc(doc(ctx.firestore(),'users',email),{active:true});});
});
after(async()=>env?.cleanup());
const dbFor=email=>env.authenticatedContext(email,{email,email_verified:true}).firestore();
const value=email=>({month:'2026-09',revenue:100,budget:null,orders:1,roas:null,cpa:null,version:1,updatedBy:email,updatedAt:serverTimestamp()});
test('anônimo e cliente alheio não podem ler',async()=>{await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'clients','a','properties','123','goals','2026-09')));await assertFails(getDoc(doc(dbFor('manager@test.com'),'clients','b','properties','123','goals','2026-09')));});
test('viewer lê mas não grava',async()=>{const db=dbFor('viewer@test.com');await assertSucceeds(getDoc(doc(db,'clients','a','properties','123','goals','2026-09')));await assertFails(setDoc(doc(db,'clients','a','properties','123','goals','2026-09'),value('viewer@test.com')));});
test('gestor exige histórico atômico e não pode promover a si mesmo',async()=>{const db=dbFor('manager@test.com'),ref=doc(db,'clients','a','properties','123','goals','2026-09');await assertFails(setDoc(ref,value('manager@test.com')));const b=writeBatch(db),v=value('manager@test.com');b.set(ref,v);b.set(doc(ref,'history','1'),v);await assertSucceeds(b.commit());await assertFails(setDoc(doc(db,'platformAdmins','manager@test.com'),{active:true}));await assertFails(setDoc(doc(ref,'history','1'),v));});
test('versão seguinte aceita; versão antiga e meta negativa rejeitadas',async()=>{const db=dbFor('manager@test.com'),ref=doc(db,'clients','a','properties','123','goals','2026-09');const b=writeBatch(db),v={...value('manager@test.com'),version:2};b.set(ref,v);b.set(doc(ref,'history','2'),v);await assertSucceeds(b.commit());const stale=writeBatch(db);stale.set(ref,v);stale.set(doc(ref,'history','2'),v);await assertFails(stale.commit());const bad=writeBatch(db),invalid={...v,version:3,revenue:-1};bad.set(ref,invalid);bad.set(doc(ref,'history','3'),invalid);await assertFails(bad.commit());});
test('suspensão bloqueia acesso direto e e-mail não verificado',async()=>{await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'clients','a','members','viewer@test.com'),{active:false,role:'viewer'}));await assertFails(getDoc(doc(dbFor('viewer@test.com'),'clients','a','properties','123','goals','2026-09')));await assertFails(getDoc(doc(env.authenticatedContext('x',{email:'manager@test.com',email_verified:false}).firestore(),'clients','a','properties','123','goals','2026-09')));});
