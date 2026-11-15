import {redirect} from 'next/navigation';
import {getAdminSession} from '@/lib/admin-auth';
import {AdminShell} from '@/components/admin-shell';
import {AdvertisingManager} from '@/components/advertising-manager';
import {readCreativeAdminState} from '@/lib/ads/config';
import {getSupabaseUrl,isAdminBackendConfigured} from '@/lib/config';
export default async function AdvertisingPage(){
 const admin=await getAdminSession();if(!admin)redirect('/admin/login');
 return <AdminShell email={admin.email} title="Gerenciar anúncios" eyebrow="PUBLICIDADE">
 {isAdminBackendConfigured()?<AdvertisingManager mediaBase={(getSupabaseUrl()||'')+'/storage/v1/object/public/portal-media/'} monetag={await readCreativeAdminState()}/>:<p className="form-error">Configure o backend administrativo para gerenciar publicidade.</p>}
 </AdminShell>;
}
