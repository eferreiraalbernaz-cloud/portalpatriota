# Monetag — preparação para In-Page Push

## Estado desta entrega

**Não há anúncios instalados.** A seção Monetização em `/admin/configuracoes`
salva somente uma configuração pendente. O botão de ativação está indisponível,
a API rejeita `enabled: true` e o banco também impede a ativação.
Nenhuma tag, requisição de publicidade, cookie publicitário ou Service Worker
Monetag foi adicionado às páginas públicas. Isso também evita anúncios no painel,
login e recuperação de senha, bem como duplicação durante navegação.

O trecho recebido (`self.options`, `self.lary`, `importScripts` e Zone ID
`12194090`) é código de Service Worker. Não é a tag de página necessária para
In-Page Push, nem prova que essa zona pertença ao formato permitido. A documentação
Monetag associa o arquivo `sw.js` a Push Notifications e MultiTag; não é possível
identificar a configuração da zona privada apenas por esse arquivo.

Fontes oficiais:

- [In-Page Push: selecionar a zona e obter a tag](https://help.monetag.com/en/articles/6959534-in-page-push-ipp)
- [Instalação por formato: tag e Service Worker](https://help.monetag.com/en/articles/6726318-how-do-i-get-started-as-a-publisher-paste-the-ad-tag-into-your-website)
- [Diagnóstico e Installation Check](https://help.monetag.com/en/articles/6745314-i-don-t-see-any-ads-on-my-site-what-should-i-do)

## Configuração administrativa

1. Aplique `supabase/migrations/20261115005642_monetag_ipp_configuration.sql`
   no projeto Supabase correto, depois das migrações existentes. A tabela usa RLS,
   sem acesso para `anon` ou `authenticated`; somente o backend com service role
   pode consultá-la ou gravá-la após verificar a sessão de administrador.
2. Confira `NEXT_PUBLIC_SITE_URL`: o repositório configura
   `https://portalpatriotabr.pages.dev`. A resposta pública desse endereço foi
   consultada, mas não comprova a associação da zona Monetag ao domínio.
   Não houve alteração de domínio, DNS ou implantação em produção.
3. Entre como administrador e abra Configurações → Monetização. Cadastre apenas
   o ID da zona In-Page Push confirmada. Deixe vazio enquanto ele não for conhecido.
   O ID do Service Worker não é preenchido automaticamente.
4. Salve e recarregue para conferir a persistência. A configuração continua
   desativada. Falta de migração, indisponibilidade do banco e URL inválida são
   apresentadas somente no painel autenticado.

Não foram alterados SEO, sitemap, robots, canônicas, verificação do Google,
layouts públicos, autenticação, Instagram, IA, automações ou Service Workers.
A página pública de privacidade continua coerente com esta etapa sem publicidade.

## O que obter no Monetag

Em Websites, selecione o domínio público exato e crie/selecione uma zona
**In-Page Push (Banner)**. Clique em **Get tag** e copie **todo o código JavaScript
da tag de página**, incluindo endereço do script, atributos e parâmetros.
Envie a tag junto do domínio associado e da identificação do formato no painel.
Não envie apenas `sw.js` ou o número da zona. Não use MultiTag, OnClick/Popunder,
Vignette, Interstitial ou Push Notifications.

## Próxima implementação após receber a tag

O recebimento da tag ainda exige uma implementação revisada; preencher o Zone ID
nesta entrega não instala anúncios. Validar a tag exata antes de adicionar um
carregador exclusivamente no navegador, no `<head>` das páginas públicas,
assíncrono e após o carregamento inicial/consentimento aplicável. Não inferir uma
URL de script a partir do Zone ID nem permitir JavaScript arbitrário no painel.

A integração final deve evitar execuções duplicadas na navegação, tratar falhas
sem afetar notícias, impedir scripts em rotas administrativas/autenticação e
definir a remoção de efeitos quando houver desativação ou revogação de
consentimento. Remover uma tag já executada não desfaz automaticamente seus
event listeners, timers ou anúncios; verificar o mecanismo oficial de limpeza
antes de prometer desligamento imediato em abas abertas.

Antes de liberar a ativação na UI/API e remover a restrição SQL
`monetag_requires_reviewed_ipp_tag`, implementar e testar esses pontos; revisar
a política de privacidade com o responsável pelo portal, incluindo Monetag,
finalidades, compartilhamento, contatos e consentimento/revogação aplicáveis.
Não é possível confirmar agora o comportamento do script que ainda não foi enviado.

Solicitar ao suporte Monetag ajustes de frequência e posição para manter a leitura
livre, especialmente no celular. A documentação informa que a posição pode ser
alterada mediante solicitação; não inventar parâmetros de frequência/posição.

## Validação

Nesta entrega:

```sh
pnpm typecheck
pnpm build
node --test tests/monetization.test.cjs
```

Após a implementação final e publicação no domínio confirmado:

1. Execute Installation Check no Monetag e confirme zona ativa e formato IPP.
2. Em janela privada sem bloqueador, teste desktop e celular; confirme no Network
   a tag correta e uma única inicialização por documento durante a navegação.
3. Inspecione o Console, leia matérias e teste busca e navegação. Compare o
   carregamento inicial e Core Web Vitals com a versão sem anúncios.
4. Confirme ausência de anúncios/scripts em `/admin`, login, recuperação e
   definição de senha; confirme ausência de popunders, abas automáticas,
   redirecionamentos involuntários, interstitial e vignette.
5. Teste negar/revogar consentimento e desativar anúncios no painel: conferir
   novas visitas, navegação e abas abertas conforme o mecanismo de desligamento
   implementado. Na etapa atual, todas as páginas permanecem sem anúncios.
6. Compare metatags, Google Search Console, canônicas, `/sitemap.xml` e
   `/robots.txt`. Verifique autenticação e integrações existentes.

Exibição e receita só podem ser confirmadas com observação real e dados do painel
Monetag. Nenhuma exibição ou receita foi comprovada nesta entrega.
