import {getAuth,GoogleAuthProvider,signInWithCredential,signInWithPopup,signOut} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import {getFirestore,doc,getDoc,getDocs,collection,runTransaction,serverTimestamp,writeBatch,arrayUnion} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {validateGoal,legacyProperties} from './goals-core.mjs';
export function createService(app) {
  const auth=getAuth(app), db=getFirestore(app);
  let isAdmin=false;
  const goalRef=(p,m)=>doc(db,'clients',p.clientId,'properties',p.id,'goals',m);
  return {
    async authenticate(){const provider=new GoogleAuthProvider();provider.addScope('https://www.googleapis.com/auth/analytics.readonly');provider.setCustomParameters({prompt:'select_account'});const result=await signInWithPopup(auth,provider);return {access_token:GoogleAuthProvider.credentialFromResult(result).accessToken,email:result.user.email};},
    async login(accessToken) {
      const result=await signInWithCredential(auth,GoogleAuthProvider.credential(null,accessToken));
      const email=result.user.email;
      if (!result.user.emailVerified) throw new Error('Verifique seu e-mail Google.');
      isAdmin=(await getDoc(doc(db,'platformAdmins',email))).data()?.active===true;
      const directory=await getDoc(doc(db,'users',email));
      if(!directory.exists()) {
        const legacy=await getDoc(doc(db,'allowed_users',email));
        if(!legacy.exists() || ![true,'true'].includes(legacy.data().active)) throw new Error('Acesso não cadastrado ou suspenso.');
        return {allowed:true,email,isAdmin,properties:legacyProperties(legacy.data()).map(p=>({...p,role:'viewer'}))};
      }
      if(directory.data().active!==true) throw new Error('Acesso suspenso.');
      const properties=[];
      for(const clientId of directory.data().clientIds||[]) {
        const membership=await getDoc(doc(db,'clients',clientId,'members',email));
        if(!isAdmin && (!membership.exists() || membership.data().active!==true)) continue;
        const client=await getDoc(doc(db,'clients',clientId));
        if(!client.exists() || !client.data().active) continue;
        const props=await getDocs(collection(db,'clients',clientId,'properties'));
        props.forEach(s=>{if(s.data().active)properties.push({...s.data(),id:s.id,key:clientId+'/'+s.id,clientId,clientName:client.data().name,role:isAdmin?'admin':membership.data().role});});
      }
      return {allowed:true,email,isAdmin,properties};
    },
    logout(){isAdmin=false;return signOut(auth);},
    async load(p,m){const s=await getDoc(goalRef(p,m));return s.exists()?s.data():null;},
    async history(p,m){const s=await getDocs(collection(goalRef(p,m),'history'));return s.docs.map(d=>d.data()).sort((a,b)=>b.version-a.version);},
    async save(p,input,expectedVersion){
      const values=validateGoal(input),ref=goalRef(p,values.month);
      return runTransaction(db,async tx=>{
        const old=await tx.get(ref),version=old.exists()?old.data().version:0;
        if(version!==expectedVersion)throw new Error('Outra pessoa alterou esta meta. Recarregue antes de salvar.');
        const next={...values,version:version+1,updatedBy:auth.currentUser.email,updatedAt:serverTimestamp()};
        tx.set(ref,next);tx.set(doc(collection(ref,'history'),String(next.version)),next);
        return next.version;
      });
    },
    async listClients(){if(!isAdmin)throw new Error('Acesso restrito.');return (await getDocs(collection(db,'clients'))).docs.map(d=>({id:d.id,...d.data()}));},
    async configure({clientId,name,active,plan,propertyId,propertyName,currency,timeZone,email,role,memberActive}){
      if(!isAdmin)throw new Error('Acesso restrito.');
      email=email.trim().toLowerCase();
      if(!/^[a-zA-Z0-9_-]+$/.test(clientId)||!/^\d+$/.test(propertyId))throw new Error('IDs inválidos.');
      if(!['manager','viewer'].includes(role)||!email.includes('@')||email.includes('/'))throw new Error('Usuário ou perfil inválido.');
      new Intl.DateTimeFormat('pt-BR',{timeZone});
      if(!/^[A-Z]{3}$/.test(currency))throw new Error('Moeda inválida.');
      const batch=writeBatch(db);
      batch.set(doc(db,'clients',clientId),{name,active,plan},{merge:true});
      batch.set(doc(db,'clients',clientId,'properties',propertyId),{nome:propertyName,currency,timeZone,configConfirmed:true,active:true},{merge:true});
      batch.set(doc(db,'clients',clientId,'members',email),{role,active:memberActive});
      batch.set(doc(db,'users',email),{active:true,clientIds:arrayUnion(clientId)},{merge:true});
      await batch.commit();
    }
  };
}
