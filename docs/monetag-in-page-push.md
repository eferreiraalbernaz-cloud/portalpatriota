# Monetag In-Page Push

A integração usa somente a tag fornecida para a zona **12271754**:
`https://nap5k.com/tag.min.js`, com `data-zone="12271754"` no elemento script.
Não há integração com a zona 12194090 nem registro de Service Worker.
A meta tag `monetag` da página inicial e a verificação Google permanecem no código.

O componente cliente `MonetagAdvertising` está no layout `(site)`, compartilhado
pelas páginas públicas. Ele aguarda consentimento explícito, o evento de conclusão
do carregamento da página e mais um segundo antes de inserir uma tag assíncrona
no `head`. O identificador estável e um marcador por documento impedem duplicação
inclusive em remontagens. A navegação pública do App Router preserva a integração.
O host deve corresponder à origem `NEXT_PUBLIC_SITE_URL`; URLs alternativas do
Worker não carregam anúncios quando o domínio configurado é o Pages.

As preferências podem ser alteradas no rodapé. Aceitar e recusar têm o mesmo
destaque. A escolha é armazenada por 180 dias; sem consentimento válido, nenhum
script de publicidade é requisitado. A revogação após carregar a tag recarrega o
documento para encerrar timers/listeners do fornecedor. Mudanças em outras abas e
expiração são verificadas por evento de storage, retorno à aba e a cada minuto.
Isso não remove cookies de terceiros nem desfaz processamento anterior.

O link de entrada no painel usa navegação de documento completo. Como proteção
adicional, `AdFreeBoundary` reinicia o documento se uma navegação do App Router
chegar ao layout administrativo com publicidade já iniciada. Visitas diretas ao
painel/login/recuperação/definição de senha nunca montam o carregador.

Para interromper a integração nas novas visitas, configure
`MONETAG_IPP_DISABLED=true` no servidor e publique novamente. Abas já abertas
precisam recarregar para receber uma alteração de implantação.

## Verificações

```sh
pnpm typecheck
pnpm build
node --test tests/advertising.test.cjs
```

No navegador, sem bloqueador, use uma sessão privada e confirme:

1. Antes de aceitar ou após recusar: nenhuma requisição para `nap5k.com`.
2. Após aceitar: uma tag no head, com `data-zone="12271754"`, e resposta de rede
   para `tag.min.js`. `data-load-state="loaded"` confirma o carregamento do arquivo,
   mas **não** comprova impressão de anúncio ou receita.
3. Navegue por categorias, busca e matérias: a tag não deve ser inserida novamente
   dentro do mesmo documento. Navegação completa/reload inicia um novo documento.
4. Revogue no rodapé: ocorre reload e a tag não volta. Teste também a revogação
   em outra aba.
5. Visite `/admin/login`, `/admin/recuperar-senha` e `/admin/definir-senha`
   diretamente e após navegar no site. Não deve existir tag nem requisição nova
   de publicidade nesses documentos.
6. Confira Console, leitura, menu, pesquisa e layout móvel; preserve metadados,
   canônicas, sitemap, robots e a meta tag de propriedade.

Um teste exploratório da tag no domínio público retornou HTTP 200 para o script
e HTTP 204 para a consulta da zona no provedor, sem criativo visível naquela
consulta. Isso pode representar ausência de anúncio elegível para a sessão;
não comprova exibição ou receita. A configuração de formato/status da zona deve
continuar exclusivamente In-Page Push (Banner) no painel Monetag. Não trocar a
tag por MultiTag nem ativar outros formatos para tentar aumentar preenchimento.

Em caso de bloqueio ou ausência de anúncio, informe ao suporte Monetag domínio,
zona, navegador/dispositivo, país e horário do teste. Consulte também o
[diagnóstico oficial](https://help.monetag.com/en/articles/6745314-i-don-t-see-any-ads-on-my-site-what-should-i-do).
