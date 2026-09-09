import {products,pipeline} from '@/lib/catalog';
export async function GET(){return Response.json({version:'1.0',products:products.map(({id,name,category,summary,stage,source})=>({id,name,category,summary,stage,source})),pipeline},{headers:{'Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff'}});}
