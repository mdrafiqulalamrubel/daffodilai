import {NextResponse} from 'next/server';
import {clearSession,safeRelativeReturnPath} from '@/lib/auth';
export async function GET(req:Request){await clearSession();const returnTo=safeRelativeReturnPath(new URL(req.url).searchParams.get('return_to')||'/');return NextResponse.redirect(new URL(returnTo,req.url));}
