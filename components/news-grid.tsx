import {NewsCard} from '@/components/news-card';
import {AdvertisementCard} from '@/components/advertisement-card';
import {getDistribution,getManagedCards} from '@/lib/ads/selection';
import {slotAfter,type Placement} from '@/lib/ads/manager';
import type {DirectLinkCreative} from '@/lib/ads/direct-link';
import type {Article} from '@/lib/types';
export async function NewsGrid({articles,featureFirst=false,className='',placement='home'}:{articles:Article[];creative?:DirectLinkCreative|null;featureFirst?:boolean;className?:string;placement?:Placement}){
 const config=await getDistribution(),slots=articles.filter((_,i)=>slotAfter(i,articles.length,config)).length;
 const small=articles.length>0&&articles.length<config.interval_news;
 const cards=await getManagedCards(small?'small_grid':placement,slots);let cursor=0;
 return <div className={`news-grid ${className}`}>{articles.map((article,index)=>{
 const card=slotAfter(index,articles.length,config)?cards[cursor++]:null;
 const news=featureFirst?<div className={index===0?'category-first-story':''}><NewsCard article={article} featured={index===0}/></div>:<NewsCard article={article}/>;
 return <Slot key={article.id} news={news} card={card}/>;
 })}</div>;
}
function Slot({news,card}:{news:React.ReactNode;card?:import('@/lib/ads/manager').ManagedCard|null}){return <>{news}{card&&<AdvertisementCard creative={card}/>}</>;}
export async function AdPlacement({placement}:{placement:Placement}){const [card]=await getManagedCards(placement,1);return card?<div className={`managed-placement managed-${placement}`}><AdvertisementCard creative={card}/></div>:null;}
