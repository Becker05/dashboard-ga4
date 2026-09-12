// Emits a patch; does not modify files. DOM values remain raw for charts and filters.
const fs=require('node:fs'),acorn=require('acorn');
const html=fs.readFileSync('index.html','utf8');let out=html;
const edits=[];
for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 const offset=m.index+m[0].indexOf('>')+1;
 const ast=acorn.parse(m[2],{ecmaVersion:'latest',sourceType:m[1].includes('module')?'module':'script'});
 const walk=n=>{if(!n||typeof n!=='object')return;
  if(n.type==='AssignmentExpression'&&n.left.type==='MemberExpression'&&n.left.property.name==='innerHTML'&&n.right.type!=='Literal'&&!(n.right.type==='CallExpression'&&n.right.callee.name==='safeHtml')){edits.push({start:offset+n.right.start,end:offset+n.right.end});}
  for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 };walk(ast);
}
for(const e of edits.sort((a,b)=>b.start-a.start))out=out.slice(0,e.start)+'safeHtml('+out.slice(e.start,e.end)+')'+out.slice(e.end);
if(out!==html)console.log('*** Begin Patch\n*** Update File: index.html\n@@\n-'+html.trimEnd().split(/\r?\n/).join('\n-')+'\n+'+out.trimEnd().split(/\r?\n/).join('\n+')+'\n*** End Patch');
