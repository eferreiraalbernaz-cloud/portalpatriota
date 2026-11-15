import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {getAdminSession,isSameOrigin} from '@/lib/admin-auth';
import {createServiceSupabaseClient} from '@/lib/supabase/server';
import {sniffImage} from '@/lib/ads/manager';
const json=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 if(!isSameOrigin(request))return json({error:'Requisição inválida.'},403);
 if(!await getAdminSession())return json({error:'Acesso administrativo necessário.'},401);
 if(Number(request.headers.get('content-length')||0)>9*1024*1024)return json({error:'A imagem deve ter até 8 MB após a otimização.'},413);
 const form=await request.formData().catch(()=>null),file=form?.get('file');
 if(!(file instanceof File)||file.size<16||file.size>8388608)return json({error:'Escolha uma imagem PNG, JPG, WebP ou AVIF de até 8 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer()),mime=sniffImage(bytes);
 if(!mime||file.type&&file.type!==mime)return json({error:'Formato de imagem inválido. Não são aceitos SVG, HEIC ou arquivos renomeados.'},400);
 const suffix:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/avif':'avif'};
 const path='advertising/'+randomUUID()+'.'+suffix[mime];
 const dim=(name:string)=>{const n=Number(form?.get(name));return Number.isInteger(n)&&n>0&&n<=30000?n:null;};
 try{
 const db=createServiceSupabaseClient();const upload=await db.storage.from('portal-media').upload(path,bytes,{contentType:mime,cacheControl:'31536000',upsert:false});if(upload.error)throw upload.error;
 const result=await db.from('ad_media').insert({path,mime,bytes:file.size,width:dim('width'),height:dim('height')}).select('id,path,width,height').single();
 if(result.error){await db.storage.from('portal-media').remove([path]);throw result.error;}
 return json({...result.data,url:db.storage.from('portal-media').getPublicUrl(path).data.publicUrl});
 }catch{return json({error:'Não foi possível enviar a imagem. Confira sua conexão e tente novamente.'},503);}
}
export async function DELETE(request:NextRequest){
 if(!isSameOrigin(request))return json({error:'Requisição inválida.'},403);
 if(!await getAdminSession())return json({error:'Acesso administrativo necessário.'},401);
 const body=await request.json().catch(()=>null);if(!body?.id||!/^[0-9a-f-]{36}$/i.test(body.id))return json({error:'Imagem inválida.'},400);
 try{
 const db=createServiceSupabaseClient(),claim=await db.rpc('ad_claim_unused_media',{p_id:body.id});
 if(claim.error)return json({error:'A imagem está em uso ou não foi encontrada. Substitua-a nos anúncios antes de excluir.'},409);
 const removed=await db.storage.from('portal-media').remove([claim.data]);
 if(removed.error){await db.from('ad_media').update({deleting_at:null}).eq('id',body.id);return json({error:'Falha ao excluir o arquivo. Tente novamente.'},503);}
 const result=await db.from('ad_media').delete().eq('id',body.id);if(result.error)throw result.error;return json({ok:true});
 }catch{return json({error:'Não foi possível excluir a imagem.'},503);}
}
