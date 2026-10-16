# Portal Patriota BR

Aplicação editorial responsiva construída com Next.js 16, TypeScript, Supabase e integração oficial com a Instagram API. O código inclui páginas públicas indexáveis, painel administrativo autenticado, CRUD de matérias, upload de imagens, sincronização agendada, redação assistida com pesquisa na web e migração PostgreSQL com RLS.

O repositório começa sem credenciais externas. Supabase, Meta, OpenAI, domínio e agendamento precisam ser configurados pelo proprietário antes de qualquer integração entrar em operação. Nenhuma notícia de demonstração é publicada.

## 1. Instalar e executar

Requisitos: Node.js 20.9 ou superior e pnpm 9 ou superior.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

No PowerShell, copie o arquivo de exemplo com `Copy-Item .env.example .env.local`. Preencha primeiro `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e a chave privada do Supabase. O portal público tem uma tela de configuração vazia até que exista conteúdo publicado.

Comandos de verificação:

```bash
pnpm typecheck
pnpm build
```

## 2. Configurar o Supabase

1. Crie um projeto Supabase e copie a URL, a chave publicável (ou anon key legada) e a chave `service_role`/secret do servidor.
2. Preencha as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente local e no provedor de deploy. A chave privada nunca deve ter prefixo `NEXT_PUBLIC_`.
3. Execute os arquivos em `supabase/migrations/` no SQL Editor do projeto, em ordem pelo nome: `202610150001_initial_schema.sql` e `202610150002_provider_configuration.sql`. Eles criam as tabelas, índices, função RLS, políticas, o bucket público de imagens `portal-media` (limite de 8 MB; tipos restritos) e a tabela privada de credenciais de provedores.
4. Configure as URLs de autenticação no Supabase: site URL igual a `NEXT_PUBLIC_SITE_URL` e callback permitido `https://SEU_DOMINIO/auth/callback` (inclua `http://localhost:3000/auth/callback` durante desenvolvimento). Ative confirmação de e-mail e configure o provedor de e-mail.
5. Gere `BOOTSTRAP_SECRET` com pelo menos 32 bytes aleatórios e defina `BOOTSTRAP_ADMIN_EMAIL`. Depois de publicar o app e configurar a migration, execute **uma única vez**:

```bash
curl.exe -X POST https://SEU_DOMINIO/api/admin/bootstrap \
  -H 'Authorization: Bearer SEU_BOOTSTRAP_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

O e-mail de convite permite definir uma senha de no mínimo 12 caracteres. Se o e-mail já existir no Supabase Auth, a conta é autorizada e o usuário pode usar “Esqueceu a senha?” para receber o link seguro. Remova `BOOTSTRAP_SECRET` do ambiente assim que a primeira conta administrativa estiver criada. Não há cadastro público.

O acesso ao painel verifica a sessão Supabase e a associação em `admin_users` no servidor. As tabelas privadas de integração e logs não possuem políticas de leitura pública; as operações administrativas passam pelo backend usando a chave secreta.

## 3. Configurar Instagram pela API oficial

O código usa **Instagram API with Instagram Login** e não faz scraping. A conta precisa ser profissional (Business ou Creator), o aplicativo da Meta precisa ter o produto Instagram Login habilitado e o callback deve corresponder exatamente ao cadastrado no painel da Meta.

1. Crie/configure um app no [Meta for Developers](https://developers.facebook.com/) e adicione Instagram API with Instagram Login.
2. Cadastre em OAuth Redirect URIs a URL de retorno exibida no painel **Configurações → Configuração de APIs**. Ela usa o endereço público definido em `NEXT_PUBLIC_SITE_URL`; não é preciso editar uma variável `META_REDIRECT_URI`.
3. Solicite a permissão mínima de leitura `instagram_business_basic` para buscar perfil e publicações. O app precisa passar pela análise/acesso avançado da Meta para uso fora de contas de teste. Adicione a conta do proprietário como tester durante a configuração.
4. O responsável técnico deve definir `APP_SECRETS_ENCRYPTION_KEY` uma única vez no servidor. Gere com `openssl rand -base64 32` e mantenha a mesma chave em todos os deploys. Essa chave protege os segredos de API e tokens Meta gravados no banco. Se for perdida, será preciso inserir as chaves de API e reconectar o Instagram.
5. O administrador pode abrir **Configurações → Configuração de APIs**, informar o App ID e o App Secret, e salvar. O painel mostra a URL de retorno OAuth, derivada de `NEXT_PUBLIC_SITE_URL`, para copiar para a Meta. Os campos secretos ficam vazios depois de salvar; deixar em branco mantém a chave atual. Depois use **Conectar Instagram** para autorizar o perfil profissional. Não copie tokens para o navegador ou para o Git.
6. A rota `/api/cron/automation` consulta a API oficial a cada 15 minutos pelo cron do Worker em produção. O arquivo vercel.json também oferece um agendamento alternativo para Vercel. Em outros provedores, configure o cron equivalente para chamar essa rota com o segredo `CRON_SECRET`. Ela importa até 300 publicações recentes por execução, evita duplicatas pelo ID da mídia e processa uma fila curta por rodada. Se a conta desconectar ou a renovação falhar, o painel informa que a autorização precisa ser refeita.

O fluxo pede somente leitura de perfil e mídia; não pede permissão para publicar no Instagram. A publicação tratada por este portal acontece no próprio site. A frequência real do cron depende do plano e dos limites do provedor; confirme a disponibilidade de cron a cada 15 minutos e de funções com tempo de execução compatível com pesquisa de IA. O botão de sincronização manual está no painel.

Referências oficiais: [Instagram API with Instagram Login — coleção Meta](https://www.postman.com/meta/instagram/folder/6raa77c/instagram-api-with-instagram-login), [permissões da Instagram API](https://developers.facebook.com/docs/permissions/) e [versões da Graph API](https://developers.facebook.com/docs/graph-api/changelog/versions/).

Antes da análise/publicação do app da Meta, preencha `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL`, revise a página `/privacidade` com a identificação correta do responsável pelo tratamento e cadastre `https://SEU_DOMINIO/privacidade` como Privacy Policy URL e Data Deletion Instructions URL. A página descreve os dados, orienta que a solicitação de exclusão seja enviada ao contato publicado e avisa que o proprietário deve completar os dados jurídicos antes do lançamento; ela não substitui a revisão do responsável. A política da plataforma exige uma política pública que descreva os dados processados e como pedir exclusão ([termos da plataforma Meta](https://developers.facebook.com/terms/)). A conexão pode ser removida no painel; isso apaga o token salvo, mas preserva matérias publicadas até o administrador excluí-las.

## 4. IA e pesquisa

Na página **Configurações → Configuração de APIs**, o administrador informa a chave do provedor e o nome de um modelo compatível com a [Responses API](https://platform.openai.com/docs/api-reference/responses), entrada de imagem e a ferramenta [web search](https://platform.openai.com/docs/guides/tools-web-search). O modelo padrão é `gpt-5-mini`. A chave é criptografada no servidor; depois de salvar, o campo fica vazio e pode permanecer assim para manter a configuração.

A redação usa a legenda como pauta, solicita pesquisa independente e exige que as fontes informadas estejam presentes nos resultados reais da ferramenta. Menos de duas fontes, baixa confiança, contradição ou falha do provedor deixam a notícia pendente. Se a redação inteligente estiver desativada, o sistema preserva a legenda e usa um classificador leve; categorias ambíguas ficam marcadas para revisão. A publicação automática vem desligada por padrão e somente libera conteúdo aprovado pelas verificações implementadas.

O modelo e a ferramenta de pesquisa têm custos e limites próprios. Configure alertas/limites de uso na conta do provedor de IA. Legendas e imagens são transmitidas à OpenAI para processamento quando esse modo estiver ativo.

## 5. Operar o painel

- **Visão geral:** totais, última sincronização, erros recentes e status da automação.
- **Notícias:** criar, editar, destacar, alterar categoria, enviar imagem, publicar, agendar, arquivar, excluir ou reprocessar uma importação.
- **Configurações:** selecionar redação curta/média/longa/desativada, pausar sincronização, ligar/desligar publicação automática, atualizar links institucionais e configurar as credenciais Meta/OpenAI sem voltar ao deploy.
- **Revisão editorial:** matérias com verificação incompleta ficam pendentes; edite e publique manualmente quando estiverem corretas.
- **Senha:** o acesso de produção solicita somente senha. Para recuperar o acesso da conta técnica, o responsável pela infraestrutura redefine a senha no Supabase Auth. Contas pessoais com e-mail válido ainda podem usar o fluxo de recuperação por e-mail.

O dashboard deixa explícito quando analytics não está configurado. Nenhuma visita é rastreada por padrão. Registros operacionais de sincronização e processamento são retidos por 90 dias e removidos automaticamente pelo cron.

## 6. Deploy e domínio

A implantação de produção usa dois projetos Cloudflare vinculados ao mesmo repositório:

- **Pages:** portalpatriotabr, endereço https://portalpatriotabr.pages.dev, código em cloudflare/pages/. O binding PORTAL encaminha as requisições ao servidor.
- **Worker:** portalpatriotabr-app, aplicação Next.js completa adaptada pelo OpenNext. O arquivo wrangler.jsonc configura assets, logs, variáveis públicas e cron a cada 15 minutos.
- **Supabase:** projeto portal-patriota-br, região São Paulo, referência dikhcnfoxzchsjgleoww.

As alterações na branch main do GitHub iniciam um build Linux e o deploy do Worker automaticamente. Mudanças no diretório do proxy atualizam o Pages. Atualizações apenas no README não disparam o build do servidor.

Comandos do servidor:

~~~bash
pnpm install --frozen-lockfile
pnpm build:cloudflare
pnpm deploy:cloudflare
~~~

Para outra implantação, configure primeiro as variáveis públicas do arquivo .env.example no build e no runtime. Cadastre SUPABASE_SECRET_KEY, APP_SECRETS_ENCRYPTION_KEY e CRON_SECRET como segredos do Worker. Não copie esses valores para o Git. As credenciais de Meta e IA são configuradas pelo administrador no painel e permanecem criptografadas no banco.

O OpenNext deve ser validado no runtime Workers; um build Next.js isolado não confirma compatibilidade com esse runtime. No Windows, use o build Linux da Cloudflare ou WSL.

Para domínio próprio, associe-o ao projeto Pages no painel Cloudflare e atualize NEXT_PUBLIC_SITE_URL no Worker e no build, a URL do Supabase Auth e o retorno OAuth cadastrado na Meta. A URL de retorno é exibida automaticamente no painel do portal.

O fluxo do primeiro administrador deve ser executado somente em produção e uma única vez, após definir BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_SECRET nos segredos do Worker. O login de produção solicita somente a senha. A conta técnica é identificada por ADMIN_LOGIN_EMAIL (padrão painel@portalpatriotabr.invalid), sem envio de mensagens. A senha é armazenada como hash pelo Supabase Auth; nunca coloque a senha no código ou neste arquivo. Não existe acesso administrativo público sem autenticação.

## 7. Serviços que podem gerar custos

- Cloudflare Workers/Pages ou Vercel: hospedagem, execução serverless e frequência/tempo de cron conforme o plano.
- Supabase: PostgreSQL, autenticação, armazenamento de imagens, tráfego e backups conforme o plano.
- OpenAI: tokens de entrada/saída, análise de imagem e chamadas da pesquisa na web conforme modelo e volume.
- Domínio e Cloudflare: registro do domínio e eventuais serviços pagos opcionais.
- E-mail transacional: provedor de envio usado pelo Supabase para convites e recuperação de senha.

## 8. Estado de ativação e limitações conhecidas

O projeto Supabase e a infraestrutura Cloudflare estão provisionados. As credenciais privadas de infraestrutura ficam nos segredos do Worker. A conta Instagram, a aprovação do aplicativo Meta, a chave de IA e o primeiro acesso administrativo ainda dependem dos dados do proprietário. Até essas etapas, a sincronização permanece pausada e a publicação automática desativada. Não há scraping, notícias fictícias nem credenciais privadas no repositório.

O cron importa mídia de até três páginas (300 itens) por rodada e drena a fila de redação em lotes curtos para respeitar o tempo das funções. O modelo pode errar; a camada editorial reduz o risco e envia casos incompletos para revisão, mas a revisão humana continua necessária para manter padrão jornalístico.
