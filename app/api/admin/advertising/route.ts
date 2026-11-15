import {NextRequest,NextResponse} from 'next/server';
import {getAdminSession,isSameOrigin} from '@/lib/admin-auth';
import {createServiceSupabaseClient} from '@/lib/supabase/server';
import {advertiserSchema,creativeSchema,distributionSchema} from '@/lib/ads/admin-schema';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:NextRequest){
 if(!await getAdminSession())return json({error:'Acesso administrativo necessário.'},401);
 try{
 const db=createServiceSupabaseClient(),q=request.nextUrl.searchParams,resource=q.get('resource')||'advertisers',page=Number.isSafeInteger(Number(q.get('page')))&&Number(q.get('page'))>0?Number(q.get('page')):1,offset=(page-1)*12;
 if(resource==='summary'){const [s,d]=await Promise.all([db.rpc('ad_admin_summary'),db.from('ad_distribution').select('*').eq('id',1).single()]);if(s.error||d.error)throw new Error();return json({summary:s.data,distribution:d.data});}
 if(resource==='advertisers'){const {data,error}=await db.rpc('ad_admin_advertisers',{p_offset:offset,p_limit:12,p_search:(q.get('search')||'').slice(0,160)});if(error)throw error;return json(data);}
 if(resource==='creatives'){
 const id=q.get('advertiser');if(!id||!uuid.test(id))return json({error:'Anunciante inválido.'},400);
 const [list,adv]=await Promise.all([db.rpc('ad_admin_creatives',{p_advertiser:id,p_offset:offset,p_limit:12}),db.from('advertisers').select('id,display_name,internal_name,target_url,enabled,priority').eq('id',id).is('deleted_at',null).maybeSingle()]);
 if(list.error||adv.error)throw new Error();if(!adv.data)return json({error:'Anunciante não encontrado.'},404);return json({...list.data,advertiser:adv.data});}
 if(resource==='media'){const {data,error,count}=await db.from('ad_media').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(offset,offset+11);if(error)throw error;const usage=await db.rpc('ad_media_usage',{p_ids:(data||[]).map(v=>v.id)});if(usage.error)throw usage.error;const used=new Map((usage.data||[]).map((v:{id:string;used:boolean})=>[v.id,v.used]));return json({rows:(data||[]).map(v=>({...v,used:used.get(v.id)||false})),total:count});}
 return json({error:'Recurso inválido.'},400);
 }catch{return json({error:'Não foi possível carregar a publicidade. Confira a conexão e a migração advertising_manager.'},503);}
}
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return json({error:'Requisição inválida.'},403);
 if(!await getAdminSession())return json({error:'Acesso administrativo necessário.'},401);
 const body=await request.json().catch(()=>null);if(!body)return json({error:'Dados inválidos.'},400);
 try{
 const db=createServiceSupabaseClient();
 if(body.resource==='advertiser'){
 const p=advertiserSchema.safeParse(body.data);if(!p.success)return json({error:p.error.issues[0].message},400);
 const {id,...row}=p.data;
 const result=id?await db.from('advertisers').update(row).eq('id',id).is('deleted_at',null).select('id').single():await db.from('advertisers').insert(row).select('id').single();
 if(result.error)throw result.error;return json({id:result.data.id});}
 if(body.resource==='creative'){
 const p=creativeSchema.safeParse(body.data);if(!p.success)return json({error:p.error.issues[0].message},400);
 const {id,advertiser_id,publish,confirm_image,...data}=p.data;
 const result=await db.rpc('ad_save_creative',{p_id:id||null,p_advertiser:advertiser_id,p_data:data,p_publish:publish,p_confirm:confirm_image});
 if(result.error)return json({error:result.error.message.includes('Confirme')?'Confirme a autorização da imagem antes da primeira publicação ou ao substituí-la.':'Não foi possível salvar. Confira o anunciante e a imagem selecionados.'},400);return json({id:result.data});}
 if(body.resource==='distribution'){
 const p=distributionSchema.safeParse(body.data);if(!p.success)return json({error:p.error.issues[0].message},400);
 const {error}=await db.from('ad_distribution').update(p.data).eq('id',1);if(error)throw error;return json({ok:true});}
 if(body.resource==='remove'){
 const {advertiser,id}=body;if(!uuid.test(advertiser)||id&&!uuid.test(id))return json({error:'Identificador inválido.'},400);
 const {error}=await db.rpc('ad_remove',{p_advertiser:advertiser,p_creative:id||null});if(error)throw error;return json({ok:true});}
 return json({error:'Recurso inválido.'},400);
 }catch{return json({error:'Não foi possível salvar a alteração. Tente novamente.'},503);}
}
