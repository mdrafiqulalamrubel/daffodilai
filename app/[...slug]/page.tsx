import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {PublicSite} from '@/components/website';
import {products,insights,routeTitles} from '@/lib/catalog';
type Props={params:Promise<{slug:string[]}>;searchParams:Promise<{lang?:string}>};
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{const {slug}=await params,q=await searchParams;const route='/'+slug.join('/');const p=products.find(p=>route==='/solutions/'+p.id),a=insights.find(a=>route==='/insights/'+a.id);const i=q.lang==='bn'?1:0;const title=p?.name||a?.title[i]||routeTitles[route]||'Daffodil AI';const description=p?.summary[i]||a?.summary[i]||'Daffodil AI products, services, research and practical opportunities.';return {title,description,alternates:{canonical:route+(q.lang==='bn'?'?lang=bn':''),languages:{en:route,bn:route+'?lang=bn'}},openGraph:{title,description,url:route},twitter:{title,description}};}
export default async function Page({params,searchParams}:Props){const {slug}=await params,q=await searchParams,route='/'+slug.join('/');if(!routeTitles[route]&&!products.some(p=>route==='/solutions/'+p.id)&&!insights.some(a=>route==='/insights/'+a.id))notFound();return <PublicSite route={route} initialLang={q.lang==='bn'?'bn':'en'}/>;}
