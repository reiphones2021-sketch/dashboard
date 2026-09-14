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
  - Cores: verde (Soft) / azul (Reis). Ranking clicável seleciona o vendedor.
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
