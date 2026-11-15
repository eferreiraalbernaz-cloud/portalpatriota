import 'server-only';
import { getSupabaseSecretKey } from '@/lib/config';
const secret=()=>process.env.APP_SECRETS_ENCRYPTION_KEY||getSupabaseSecretKey();
async function key(){const value=secret();if(!value)return null;return crypto.subtle.importKey('raw',new TextEncoder().encode(value),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function signAdToken(id:string){const k=await key();if(!k)return undefined;const payload=Buffer.from(JSON.stringify({id,nonce:crypto.randomUUID(),expires:Date.now()+3600000})).toString('base64url');const signature=await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(payload));return payload+'.'+Buffer.from(signature).toString('base64url');}
export async function verifyAdToken(token:string):Promise<{id:string;nonce:string;expires:number}|null>{
 try {if(token.length>1000)return null;const [payload,signature,extra]=token.split('.');const k=await key();if(!k||!payload||!signature||extra)return null;
 if(!await crypto.subtle.verify('HMAC',k,Buffer.from(signature,'base64url'),new TextEncoder().encode(payload)))return null;
 const v=JSON.parse(Buffer.from(payload,'base64url').toString());const uuid=/^[0-9a-f-]{36}$/i;
 return uuid.test(v.id)&&uuid.test(v.nonce)&&Number.isFinite(v.expires)&&v.expires>Date.now()&&v.expires<=Date.now()+3600000?v:null;
 }catch{return null;}
}
