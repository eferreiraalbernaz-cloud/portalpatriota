export async function prepareAdImage(file:File):Promise<{file:File;width:number;height:number}>{
 if(!['image/png','image/jpeg','image/webp','image/avif'].includes(file.type)||file.size>20*1024*1024)throw new Error('Escolha PNG, JPG, WebP ou AVIF de até 20 MB. O envio final é limitado a 8 MB.');
 const url=URL.createObjectURL(file);
 try{
 const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Este navegador não conseguiu abrir a imagem. Experimente JPG ou PNG.'));img.src=url;});
 const scale=Math.min(1,2000/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.round(image.naturalWidth*scale),height=Math.round(image.naturalHeight*scale);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a imagem.');ctx.drawImage(image,0,0,width,height);
 const blob=await new Promise<Blob|null>(r=>canvas.toBlob(r,'image/webp',0.88));
 if(blob&&blob.size<=8388608&&(scale<1||blob.size<file.size))return {file:new File([blob],'anuncio.'+(blob.type==='image/webp'?'webp':'png'),{type:blob.type}),width,height};
 if(file.size>8388608)throw new Error('A imagem continua maior que 8 MB. Escolha uma versão menor.');
 return {file,width:image.naturalWidth,height:image.naturalHeight};
 }finally{URL.revokeObjectURL(url);}
}
export async function uploadAdImage(file:File,progress:(n:number)=>void){
 const prepared=await prepareAdImage(file);const form=new FormData();form.append('file',prepared.file);form.append('width',String(prepared.width));form.append('height',String(prepared.height));
 return new Promise<{id:string;path:string;width:number;height:number;url:string}>((resolve,reject)=>{
 const xhr=new XMLHttpRequest();xhr.open('POST','/api/admin/advertising/media');xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100));};
 xhr.onerror=()=>reject(new Error('Falha de conexão durante o envio.'));xhr.onabort=()=>reject(new Error('Envio cancelado.'));xhr.timeout=120000;xhr.ontimeout=()=>reject(new Error('O envio demorou demais. Tente uma conexão mais estável.'));
 xhr.onload=()=>{let data;try{data=JSON.parse(xhr.responseText);}catch{reject(new Error('Resposta inválida ao enviar imagem.'));return;}if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||'Não foi possível enviar a imagem.'));};xhr.send(form);
 });
}
