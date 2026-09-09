import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

// Exercise the actual route handlers and migration SQL without starting a server.
// Only the platform identity headers, D1 adapter and object storage are substituted.
test('persistent intake, tenant boundaries, roles and external-delivery controls',async(t)=>{
 const root=resolve(import.meta.dirname,'..'),dir=await mkdtemp(join(tmpdir(),'dai-api-'));
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(await readFile(join(root,'drizzle/0000_dashing_lorna_dane.sql'),'utf8'));
 const make=(sql,args=[])=>({
  bind(...values){return make(sql,values)},
  async first(){return sqlite.prepare(sql).get(...args)||null},
  async all(){return {results:sqlite.prepare(sql).all(...args)}},
  async run(){const r=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(r.changes)}}}
 });
 const objects=new Map();
 globalThis.__daiTestEnv={ADMIN_EMAILS:'owner@example.org',DB:{prepare:make,async batch(items){sqlite.exec('BEGIN');try{const results=[];for(const item of items)results.push(await item.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}},BUCKET:{async put(key,bytes){objects.set(key,bytes)},async delete(key){objects.delete(key)},async get(key){const data=objects.get(key);return data?{body:data}:null}}};
 const as=(email=null)=>{globalThis.__daiTestHeaders=new Headers(email?{'oai-authenticated-user-email':email,'oai-authenticated-user-id':'user-'+email}:{});};
 as();
 const routes={};
 for(const name of ['leads','workspace','records','members','tenants','files','mcp','integrations/odoo']){
  const output=join(dir,name.replaceAll('/','-')+'.mjs');
  await build({entryPoints:[join(root,'app/api',name,'route.ts')],outfile:output,bundle:true,format:'esm',platform:'node',target:'node24',logLevel:'silent',tsconfig:join(root,'tsconfig.json'),plugins:[{name:'platform-test-boundary',setup(b){
   b.onResolve({filter:/^(cloudflare:workers|next\/headers|next\/navigation)$/},a=>({path:a.path,namespace:'platform-test'}));
   b.onLoad({filter:/.*/,namespace:'platform-test'},a=>({contents:a.path==='cloudflare:workers'?'export const env=globalThis.__daiTestEnv':a.path==='next/headers'?'export async function headers(){return globalThis.__daiTestHeaders}':'export function redirect(url){throw new Error("Redirect: "+url)}',loader:'js'}));
  }}]});
  routes[name]=await import(pathToFileURL(output));
 }
 const request=(path,method='GET',body,origin='https://daffodil-ai-ecosystem.saburkhan.chatgpt.site')=>new Request('https://daffodil-ai-ecosystem.saburkhan.chatgpt.site/api/'+path,{method,headers:{origin,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const invoke=async(name,method='GET',body,path=name,origin)=>{const r=await routes[name][method](request(path,method,body,origin));return {status:r.status,data:await r.json()}};
 const enquiry={name:'Test Visitor',organization:'Example Institution',email:'visitor@example.org',sector:'Academia',product:'AI Professor',intent:'Book a demo',requirements:'An institutional demonstration',consent:true,requestKey:crypto.randomUUID()};
 let lead,secondTenant,record;
 try{
  await t.test('anonymous users cannot read CRM; consent is required',async()=>{
   assert.equal((await invoke('leads')).status,401);
   assert.equal((await invoke('leads','POST',{...enquiry,consent:false})).status,400);
   assert.equal(sqlite.prepare('SELECT count(*) n FROM leads').get().n,0);
  });
  await t.test('enquiry and delivery queue persist once across an identical retry',async()=>{
   const r=await invoke('leads','POST',enquiry);assert.equal(r.status,201);lead=r.data;
   const retry=await invoke('leads','POST',enquiry);assert.equal(retry.status,200);assert.equal(retry.data.id,lead.id);
   assert.equal(sqlite.prepare('SELECT count(*) n FROM leads').get().n,1);
   assert.equal(sqlite.prepare('SELECT count(*) n FROM outbox').get().n,1);
   assert.equal(sqlite.prepare('SELECT marketing FROM leads').get().marketing,0);
  });
  await t.test('signed-in visitors only see their own submissions and gain no staff access',async()=>{
   as('applicant@example.org');await invoke('leads','POST',{...enquiry,intent:'Student application',requestKey:crypto.randomUUID()});
   const own=await invoke('workspace');assert.equal(own.data.tenants.length,0);assert.equal(own.data.requests.length,1);
   assert.equal((await invoke('leads')).status,403);
   as('other@example.org');assert.equal((await invoke('workspace')).data.requests.length,0);
   assert.equal(sqlite.prepare("SELECT count(*) n FROM records WHERE kind='students'").get().n,1);
  });
  await t.test('only allowlisted owner can create organizations and assign staff',async()=>{
   assert.equal((await invoke('tenants','POST',{name:'Unauthorized'})).status,403);
   as('owner@example.org');const r=await invoke('workspace');assert.equal(r.data.current.role,'Owner');
   const c=await invoke('tenants','POST',{name:'Second Institution'});assert.equal(c.status,201);secondTenant=c.data.id;
   for(const [email,role] of [['sales@example.org','Sales'],['editor@example.org','Editor']])assert.equal((await invoke('members','POST',{tenant_id:'daffodil',email,role})).status,200);
  });
  await t.test('sales can update assigned leads but cannot cross tenant or grant roles',async()=>{
   as('sales@example.org');assert.equal((await invoke('leads')).status,200);
   assert.equal((await invoke('leads','GET',undefined,'leads?tenant='+secondTenant)).status,403);
   assert.equal((await invoke('workspace','GET',undefined,'workspace?tenant='+secondTenant)).status,403);
   assert.equal((await invoke('leads','PATCH',{tenant_id:secondTenant,id:lead.id,stage:'Qualified'})).status,403);
   assert.equal((await invoke('members','POST',{tenant_id:'daffodil',email:'extra@example.org',role:'Admin'})).status,403);
   assert.equal((await invoke('leads','PATCH',{tenant_id:'daffodil',id:lead.id,stage:'Qualified',owner:'Sales lead'})).status,200);
   assert.equal(sqlite.prepare('SELECT stage FROM leads WHERE id=?').get(lead.id).stage,'Qualified');
  });
  await t.test('missing CRM credentials never mark a queued lead as sent',async()=>{
   assert.equal((await invoke('integrations/odoo','POST',{tenant_id:'daffodil',lead_id:lead.id})).status,503);
   assert.equal(sqlite.prepare('SELECT status FROM outbox WHERE lead_id=?').get(lead.id).status,'Pending');
  });
  await t.test('photo upload requires separate permission; card attachment persists privately',async()=>{
   const upload=async(kind)=>{const f=new FormData();f.append('file',new File([new Uint8Array([255,216,255,224])],'card.jpg',{type:'image/jpeg'}));f.append('tenant_id','daffodil');f.append('record_id',lead.id);f.append('kind',kind);return routes.files.POST(new Request(request('files').url,{method:'POST',body:f}));};
   assert.equal((await upload('photo')).status,403);assert.equal(objects.size,0);
   assert.equal((await upload('card')).status,201);assert.equal(objects.size,1);
   as('editor@example.org');assert.equal((await invoke('files','GET',undefined,'files?tenant=daffodil&record='+lead.id)).status,403);
  });
  await t.test('editors can retain research, cannot alter CRM or approve publication',async()=>{
   assert.equal((await invoke('leads')).status,403);
   assert.equal((await invoke('records','POST',{tenant_id:'daffodil',kind:'content',payload:{title:'Review needed',status:'Approved'}})).status,403);
   const r=await invoke('records','POST',{tenant_id:'daffodil',kind:'research',payload:{title:'Research note',status:'Draft',findings:'Source evidence is retained.'}});assert.equal(r.status,201);record=r.data.id;
   const workspace=await invoke('workspace');assert.equal(workspace.data.leads.length,0);assert.equal(workspace.data.records.length,1);
   assert.equal((await invoke('records','PATCH',{tenant_id:'daffodil',kind:'research',id:record,version:1,payload:{title:'Updated research',status:'Review'}})).status,200);
   assert.equal((await invoke('records','PATCH',{tenant_id:'daffodil',kind:'research',id:record,version:1,payload:{title:'Stale overwrite',status:'Review'}})).status,409);
   assert.equal(sqlite.prepare('SELECT title FROM records WHERE id=?').get(record).title,'Updated research');
  });
  await t.test('cross-site mutations and cross-tenant record identifiers are rejected',async()=>{
   assert.equal((await invoke('records','POST',{tenant_id:'daffodil',kind:'research',payload:{title:'Untrusted'}},'records','https://example.net')).status,403);
   as('owner@example.org');assert.equal((await invoke('records','PATCH',{tenant_id:secondTenant,kind:'research',id:record,version:2,payload:{title:'Wrong organization'}})).status,404);
  });
  await t.test('MCP exposes catalogue reads only, without private contact data',async()=>{
   as();const r=await invoke('mcp','POST',{jsonrpc:'2.0',id:1,method:'tools/list'});assert.deepEqual(r.data.result.tools.map(t=>t.name),['list_products','get_product']);
   const catalogue=await invoke('mcp','POST',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_products'}});assert.equal(JSON.parse(catalogue.data.result.content[0].text).length,4);assert.ok(!JSON.stringify(catalogue.data).includes('visitor@example.org'));
   assert.equal((await invoke('mcp','POST',null)).data.error.code,-32600);
  });
 }finally{sqlite.close();await rm(dir,{recursive:true,force:true});delete globalThis.__daiTestEnv;delete globalThis.__daiTestHeaders;}
});
