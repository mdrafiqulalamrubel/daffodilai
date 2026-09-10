import type {Metadata} from 'next';
import './globals.css';
import {SITE_URL} from '@/lib/site';
export const metadata:Metadata={metadataBase:new URL(SITE_URL),title:{default:'Daffodil AI — Intelligence with purpose',template:'%s | Daffodil AI'},description:'Explore Daffodil Group AI products, consultancy, education, research and partnerships. Discover Perfect HR, AI Professor, Eduvas and LeadershipOS.',robots:{index:false,follow:false},openGraph:{siteName:'Daffodil AI',type:'website',title:'Daffodil AI — Intelligence with purpose',description:'AI for the way we learn, work and lead.'},twitter:{card:'summary',title:'Daffodil AI — Intelligence with purpose'},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
