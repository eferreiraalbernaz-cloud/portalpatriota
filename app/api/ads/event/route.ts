import {NextRequest,NextResponse} from 'next/server';
import {isSameOrigin} from '@/lib/admin-auth';
import {verifyAdToken} from '@/lib/ads/metrics';
import {createServiceSupabaseClient} from '@/lib/supabase/server';
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return new NextResponse(null,{status:403});
 if(Number(request.headers.get('content-length')||0)>2048)return new NextResponse(null,{status:413});
 const reader=request.body?.getReader();if(!reader)return new NextResponse(null,{status:400});
 let raw='';const decoder=new TextDecoder();while(true){const part=await reader.read();if(part.done)break;raw+=decoder.decode(part.value,{stream:true});if(raw.length>2048){await reader.cancel();return new NextResponse(null,{status:413});}}raw+=decoder.decode();
 let body;try{body=JSON.parse(raw);}catch{return new NextResponse(null,{status:400});}
 if(!['impression','click'].includes(body.type)||typeof body.token!=='string')return new NextResponse(null,{status:400});
 const data=await verifyAdToken(body.token);if(!data)return new NextResponse(null,{status:400});
 try{const {error}=await createServiceSupabaseClient().rpc('ad_record_event',{p_creative:data.id,p_nonce:data.nonce,p_event:body.type});return new NextResponse(null,{status:error?503:204});}catch{return new NextResponse(null,{status:503});}
}
