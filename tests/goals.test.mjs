import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateGoal,monthWindow,assessment,legacyProperties,pacing,monthlyActual} from '../goals-core.mjs';
test('ausência não é zero e pedidos não aceitam fração',()=>{
  const g=validateGoal({month:'2026-09',revenue:'',budget:0});assert.equal(g.revenue,null);assert.equal(g.budget,0);
  assert.throws(()=>validateGoal({month:'2026-09',orders:2.4}));assert.throws(()=>validateGoal({month:'2026-13'}));assert.throws(()=>validateGoal({month:'2026-09',revenue:-1}));
});
test('primeiro dia, fevereiro bissexto e mês futuro',()=>{
  assert.equal(monthWindow('2026-09','2026-09-01').elapsed,1);
  assert.equal(monthWindow('2024-02','2024-03-01').days,29);
  assert.equal(monthWindow('2026-10','2026-09-12').elapsed,0);
  assert.deepEqual(monthWindow('2026-09','2026-09-12').comparison,{startDate:'2026-08-01',endDate:'2026-08-12'});
});
test('ritmo mensal inclui hoje e índices não sofrem rateio',()=>{
 const w=monthWindow('2026-09','2026-09-12');
 assert.deepEqual(pacing(3270.15,18000,'revenue',w),{expected:7200,deviation:3270.15-7200});
 assert.equal(pacing(10,40,'orders',w).expected,16);
 assert.equal(pacing(800,3500,'budget',w).expected,1400);
 assert.equal(pacing(3,5,'roas',w).expected,5);
 assert.equal(pacing(70,60,'cpa',w).deviation,10);
 assert.equal(pacing(0,100,'revenue',monthWindow('2026-10','2026-09-12')).expected,null);
 assert.equal(monthWindow('2026-08','2026-09-12').elapsed,31);
 assert.equal(monthlyActual(500,2,100).roas,5);
 assert.equal(monthlyActual(500,2,100).cpa,50);
 assert.equal(monthlyActual(500,2,null).cpa,null);
 assert.equal(monthlyActual(500,0,100).cpa,null);
 assert.equal(monthlyActual(500,2,0).roas,null);
});
test('sem custo não produz avaliação e limite zero não divide por zero',()=>{
  assert.equal(assessment(null,4).ratio,null);assert.equal(assessment(10,null).label,'Sem referência');assert.equal(assessment(1,0,true).ratio,null);
});
test('migração aceita mapas legados e descarta IDs inválidos',()=>{
  assert.deepEqual(legacyProperties({properties:{id:123,nome:'A'}}),[{id:'123',nome:'A'}]);assert.deepEqual(legacyProperties({properties:[{id:'bad'}]}),[]);
});
