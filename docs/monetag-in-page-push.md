# Monetag In-Page Push

A integração usa somente a tag fornecida para a zona **12271754**:
`https://nap5k.com/tag.min.js`, com `data-zone="12271754"` no elemento script.
Não há integração com a zona 12194090 nem registro de Service Worker.
A meta tag `monetag` da página inicial e a verificação Google permanecem no código.

O componente cliente `MonetagAdvertising` está no layout `(site)`, compartilhado
pelas páginas públicas. Em visitas identificadas como brasileiras pela Cloudflare,
a tag é carregada automaticamente após a página terminar de carregar. Não há
pedido inicial de aceite nem atraso artificial de um segundo. Uma recusa já
armazenada continua sendo respeitada. A exibição automática não é gravada como
consentimento.

A origem do país é `request.cf.country`. O Worker substitui o cabeçalho interno
`x-portal-viewer-country`, ignorando valores enviados pelo visitante. Somente
`BR` usa exibição automática; outros países e localização desconhecida continuam
com aceite prévio. A regra conservadora fora do Brasil preserva, inclusive, o
opt-in europeu exigido pela seção 9 dos [termos do Monetag](https://monetag.com/terms/).
A configuração técnica não substitui a definição e documentação da base legal
pelo responsável pelo tratamento conforme a LGPD.

A tag é assíncrona e inserida no `head`. Um identificador estável e um marcador por
documento impedem duplicação inclusive em remontagens. A navegação pública do App
Router preserva a integração. O host deve corresponder à origem
`NEXT_PUBLIC_SITE_URL`; URLs alternativas do Worker não carregam anúncios quando
o domínio configurado é o Pages.

As preferências podem ser alteradas no rodapé. A escolha é armazenada por 180 dias.
Desativar após carregar a tag recarrega o documento para encerrar timers/listeners
do fornecedor. Mudanças em outras abas e expiração são verificadas por evento de
storage, retorno à aba e a cada minuto. Isso não remove cookies de terceiros nem
desfaz processamento anterior. Se não for possível armazenar uma recusa, os
anúncios automáticos não são iniciados.

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
node --test tests/advertising.test.cjs tests/viewer-country.test.cjs
```

No navegador, sem bloqueador, use uma sessão privada e confirme:

1. Brasil, navegador sem preferência salva: a tag deve carregar sem clique.
   Outras regiões/desconhecidas: nenhuma requisição antes de aceitar.
   Uma recusa salva deve impedir a tag em qualquer região.
2. Com publicidade habilitada: uma tag no head, com `data-zone="12271754"`, e resposta de rede
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

## Frequência e pesquisa de portais

Foi feita uma observação curta das homepages móveis de g1, CNN Brasil e UOL,
com três amostras de cerca de seis segundos e rolagem entre elas. Foram detectados
os seguintes números de iframes publicitários distintos presentes no DOM:

| Portal | Primeira amostra | Segunda amostra | Terceira amostra |
| --- | ---: | ---: | ---: |
| [g1](https://g1.globo.com/) | 0 | 1 | 2 |
| [CNN Brasil](https://www.cnnbrasil.com.br/) | 2 | 2 | 3 |
| [UOL Notícias](https://noticias.uol.com.br/) | 1 | 2 | 2 |

Esses números são uma amostra de posicionamento/carregamento, não uma medição de
impressões ou refresh. Contêiner e iframe do mesmo anúncio foram contados como um
único slot. A amostra mostrou anúncios distribuídos e posições fixas; não permite
concluir um intervalo universal em segundos. Esses sites usam formatos além de IPP,
portanto copiar sua quantidade de slots para uma única zona Monetag seria inadequado.

A [documentação Monetag](https://help.monetag.com/en/articles/6726726-how-many-ads-can-i-place-on-one-webpage)
orienta inserir cada zona uma vez. Não há parâmetro de refresh suportado na tag
fornecida. Não foi implementado timer para reinjetar scripts, recarregar páginas,
gerar impressões artificiais ou ignorar o limite do fornecedor.

Solicitação pronta para o painel/suporte Monetag:

> Para portalpatriotabr.pages.dev, zona 12271754, confirme que o formato é somente
> In-Page Push (Banner), que a zona está ativa e por que as consultas retornam 204.
> Quero aumentar as impressões elegíveis sem outros formatos. Quais controles
> oficiais estão disponíveis para atraso inicial, intervalo, limite por usuário e
> reapresentação durante navegação SPA? Informe a configuração suportada e seus
> valores atuais antes de ajustarmos a frequência.

Não foi enviada mensagem ao suporte nem alterada a configuração privada da zona.
