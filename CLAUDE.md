# Dashboard Reis Phones / Soft Blindagem

Arquivo único `index.html` (HTML + CSS + JS inline, Chart.js via CDN, dados lidos
ao vivo das planilhas Google). Publicado no GitHub Pages:
**https://reiphones2021-sketch.github.io/dashboard/** — público, sem login.
Cada push na `main` republica (workflow `.github/workflows/pages.yml`).
`trabalho.html` é uma cópia antiga; a página servida é `index.html`.

## 🔒 TRAVA — leia antes de editar

Existe uma suíte de regressão em `tests/` que protege tudo que já foi entregue e
aprovado pelo dono. Ela roda:

- localmente, em todo commit (`.githooks/pre-commit` — ativar uma vez com
  `git config core.hooksPath .githooks`);
- no GitHub Actions, **antes** do deploy: se falhar, a versão não é publicada.

Regras para qualquer edição futura:

1. **Rode `npm test` antes de commitar.** (`npm install` na primeira vez.)
2. **Se um teste falhar, conserte a edição — nunca o teste.** Alterar, afrouxar
   ou remover verificações em `tests/` só com pedido explícito do dono, e a
   mudança deve ser dita claramente a ele.
3. **Não remova nem altere o comportamento das funcionalidades travadas**
   (lista abaixo), mesmo que pareçam não relacionadas com a tarefa.
4. Novas funcionalidades aprovadas devem **entrar na trava**: adicione um bloco
   em `tests/roteiro.js` (e, se precisar de dados, em `tests/fixtures.js`).
5. Depois de publicar, confirme no site no ar (o teste de navegador em Chrome
   real usado nas entregas ficou fora do repositório; use `npm test` como piso).

## Funcionalidades travadas (o que os testes garantem)

- **Período padrão ao abrir**: mês atual do calendário, do dia 1 até hoje
  (`drpLastM()` usa o calendário, não a planilha). Atalho "Este mês, até agora".
- **Datas da planilha** (`parseDt`): `"11/09"` sem ano assume o ano atual,
  `"11/09/26"` completa o século, ano inválido/lixo descarta só a linha. Uma
  data quebrada nunca pode derrubar o seletor de período (já aconteceu).
- **Aba 🧑‍💼 Vendedores nas duas empresas**, mesmo racional, parametrizado em
  `vendCfg()`:
  - Soft: faturamento por serviço; produto = coluna PRODUTO.
  - Reis: lucro bruto por aparelho (só `dev`, acessórios/assistência fora);
    produto = modelo (`r.mod`, com APPLE WATCH/IPAD/MACBOOK por tipo);
    KPI traz o faturamento de apoio; ranking tem coluna Faturamento; a
    leitura informa a % de aparelhos vendidos para lojista.
  - **Seleção múltipla:** os vendedores são chips de marcar/desmarcar
    (`#vendChips`), não mais um `<select>` de um só. `window._vendSel` é uma
    LISTA; lista vazia = toda a equipe. Marcados dois ou mais, tudo soma
    entre eles (clientes e dias sem repetir, porque `somaTudo` une os Sets).
    Posição no ranking e a comparação com a média da equipe só aparecem com
    um vendedor só, que é quando fazem sentido.
  - Cores: verde (Soft) / azul (Reis). Ranking e pizza clicáveis deixam só o
    vendedor clicado (`onVendChangeDireto`).
  - Trocar de empresa com a aba aberta mantém a aba; se o vendedor não existe
    na outra empresa, volta para "Toda a equipe".
- **Soft — Visão Geral**: garantia estendida em **2 grupos** (Reis Phones e
  Soft Blindagem). A "GARANTIA ESTENDIDA" genérica do histórico (antes de
  ago/2026) conta como Soft Blindagem. Não existe mais card genérico.
- **Soft — ranking completo de produtos** (não só top 10), com faturamento por
  produto e filtro que ignora acentos/maiúsculas. Status `HOJE` conta como
  venda (`SOFT_STATUS_OK`), preço zero é descartado.
- **Gráfico "Vendas diárias" clicável**: clicar numa barra aplica aquele dia
  como período do dashboard inteiro (`irParaDia` → `aplicarPeriodoFixo`),
  rola ao topo, mostra "↩ Voltar ao período" na barra de período e no card;
  `voltarPeriodo()` restaura o período anterior; escolher período no seletor
  cancela o Voltar. Com um dia só, a barra não é clicável. O `onClick` usa
  `setTimeout` porque o `renderAll` recria o gráfico no meio do evento.
- **Pizza "por vendedor" clicável** (fatia e legenda) e linhas do
  "Detalhamento por vendedor": abrem a aba Vendedores com o vendedor
  selecionado (`abrirVendedor`). A legenda não esconde fatias.
- **Celular**: sem rolagem horizontal (`.cg>*,.kg>*,.split>*{min-width:0}`,
  `#cmpTable,#compTable{overflow-x:auto}`); gráficos redimensionam ao trocar
  de aba. Favicon embutido.
- **🎯 Metas Diárias** — terceiro botão do seletor de empresa (ao lado de Reis
  e Soft), painel `#p-metas`. Porte da ferramenta que o sócio fez em
  `metas-diarias.html`; roda isolada em `window.Metas` (o dashboard já usa os
  nomes `state`, `fmt`, `pct` e `CHARTS`) e guarda tudo no `localStorage`, na
  chave `metas_v5` **apenas como cache** — quem manda é a nuvem.
  - **As metas vivem no Supabase e sincronizam em tempo real.** Projeto
    `bbsklyfbswtirlexclrx` (ECOMMERCE REIS PHONES), tabela
    `public.dashboard_metas`, linha única `global`, coluna `dados` (jsonb).
    Editar num aparelho refaz a linha; os outros recebem por
    `postgres_changes` e se redesenham na hora. RLS aberta (o site é
    público e sem login, como a calculadora). A escrita é agrupada em 400ms
    e carimbada com `atualizado_por`, para o aparelho ignorar o próprio eco.
    O selo no topo do painel mostra o estado e reconecta se for clicado.
  - **O que NÃO vai para a nuvem:** `feitoReis`/`feitoSoft`, que cada
    aparelho lê da planilha. Alteração remota que chega com um campo em
    edição só é aplicada no `focusout`, para não apagar o que se digita.
  - **Já feito é lido ao vivo da planilha**, do dia 1 do mês até hoje, pelas
    mesmas contas do hero: Reis Phones = lucro bruto (soma de `lb`), Soft
    Blindagem = faturamento (soma de `vtc`). Não existe campo para digitar
    esse valor. Carrega as duas empresas com `ensureCompanyData` ao abrir o
    painel; "⟳ Atualizar da planilha" força o refetch das duas.
  - O usuário só define **meta total** e **dias restantes**. O campo de dias
    não tem teto (só o piso de 1): dá para pôr mais de 31 e simular prazos,
    para comparar com dias anteriores.
  - Meta diária = (meta total − já feito) ÷ dias restantes, nunca negativa.
  - **"Meta total" se formata sozinha enquanto se digita** (e o "já feito" das
    metas extras, que continua na mão): o que se digita é valor em reais, não
    centavos — `120000` vira `120.000` a cada tecla e fecha em `120.000,00` ao
    sair do campo. O cursor não pula para o fim ao editar no meio. Ponto
    digitado é tratado como vírgula (teclado numérico), porque o ponto de
    milhar já entra sozinho.
  - `parseBR` aceita `98.366,22`, `98366,22`, `98366.22`, `R$ 98.366,22` e
    `120.000` (grupos de 3 dígitos = milhar, então dá 120000 e não 120);
    texto inválido vira 0, nunca `NaN`.
  - "Salvar como referência" congela as diárias; daí em diante cada card
    mostra a variação (vermelho = subiu, verde = caiu) e o selo é clicável.
  - Cards com doughnut de progresso, adicionar/remover meta, seção de metas
    extras com título editável e "já feito" próprio por card.
  - **Metas extras puxam Assistência e Acessórios da Soft.** Cada meta extra
    tem um seletor de fonte: `manual` (digitado, como antes), `assist` ou
    `acess`. As duas últimas somam o faturamento do mês pelo mesmo critério
    dos cards da Visão Geral da Soft — `softCatProd`, extraída para o escopo
    global justamente para tela e meta nunca divergirem.
  - Meta extra sem fonte escolhida cujo nome contém "assist"/"acess" nasce
    ligada (`palpitarFontes`), e esse palpite sobe para a nuvem uma vez, em
    vez de ser readivinhado a cada abertura. O que é lido da planilha não
    viaja: a nuvem leva a `fonte`, não o `feito`.
  - Copiar para WhatsApp (Reis, Soft e Tudo). Não existe exportar/importar:
    o realizado vem da planilha em qualquer aparelho e as metas ficam no
    `localStorage` de cada navegador.
  - Abrir o painel esconde barra de período, hero e abas; clicar numa empresa
    fecha as metas e devolve a aba que estava aberta.
- **Soft Blindagem lê pela API do Sheets**, achando a aba pelo gid
  (`fetchRangeFromSheet`), igual à Reis. O CSV de "Publicar na web" ficou
  só como reserva, para quando a API falhar: o Google serve esse CSV em
  cache e, em 26/10/2026, depois de a planilha ser consertada, ele ainda
  devolveu por minutos a versão velha e vazia.
- **Planilha sem nenhuma linha vira aviso, não R$ 0,00.** Faixa âmbar abaixo
  do cabeçalho (`#avisoDados`, pintada por `pintarAvisoDados` no início do
  `renderAll`) dizendo de qual empresa é a planilha, com botão de tentar de
  novo. Nenhuma das duas empresas passa um mês sem lançar nada, então zero
  linhas é sempre falha de leitura — e antes disso o dashboard mostrava o
  zero como se fosse o resultado real.
- **Nenhum `NaN`/`undefined`/`Infinity`** em nenhuma aba, nas duas empresas,
  inclusive com período de um dia.

## Como testar

```
npm install      # primeira vez
npm test         # trava de regressão (jsdom + planilhas sintéticas em tests/fixtures.js)
```

Os testes não acessam a internet nem dados reais: `tests/fixtures.js` gera
planilhas sintéticas relativas à data de hoje. `tests/roteiro.js` roda dentro
da página (mesmo escopo do script do `index.html`).
