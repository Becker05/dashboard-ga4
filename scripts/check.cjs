const fs=require('node:fs'),acorn=require('acorn');
const html=fs.readFileSync('index.html','utf8');
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))acorn.parse(m[2],{ecmaVersion:'latest',sourceType:m[1].includes('module')?'module':'script'});
for(const f of ['goals-core.mjs','goals-service.mjs','goals-ui.mjs','sw.js'])acorn.parse(fs.readFileSync(f,'utf8'),{ecmaVersion:'latest',sourceType:'module'});
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)throw Error('IDs HTML duplicados');
console.log('JavaScript/HTML checks passed.');
