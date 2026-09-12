import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateGoal,monthWindow,assessment,legacyProperties} from '../goals-core.mjs';
test('ausência não é zero e pedidos não aceitam fração',()=>{
  const g=validateGoal({month:'2026-09',revenue:'',budget:0});assert.equal(g.revenue,null);assert.equal(g.budget,0);
  assert.throws(()=>validateGoal({month:'2026-09',orders:2.4}));assert.throws(()=>validateGoal({month:'2026-13'}));assert.throws(()=>validateGoal({month:'2026-09',revenue:-1}));
});
test('primeiro dia, fevereiro bissexto e mês futuro',()=>{
  assert.equal(monthWindow('2026-09','2026-09-01').elapsed,0);
  assert.equal(monthWindow('2024-02','2024-03-01').days,29);
  assert.equal(monthWindow('2026-10','2026-09-12').elapsed,0);
  assert.deepEqual(monthWindow('2026-09','2026-09-12').comparison,{startDate:'2026-08-01',endDate:'2026-08-11'});
});
test('sem custo não produz avaliação e limite zero não divide por zero',()=>{
  assert.equal(assessment(null,4).ratio,null);assert.equal(assessment(10,null).label,'Sem referência');assert.equal(assessment(1,0,true).ratio,null);
});
test('migração aceita mapas legados e descarta IDs inválidos',()=>{
  assert.deepEqual(legacyProperties({properties:{id:123,nome:'A'}}),[{id:'123',nome:'A'}]);assert.deepEqual(legacyProperties({properties:[{id:'bad'}]}),[]);
});
