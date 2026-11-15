# Publicidade → Gerenciar anúncios

Acesso: `/admin/publicidade`, somente após autenticação administrativa.

## Publicar pelo celular

1. Abra o menu **Publicidade → Gerenciar anúncios**.
2. No parceiro desejado, toque em **Gerenciar / Visualizar** e depois **Editar / Prévia**.
3. Toque em **Escolher imagem** e selecione o arquivo na galeria. A prévia aparece
   imediatamente; aguarde o indicador de progresso e a confirmação do envio.
4. Confira título público, descrição e URL. Para artes que já contêm os textos,
   desmarque **Exibir título e descrição abaixo da imagem**.
5. Escolha os locais e o peso do criativo. Confirme a autorização da imagem uma vez
   e toque em **Publicar anúncio**. Publicar um anúncio também habilita o anunciante.
6. Abra o portal para conferir. Uma recusa de publicidade já salva nesse navegador
   pode ser alterada em **Preferências de publicidade**, no rodapé.

Os parceiros iniciais são G&K Games, Ótica Portela, Antônio Sabino — Material de
Construção e Desenvolvimento Web, com os títulos, descrições e URLs fornecidos.
Todos começam desativados, sem imagem. O nome interno do desenvolvedor é usado
apenas no painel e não integra a consulta pública nem é inserido na arte.

É possível cadastrar novos anunciantes e vários criativos por anunciante sem
alterar código. As listas usam paginação de 12 registros e busca de anunciantes,
sem limite de cadastros imposto pela aplicação. A capacidade física continua
sujeita ao plano do banco/Storage.

## Imagens

PNG, JPG/JPEG, WebP e AVIF, conforme suporte do navegador. O seletor não força a
câmera: permite escolher arquivos da galeria. O navegador preserva a proporção,
reduz imagens grandes para no máximo 2000 px no maior lado e tenta WebP com
qualidade 88%, mantendo transparência. Há fallback para o arquivo original quando
adequado. Seleção até 20 MB, envio final até 8 MB. HEIC/SVG não são aceitos; use
JPG/PNG se a galeria fornecer um formato não suportado.

Os arquivos ficam no bucket existente `portal-media`, prefixo `advertising/`, com
nomes aleatórios e cache imutável. Upload/exclusão passam por endpoints do servidor
que verificam sessão administrativa e origem. O servidor valida tamanho, tipo e
assinatura dos bytes. Não se concede escrita pública no Storage.

Substituir uma imagem cria um novo arquivo e exige nova confirmação de autorização
na publicação. Alterar texto, link, peso ou posicionamento preserva a confirmação
existente da imagem. **Biblioteca de imagens** permite reutilizar e excluir arquivos
sem uso; imagens de anúncios existentes não podem ser excluídas. Imagens abandonadas
em uploads ou substituições podem ser removidas ali. Excluir um anúncio não apaga
arquivos usados por outro anúncio nem imagens editoriais.

## Distribuição

Padrão: um espaço após cada quatro notícias; um espaço ao final de grades menores.
Em **Distribuição e espaços**, configure o intervalo e a proporção de publicidade
própria/cards Monetag (inicialmente 70%/30%). São oportunidades de distribuição,
não garantia de faturamento ou de proporção exata das impressões efetivamente vistas.

A seleção usa somente criativos publicados, com imagem revisada e anunciante
habilitado, elegíveis para aquele local. A prioridade do anunciante e o peso do
criativo participam do sorteio ponderado; repetições consecutivas são evitadas
quando há alternativas disponíveis. A parcela de um grupo sem anúncios elegíveis
é redistribuída para outro grupo habilitado. Porcentagem zero desabilita o grupo.
Nenhuma notícia é substituída, e nenhum espaço é renderizado se não houver anúncio.

Posições: home, editorias, busca, grades menores, final de notícia e barra lateral
(em telas a partir de 1100 px). Corpo da notícia fica desabilitado até o administrador
ativar explicitamente a opção global e permitir esse local no criativo. O mesmo
intervalo é então aplicado entre parágrafos. Não há anúncio sobreposto ao texto.

O editor **Monetag** preserva o Direct Link `https://uplcm.com/4/12272346` e as
configurações existentes. Seus locais podem ser controlados separadamente. O
In-Page Push 12271754 continua com seu carregador independente; não é usado para
preencher contêineres de cards, e seu controle de frequência pertence ao Monetag.
Links próprios não são substituídos por Direct Links.

## Métricas próprias

O painel mostra contagens e CTR por anúncio/anunciante nos últimos 30 dias. Uma
impressão exige imagem carregada, pelo menos 50% do card visível por 1 segundo,
com a aba visível. Cliques exigem evento real do navegador e não interrompem a
navegação. Prévia administrativa não conta eventos. Cards Monetag não entram
nessas métricas, e não há mistura com receitas do provedor.

Cada espaço recebe um token HMAC temporário e um nonce aleatório, sem identificador
de pessoa. O servidor rejeita tokens inválidos/expirados e deduplica impressão e
clique por espaço. Totais são incrementados atomicamente em agregados diários.
Não são gravados IP, user agent, nome, conta, localização ou histórico do visitante.
Comprovantes expiram após 2 dias e são limpos em lotes durante novos registros;
os totais diários permanecem. Tokens expiram após 1 hora; páginas muito antigas
podem precisar recarregar para voltar a contribuir às métricas. Os números são
indicadores operacionais, não auditoria antifraude ou faturamento de anúncios.

Exclusões de anunciantes/anúncios são lógicas: removem a exibição e as listas,
preservando o histórico de métricas. A biblioteca identifica imagens sem vínculo
com anúncios não excluídos.

## Segurança e testes

Tabelas RLS: `advertisers`, `ad_creatives`, `ad_media`, `ad_placements`,
`ad_distribution`, `ad_daily_stats`, `ad_event_receipts`. Visitantes só consultam
anúncios publicados e não podem ler nomes internos, escrever anúncios ou acessar
métricas agregadas. Funções administrativas e de métricas são executáveis apenas
pelo backend com service role, após validações HTTP. Nenhuma função nova usa
SECURITY DEFINER. As configurações Monetag existentes não foram migradas/duplicadas.

A migração `advertising_manager` foi aplicada no projeto
`dikhcnfoxzchsjgleoww`; o arquivo usa a mesma versão do histórico remoto.

```sh
pnpm typecheck
pnpm build
node --test tests/*.test.cjs
```

Testes SQL isolados verificam seeds, RLS, privacidade do nome interno, publicação,
revisão de imagem, exclusão segura, posicionamento e deduplicação. Testes de API
verificam autenticação/origem, uploads e tokens. Testes de navegador do painel usam
API isolada para não publicar imagens/empresas de teste no portal. O banco real é
conferido somente com os quatro rascunhos solicitados. Um teste em iPhone/Android
físico e a conferência final das artes reais ainda dependem dos arquivos do dono.
