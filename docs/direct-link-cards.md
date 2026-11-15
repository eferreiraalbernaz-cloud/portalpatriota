# Cards publicitários por Direct Link

A [documentação oficial Monetag](https://help.monetag.com/en/articles/6726647-direct-link-smart-link-direct-ads)
permite integrar Direct Links em textos, botões e imagens próprios. A implementação
usa uma âncora HTML para `https://uplcm.com/4/12272346`, somente por clique voluntário,
com `target="_blank"` e `rel="sponsored noopener noreferrer"`. Não há script do Direct
Link, prefetch, pixel, timer, iframe, clique automático ou redirecionamento no portal.
O In-Page Push 12271754 permanece independente e preservado.

## Configurar

1. Entre no painel e abra **Configurações → Cards publicitários**.
2. Envie uma imagem autorizada (JPG, PNG, WebP ou AVIF, até 8 MB). A URL é preenchida
   após o upload. Prefira proporção 3:2. Também são aceitas imagens locais em `/ads/`.
3. Preencha título (3–100 caracteres) e descrição (10–240 caracteres).
4. Confira o Direct Link. O campo aceita URLs HTTPS de `uplcm.com/4/` e inicia com
   o link fornecido. Outros hosts requerem validação técnica antes de serem aceitos.
5. Revise a prévia, que não abre o link. Confirme a zona no Monetag e a autorização
   da imagem/texto, incluindo sua compatibilidade com ofertas variáveis do SmartLink.
6. Marque **Ativar cards publicitários nas páginas públicas** e salve.
7. Confira home, editoria e busca em desktop/celular. Para interromper, desmarque
   a ativação e salve. Novas visitas recebem a configuração atualizada.

É possível salvar um rascunho desativado sem texto/imagem. Não há criativo padrão:
nenhuma marca, oferta ou produto foi inventado. Substituir a imagem desmarca a revisão e a ativação no formulário; edições de
texto preservam a confirmação existente.

## Exibição

- Um card depois das notícias 4, 8, 12 etc. de cada grade.
- Grades com 1–3 notícias: apenas um card ao final.
- Grades vazias: nenhum card; as notícias e mensagens existentes são preservadas.
- Cada card tem identificação **PUBLICIDADE** e aparência diferente dos cards editoriais.
- Configuração desativada, incompleta, sem revisão ou indisponível: nenhum card.
- Falha ao carregar a imagem oculta o card correspondente.
- Recusar publicidade nas preferências do rodapé também oculta os cards.
- Os cards não são montados no painel ou em páginas de autenticação. A prévia no
  painel é deliberadamente identificada e não contém link clicável.

O clique abre o Monetag em outra aba. A plataforma pode redirecionar para uma oferta
variável após esse clique; o portal não controla a campanha final. Não prometa um
produto, preço ou marca sem comprovar que o destino atende ao criativo. A permissão
geral na documentação não comprova o status ou aprovação da zona privada 12272346.

## Persistência e segurança

A tabela `advertising_creative` usa RLS. Visitantes só podem ler um criativo ativo
e revisado. Escrita fica no backend com a chave privada, após validação da sessão
administrativa e da origem da requisição. Upload usa o endpoint autenticado já
existente. A consulta pública retorna ausência de criativo em caso de falha, sem
impedir o carregamento das notícias. Não houve alteração de autenticação, Instagram,
IA, cron, sitemap, robots, canônicas ou verificações de propriedade.

A migração `20261115193058_direct_link_cards.sql` foi aplicada no projeto
`dikhcnfoxzchsjgleoww`, inicialmente com cards desativados e os campos de criativo
vazios. O número do arquivo acompanha o histórico remoto da migração.

## Verificação

```sh
pnpm typecheck
pnpm build
node --test tests/*.test.cjs
```

A validação do navegador usa criativos fictícios **somente em uma página de teste
isolada**, sem gravá-los no banco ou publicar ofertas. O destino é interceptado
pelo teste para conferir a abertura por clique sem enviar tráfego ao Monetag.
A configuração de produção permanece vazia até o responsável fornecer um criativo
real. Não foi comprovada receita ou aprovação de uma oferta específica.

Após configurar um criativo, confirme no Monetag que a zona é Direct Link, está ativa,
pertence à conta/domínio corretos e aceita o material escolhido. Verifique o destino
e os resultados no painel do provedor, sem gerar cliques artificiais para testes.
