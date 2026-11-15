export const PLACEMENTS = {
 home: 'Entre notícias · Página inicial', category: 'Entre notícias · Editorias', search: 'Resultados da busca',
 small_grid: 'Grades menores', article_end: 'Final da notícia', sidebar: 'Barra lateral · Desktop', article_inline: 'Corpo da notícia (opt-in)',
} as const;
export type Placement = keyof typeof PLACEMENTS;
export type Distribution = { interval_news:number; small_grids:boolean; own_percent:number; monetag_percent:number; allow_inline:boolean;monetag_placements:Placement[] };
export const DEFAULT_DISTRIBUTION:Distribution={interval_news:4,small_grids:true,own_percent:70,monetag_percent:30,allow_inline:false,monetag_placements:['home','category','search','small_grid','article_end','sidebar']};
export type Advertiser={id:string;display_name:string;internal_name:string;target_url:string;enabled:boolean;priority:number;creative_count:number;pending_count:number;thumbnail_path:string|null;impressions:number;clicks:number};
export type OwnCreative={id:string;advertiser_id:string;title:string;description:string;target_url:string;media_id:string|null;reviewed_media_id:string|null;enabled:boolean;show_text:boolean;weight:number;placements:Placement[];path:string|null;width:number|null;height:number|null;impressions:number;clicks:number};
export type ManagedCard={id:string;advertiser_id:string;title:string;description:string;target_url:string;image_url:string;width:number|null;height:number|null;show_text:boolean;token?:string;kind:'own'|'monetag';effective_weight?:number};
export function validDestination(value:string) {
 try { const u=new URL(value); return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&!['localhost','127.0.0.1','0.0.0.0','[::1]'].includes(u.hostname)&&!u.hostname.endsWith('.local')&&u.hostname.includes('.'); } catch{return false;}
}
export function slotAfter(index:number,length:number,config:Distribution){return (index+1)%config.interval_news===0||(config.small_grids&&length>0&&length<config.interval_news&&index===length-1);}
export function chooseGroup(config:Distribution,available:{own:boolean;monetag:boolean},credit:{own:number;monetag:number}):'own'|'monetag'|null {
 const own=available.own?config.own_percent:0,monetag=available.monetag?config.monetag_percent:0;
 if(!own&&!monetag)return null;
 credit.own+=own;credit.monetag+=monetag;
 const group=own&&(!monetag||credit.own>=credit.monetag)?'own':'monetag';credit[group]-=own+monetag;return group;
}
export function sniffImage(bytes:Uint8Array):string|null {
 const text=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes.length<16)return null;
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(text(1,4)==='PNG'&&bytes[0]===137&&bytes[4]===13&&bytes[5]===10)return 'image/png';
 if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')return 'image/webp';
 if(text(4,8)==='ftyp'&&/avif|avis/.test(text(8,Math.min(bytes.length,40))))return 'image/avif';return null;
}
