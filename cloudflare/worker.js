import app from '../.open-next/worker.js';
export * from '../.open-next/worker.js';

export default {
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (!env.CRON_SECRET || !(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
      console.log(JSON.stringify({event:'automation_skipped',reason:'backend_configuration_pending'}));
      return;
    }
    const request = new Request(new URL('/api/cron/automation', env.NEXT_PUBLIC_SITE_URL), {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` }
    });
    const response = await app.fetch(request, env, ctx);
    if (!response.ok) throw new Error(`Automation returned HTTP ${response.status}`);
  }
};
