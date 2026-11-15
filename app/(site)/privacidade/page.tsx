import type { Metadata } from "next";
import { getPortalSettings } from "@/lib/articles";

export const metadata: Metadata = { title: "Privacidade e dados", alternates: { canonical: "/privacidade" } };

export default async function PrivacyPage() {
  const settings = await getPortalSettings();
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
  return <main className="policy-page container">
    <span className="eyebrow">TRANSPARÊNCIA</span><h1>Privacidade e dados<span>.</span></h1><p className="policy-lead">Como o {settings.site_name} utiliza as informações necessárias para operar o portal e a integração oficial com Instagram.</p>
    <div className="policy-body">
      <p className="policy-updated">INFORMAÇÕES DO SERVIÇO · REVISAR ANTES DO LANÇAMENTO</p>
      <h2>Dados utilizados</h2><p>Quando o proprietário conecta uma conta profissional do Instagram, o portal recebe pela API oficial da Meta o identificador e nome de usuário da conta, além dos IDs, legendas, datas, links e mídias das publicações disponíveis. O portal também mantém o e-mail e a sessão das contas administrativas autorizadas.</p>
      <h2>Como são utilizados</h2><p>As publicações são importadas para exibição no portal, organização por editoria e preparação de matérias. Tokens da Meta são criptografados no servidor. Imagens importadas podem ser copiadas para o armazenamento do projeto para manter os arquivos disponíveis. O portal não usa scraping para obter conteúdo do Instagram.</p>
      <h2>Serviços utilizados</h2><p>O Supabase fornece banco de dados, armazenamento e autenticação; a Vercel pode hospedar o site e executar tarefas agendadas. Quando a redação inteligente está ativada, legendas e imagens podem ser enviadas à OpenAI para pesquisa e processamento editorial. O conteúdo público permanece publicado no site até ser arquivado ou removido pelo administrador.</p>
      <h2>Cookies e publicidade</h2><p>Cookies necessários mantêm a sessão segura do painel administrativo. Nas páginas públicas, o portal oferece anúncios Monetag exclusivamente no formato In-Page Push (Banner), carregados somente após você aceitar publicidade. Recusar não impede a leitura das notícias.</p>
      <p>Após a autorização, o navegador se conecta ao Monetag e seus parceiros publicitários. O serviço pode tratar endereço IP, informações do navegador e dispositivo, identificadores, cookies e dados de navegação para selecionar anúncios, controlar sua frequência e medir resultados, conforme a <a href="https://monetag.com/privacy/" target="_blank" rel="noreferrer">política de privacidade do Monetag</a>. Esses serviços podem processar dados fora do Brasil.</p>
      <p>Sua escolha é armazenada neste navegador por até 180 dias. Você pode aceitar, recusar ou revogar a autorização em <strong>Preferências de publicidade</strong>, no rodapé. Ao revogar após carregar anúncios, a página é recarregada para encerrar os scripts em execução; novas visitas permanecem sem publicidade. A revogação não apaga automaticamente dados já tratados ou cookies de terceiros; consulte também os controles do navegador e a política do provedor. Se o armazenamento estiver bloqueado, a preferência pode valer apenas nesta visita.</p>
      <h2>Revogação e exclusão</h2><p>O administrador pode desconectar a conta no painel; isso remove o token armazenado e interrompe novas sincronizações. Notícias já publicadas são mantidas até que o administrador as exclua. Para solicitar exclusão de dados associados à conexão ou fazer uma pergunta sobre privacidade, entre em contato:</p>
      {contact ? <p><a href={`mailto:${contact}`}>{contact}</a></p> : settings.albr_contact_url ? <p><a href={settings.albr_contact_url} target="_blank" rel="noreferrer">Fale com o responsável pelo portal ↗</a></p> : <p className="policy-contact-missing">O proprietário deve configurar um contato de privacidade em NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL antes de publicar esta página ou enviar o aplicativo à análise da Meta.</p>}
      <div className="policy-owner-note"><strong>Nota de publicação</strong><p>Esta página descreve os dados e fluxos implementados no projeto. Antes do lançamento público e da análise da Meta, o proprietário deve confirmar a identidade jurídica do responsável pelo tratamento, preencher os contatos corretos e revisar o texto com sua assessoria.</p></div>
    </div>
  </main>;
}
