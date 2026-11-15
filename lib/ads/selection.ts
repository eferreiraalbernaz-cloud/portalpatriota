import 'server-only';
import {cache} from 'react';
import {createPublicSupabaseClient} from '@/lib/supabase/server';
import {getPublicCreative} from '@/lib/ads/config';
import {DEFAULT_DISTRIBUTION,chooseGroup,type Distribution,type ManagedCard,type Placement} from '@/lib/ads/manager';
import {signAdToken} from '@/lib/ads/metrics';
export const getDistribution=cache(async():Promise<Distribution>=>{
 try {const db=createPublicSupabaseClient();if(!db)return DEFAULT_DISTRIBUTION;const {data}=await db.from('ad_distribution').select('interval_news,small_grids,own_percent,monetag_percent,allow_inline,monetag_placements').eq('id',1).maybeSingle();return data||DEFAULT_DISTRIBUTION;}catch{return DEFAULT_DISTRIBUTION;}
});
const ownPool=cache(async(placement:Placement,count:number)=>{const db=createPublicSupabaseClient();if(!db)return {data:[]};return db.rpc('ad_pick',{p_placement:placement,p_count:count});});
const requestState=cache(()=>({own:0,monetag:0,lastAdvertiser:''}));
export async function getManagedCards(placement:Placement,count:number):Promise<ManagedCard[]>{
 if(!count)return [];
 const config=await getDistribution();if(placement==='article_inline'&&!config.allow_inline)return [];
 try {
 const db=createPublicSupabaseClient();if(!db)return [];
 const [ownResult,monetag]=await Promise.all([config.own_percent?ownPool(placement,Math.max(32,count*2)):Promise.resolve({data:[]}),config.monetag_percent&&config.monetag_placements.includes(placement)?getPublicCreative():Promise.resolve(null)]);
 const pool:ManagedCard[]=(ownResult.data||[]).map((v:{id:string;advertiser_id:string;title:string;description:string;target_url:string;storage_path:string;width:number|null;height:number|null;show_text:boolean;effective_weight:number})=>({...v,kind:'own',image_url:db.storage.from('portal-media').getPublicUrl(v.storage_path).data.publicUrl}));
 const cards:ManagedCard[]=[];const state=requestState();
 for(let i=0;i<count;i++){
  const group=chooseGroup(config,{own:pool.length>0,monetag:Boolean(monetag)},state);if(!group)break;
  if(group==='monetag'&&monetag){cards.push({...monetag,id:'monetag-direct',advertiser_id:'monetag',kind:'monetag',width:null,height:null,show_text:true});state.lastAdvertiser='monetag';continue;}
  const alternatives=pool.filter(v=>v.advertiser_id!==state.lastAdvertiser);
  const candidates=alternatives.length?alternatives:pool;
  let score=Math.random()*candidates.reduce((sum,v)=>sum+(Number(v.effective_weight)||1),0);
  const card=candidates.find(v=>{score-=Number(v.effective_weight)||1;return score<=0;})||candidates[candidates.length-1];state.lastAdvertiser=card.advertiser_id;
  cards.push({...card,token:await signAdToken(card.id)});
 }
 return cards;
 }catch{return [];}
}
