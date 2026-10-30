// Roteiro executado DENTRO da página (mesmo escopo do script do index.html).
// Devolve {passos:[{bloco,nome,ok,detalhe}], excecoes:[]}.
(async function () {
  const R = { passos: [], excecoes: [] };
  let BLOCO = '';
  const bloco = n => { BLOCO = n; };
  const ok = (nome, cond, detalhe) => R.passos.push({ bloco: BLOCO, nome, ok: !!cond, detalhe: detalhe === undefined ? '' : String(detalhe) });
  const q = s => Array.from(document.querySelectorAll(s));
  const el = i => document.getElementById(i);
  const txt = i => { const e = el(i); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(elemento ausente)'; };
  const nb = s => String(s).replace(/ /g, ' ');
  const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));
  const visivel = i => { const e = el(i); return !!e && e.style.display !== 'none'; };
  const semAcento = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Vendedores agora são chips de marcar/desmarcar: a seleção é uma lista,
  // e lista vazia quer dizer "toda a equipe".
  const vendSelecionados = () => (window._vendSel || []).slice();
  const vendChips = () => q('#vendChips .vend-chip');
  const vendChip = nome => vendChips().find(c => c.textContent.trim() === nome);

  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const hojeIso = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
  const mesIni = hojeIso.slice(0, 7) + '-01';
  const brIso = s => { const [d, m, y] = String(s).split('/'); return (y || hoje.getFullYear()) + '-' + m.padStart(2, '0') + '-' + d.padStart(2, '0'); };

  // ── expectativas calculadas direto das planilhas sintéticas ──────────
  const REIS = window.__REIS, SOFT = window.__SOFT;
  const rH = REIS[0], sH = SOFT[0];
  const rCol = n => rH.indexOf(n), sCol = n => sH.indexOf(n);
  const reisRows = REIS.slice(1).map(r => ({ status: r[rCol('STATUS')], dt: brIso(r[rCol('DATA')]), vend: r[rCol('VENDEDOR')], tipo: r[rCol('TIPO')], gar: r[rCol('GARANTIA')], vtc: +r[rCol('VALOR TOTAL COLETADO')], lb: +r[rCol('LUCRO')] }))
    .filter(r => r.status === 'FEITO' && r.dt >= '2000-01-01');
  const reisPeriodo = reisRows.filter(r => r.dt >= mesIni && r.dt <= hojeIso);
  const ehAparelho = t => ['IPHONE', 'APPLE WATCH', 'IPAD'].includes(t);
  const reisAparelhos = reisPeriodo.filter(r => ehAparelho(r.tipo));
  const softRows = SOFT.slice(1).map(r => ({ vend: r[sCol('VENDEDOR')], dt: brIso(r[sCol('DATA')]), prod: r[sCol('PRODUTO VENDIDO')], preco: parseFloat(String(r[sCol('PREÇO')]).replace(',', '.')), status: r[sCol('STATUS')] }))
    .filter(r => ['PAGO', 'HOJE'].includes(r.status) && r.preco > 0);
  const softPeriodo = softRows.filter(r => r.dt >= mesIni && r.dt <= hojeIso);

  try {
    // ══ carga ══════════════════════════════════════════════════════════
    const reis = parseFatAPI(REIS);
    const soft = await parseSoftAPI(SOFT);
    _cache.reis = { sales: reis, custos: [] };
    _cache.soft = { sales: soft, custos: [] };
    ACTIVE_COMPANY = 'reis'; SALES = reis; CUSTOS = [];
    initSel(true); // exatamente o que a página faz ao abrir
    await tick();

    bloco('Datas da planilha (parseDt)');
    ok('"11/09" sem ano assume o ano atual', parseDt('11/09') === hoje.getFullYear() + '-09-11', parseDt('11/09'));
    ok('"11/09/26" completa o século', parseDt('11/09/26') === '2026-09-11', parseDt('11/09/26'));
    ok('"5/9/2026" com um dígito', parseDt('5/9/2026') === '2026-09-05');
    ok('ano lixo (0204) é descartado', parseDt('12/12/0204') === null);
    ok('texto inválido é descartado', parseDt('abc') === null && parseDt('') === null);
    ok('"HOJE" vira a data de hoje', parseDt('HOJE') === hojeIso);
    ok('venda lançada sem ano entrou na Reis', reis.some(r => r.cli === 'CLIENTE SEM ANO' && r.dt === hojeIso));
    ok('venda com ano 0204 ficou de fora', !reis.some(r => r.cli === 'CLIENTE ANO ERRADO'));
    ok('nenhuma data inválida sobrevive ao parser', reis.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.dt)) && soft.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.dt)));

    bloco('Período padrão ao abrir a página');
    ok('começa no dia 1 do mês atual', window._startStr === mesIni, window._startStr);
    ok('termina hoje', window._endStr === hojeIso, window._endStr);
    ok('atalho ativo é "Este mês, até agora"', txt('drpPresetTxt') === 'Este mês, até agora', txt('drpPresetTxt'));
    ok('seletor mostra o período (não "Selecione o período")', txt('drpTxt') !== 'Selecione o período', txt('drpTxt'));
    ok('contagem de vendas bate com a planilha', txt('pinfo') === reisPeriodo.length + ' vendas', txt('pinfo') + ' vs ' + reisPeriodo.length);

    bloco('Recordes (Reis) usam a mesma conta do hero');
    {
      const mesLb = {}, diaLb = {};
      reis.forEach(r => { mesLb[r.m] = (mesLb[r.m] || 0) + (r.lb || 0); diaLb[r.dt] = (diaLb[r.dt] || 0) + (r.lb || 0); });
      const maxMes = Math.max(...Object.values(mesLb)), maxDia = Math.max(...Object.values(diaLb));
      ok('melhor mês = maior lucro bruto mensal (todas as vendas)', nb(txt('recMesLb')).includes(nb(BRL(maxMes))), txt('recMesLb') + ' vs ' + BRL(maxMes));
      ok('melhor dia = maior lucro bruto diário (todas as vendas)', nb(txt('recDiaLb')).includes(nb(BRL(maxDia))), txt('recDiaLb') + ' vs ' + BRL(maxDia));
      ok('recorde do mês nunca fica abaixo do hero', nb(txt('recMesLb')).includes(nb(BRL(maxMes))) && maxMes >= reis.filter(r => r.dt >= mesIni && r.dt <= hojeIso).reduce((s, r) => s + (r.lb || 0), 0));
    }
    ok('hero preenchido', q('.hero-value').some(e => e.textContent.trim() && e.textContent.trim() !== '—'), q('.hero-value').map(e => e.textContent.trim()).join(' | '));

    bloco('Reis Phones — aba Vendedores');
    ok('aba Vendedores visível na Reis', visivel('tabVendedores'));
    showTab('vendedores', el('tabVendedores'));
    ok('painel ativo', el('p-vendedores').classList.contains('active'));
    const kReis = txt('kg-vend');
    ok('métrica principal é Lucro bruto', kReis.includes('Lucro bruto'), kReis.slice(0, 60));
    ok('unidade é Aparelhos', kReis.includes('Aparelhos'));
    ok('faturamento aparece como apoio', /Faturamento R\$/.test(nb(kReis)));
    const vendsReis = [...new Set(reisAparelhos.map(r => r.vend))];
    ok('lista os vendedores do período (+ "toda a equipe")', vendChips().length === vendsReis.length + 1, vendChips().length + ' chips vs ' + vendsReis.length + ' vendedores');
    ok('título do gráfico: Lucro bruto — últimos 6 meses', txt('vendEvoCt').startsWith('Lucro bruto — últimos 6 meses'), txt('vendEvoCt'));
    ok('produtos são modelos', txt('vendProdCt').startsWith('Modelos vendidos'), txt('vendProdCt'));
    const modelos = q('#vendProdBars > div > span:first-child').map(e => e.firstChild.textContent);
    ok('modelos agrupados (IPHONE 15 PRO MAX, APPLE WATCH…)', modelos.includes('IPHONE 15 PRO MAX') && modelos.includes('APPLE WATCH') && modelos.includes('IPAD'), modelos.join(' / '));
    ok('acessórios e assistência ficam fora', modelos.every(m => !/ACESS|ASSIST/.test(m)));
    const thsReis = q('#vendTable th').map(e => e.textContent);
    ok('ranking: Aparelhos | Faturamento | Lucro bruto | Ticket | Δ Lucro', thsReis.join('|') === 'Vendedor|Aparelhos|Anterior|Faturamento|Lucro bruto|Anterior|Ticket|Δ Lucro', thsReis.join('|'));
    ok('leitura fala em lucro bruto e lojista', /lucro bruto/.test(txt('vendFeedback')) && /lojista/.test(txt('vendFeedback')));
    const lbEsperado = reisAparelhos.reduce((s, r) => s + r.lb, 0);
    ok('total da equipe = soma do lucro bruto dos aparelhos', nb(txt('vendBadge')).includes(nb(BRL(lbEsperado))), txt('vendBadge') + ' vs ' + BRL(lbEsperado));
    onVendChangeDireto(vendsReis[0]);
    ok('clique no ranking seleciona o vendedor', vendSelecionados().join('|') === vendsReis[0] && txt('vendEvoCt').includes(vendsReis[0]), vendSelecionados().join('|'));
    ok('linha destacada em azul (cor da Reis)', el('vendTable').innerHTML.includes('rgba(29,90,154,.10)'));
    onVendChangeDireto('__TODOS__');

    bloco('Reis Phones — pizza e detalhamento levam ao vendedor');
    showTab('visao', q('.tabs .tab')[0]);
    const pie = window.__charts['c-vendPie'];
    ok('pizza existe e tem onClick', pie && typeof pie.options.onClick === 'function');
    ok('legenda da pizza navega em vez de esconder fatia', pie && pie.options.plugins.legend && typeof pie.options.plugins.legend.onClick === 'function');
    pie.options.onClick({}, [{ index: 0 }]); await tick(30);
    ok('fatia → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && vendSelecionados().join('|') === pie.data.labels[0], vendSelecionados().join('|'));
    showTab('visao', q('.tabs .tab')[0]);
    pie.options.plugins.legend.onClick({}, { index: 1 }); await tick(30);
    ok('legenda → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && vendSelecionados().join('|') === pie.data.labels[1], vendSelecionados().join('|'));
    showTab('visao', q('.tabs .tab')[0]);
    const linhasDet = q('#vendDetail .br-row');
    ok('linhas do detalhamento são clicáveis', linhasDet.length > 0 && linhasDet.every(r => (r.getAttribute('onclick') || '').includes('abrirVendedor')));
    eval(linhasDet[linhasDet.length - 1].getAttribute('onclick')); await tick(30); // jsdom não dispara onclick inline
    ok('detalhamento → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && vendSelecionados().join('|') === linhasDet[linhasDet.length - 1].querySelector('.br-lbl').textContent, vendSelecionados().join('|'));

    bloco('Gráfico de vendas diárias — barra clicável');
    showTab('visao', q('.tabs .tab')[0]);
    const antes = { s: window._startStr, e: window._endStr, pinfo: txt('pinfo'), preset: txt('drpPresetTxt') };
    const diario = window.__charts['c-dailySales'];
    ok('gráfico existe e tem onClick', diario && typeof diario.options.onClick === 'function');
    ok('botão Voltar escondido antes do clique', !visivel('btnVoltarDia') && !visivel('btnVoltarDia2'));
    ok('dica "clique numa barra" visível', visivel('dailyHint'));
    const idx = Math.min(1, diario.data.labels.length - 1);
    const rot = diario.data.labels[idx]; // "d/MM"
    const diaIso = window._startStr.slice(0, 7) + '-' + rot.split('/')[0].padStart(2, '0');
    diario.options.onClick({}, [{ index: idx }]); await tick(60);
    ok('clique fixa o dia como período', window._startStr === diaIso && window._endStr === diaIso, window._startStr + '→' + window._endStr + ' (esperado ' + diaIso + ')');
    ok('atalho mostra "Dia escolhido no gráfico"', txt('drpPresetTxt') === 'Dia escolhido no gráfico', txt('drpPresetTxt'));
    ok('contagem passa a ser só do dia', txt('pinfo') === reisRows.filter(r => r.dt === diaIso).length + ' vendas', txt('pinfo'));
    ok('botão Voltar aparece na barra de período e no gráfico', visivel('btnVoltarDia') && visivel('btnVoltarDia2'));
    ok('gráfico com um dia só não é clicável de novo', (() => { const g = window.__charts['c-dailySales']; const s0 = window._startStr; g.options.onClick({}, [{ index: 0 }]); return window._startStr === s0; })());
    ok('aba Vendedores acompanha o dia', (showTab('vendedores', el('tabVendedores')), txt('vendPeriodo').includes('(' + (+diaIso.slice(8)) + '–' + (+diaIso.slice(8)) + ')')), txt('vendPeriodo'));
    showTab('visao', q('.tabs .tab')[0]);
    voltarPeriodo(); await tick(60);
    ok('Voltar restaura o período anterior', window._startStr === antes.s && window._endStr === antes.e && txt('pinfo') === antes.pinfo && txt('drpPresetTxt') === antes.preset, window._startStr + '→' + window._endStr + ' ' + txt('drpPresetTxt'));
    ok('botão Voltar some após voltar', !visivel('btnVoltarDia') && !visivel('btnVoltarDia2'));
    window.__charts['c-dailySales'].options.onClick({}, [{ index: 0 }]); await tick(60);
    drpOpen(); drpApplyPreset('ult7'); el('btnAp').click(); await tick(60);
    ok('escolher período no seletor cancela o Voltar', !visivel('btnVoltarDia2') && window._periodoAnterior == null);
    drpOpen(); drpApplyPreset('este_mes_hoje'); el('btnAp').click(); await tick(60);

    bloco('Troca de empresa com a aba Vendedores aberta');
    showTab('vendedores', el('tabVendedores'));
    onVendChangeDireto(vendsReis[0]);
    switchCompany('soft'); await tick(120);
    ok('aba Vendedores continua ativa na Soft', el('p-vendedores').classList.contains('active') && visivel('tabVendedores'));
    ok('dados da Soft carregados', SALES.length === soft.length, SALES.length);
    ok('período mantido', window._startStr === mesIni && window._endStr === hojeIso);

    bloco('Soft Blindagem — aba Vendedores');
    const kSoft = txt('kg-vend');
    ok('métrica principal é Faturamento', kSoft.includes('Faturamento'), kSoft.slice(0, 60));
    ok('unidade é Serviços', kSoft.includes('Serviços'));
    ok('título do gráfico: Faturamento — últimos 6 meses', txt('vendEvoCt').startsWith('Faturamento — últimos 6 meses'), txt('vendEvoCt'));
    ok('produtos vêm da coluna PRODUTO', txt('vendProdCt').startsWith('Produtos vendidos'), txt('vendProdCt'));
    const thsSoft = q('#vendTable th').map(e => e.textContent);
    ok('ranking: Serviços | Faturamento | Ticket | Δ Fat.', thsSoft.join('|') === 'Vendedor|Serviços|Anterior|Faturamento|Anterior|Ticket|Δ Fat.', thsSoft.join('|'));
    ok('leitura usa "faturou"', /faturou/.test(txt('vendFeedback')));
    const vendsSoft = [...new Set(softPeriodo.map(r => r.vend))];
    ok('lista os vendedores do período (+ "toda a equipe")', vendChips().length === vendsSoft.length + 1, vendChips().length + ' vs ' + vendsSoft.length);
    const fatEsperado = softPeriodo.reduce((s, r) => s + r.preco, 0);
    ok('total da equipe = faturamento (PAGO + HOJE, preço > 0)', nb(txt('vendBadge')).includes(nb(BRL(fatEsperado))), txt('vendBadge') + ' vs ' + BRL(fatEsperado));
    onVendChangeDireto('PIERRE');
    ok('linha destacada em verde (cor da Soft)', el('vendTable').innerHTML.includes('rgba(13,158,80,.10)'));

    bloco('Soft Blindagem — Visão Geral: garantias e ranking de produtos');
    showTab('visao', q('.tabs .tab')[0]);
    ok('contagem de serviços inclui status HOJE', txt('pinfo') === softPeriodo.length + ' serviços', txt('pinfo') + ' vs ' + softPeriodo.length);
    const cardsGar = q('#splitCards .sc').filter(e => /gar/i.test(e.querySelector('.sc-title').textContent));
    ok('exatamente 2 cards de garantia (Reis Phones e Soft Blindagem)', cardsGar.length === 2, cardsGar.map(e => e.querySelector('.sc-title').textContent.trim()).join(' / '));
    ok('não existe mais o card genérico "Garantia Estendida"', !q('#splitCards .sc-title').some(e => /^✅ Garantia Estendida$/.test(e.textContent.trim())));
    const garSoftEsp = softPeriodo.filter(r => /GARANTIA/.test(r.prod) && !/REIS/.test(r.prod)).length;
    const garReisEsp = softPeriodo.filter(r => /GARANTIA/.test(r.prod) && /REIS/.test(r.prod)).length;
    const cardSoft = cardsGar.find(e => /Soft/i.test(e.textContent)), cardReis = cardsGar.find(e => /Reis/i.test(e.textContent));
    const qtdCard = c => c ? +c.querySelector('.sc-item-v').textContent.replace(/\D/g, '') : -1;
    ok('card Soft soma a garantia genérica do histórico', qtdCard(cardSoft) === garSoftEsp, qtdCard(cardSoft) + ' vs ' + garSoftEsp);
    ok('card Reis conta só as vendidas para a Reis', qtdCard(cardReis) === garReisEsp, qtdCard(cardReis) + ' vs ' + garReisEsp);
    const linhasGar = q('#cmpTable tbody tr').filter(tr => /gar/i.test(tr.children[0].textContent));
    ok('tabela comparativa com 2 linhas de garantia', linhasGar.length === 2, linhasGar.length);
    const prodsEsp = new Set(softPeriodo.map(r => r.prod.toUpperCase()));
    ok('ranking lista TODOS os produtos do período (não só top 10)', q('#prodLista .prod-row').length === prodsEsp.size, q('#prodLista .prod-row').length + ' vs ' + prodsEsp.size);
    const visiveis = () => q('#prodLista .prod-row').filter(e => e.style.display !== 'none').length;
    el('prodFiltro').value = 'camera'; filtrarProdutos();
    ok('filtro ignora acento e maiúsculas ("camera" acha CÂMERA)', visiveis() === [...prodsEsp].filter(p => semAcento(p).includes('CAMERA')).length && visiveis() > 0, visiveis());
    el('prodFiltro').value = 'ZZZZ'; filtrarProdutos();
    ok('aviso quando nada corresponde', visiveis() === 0 && el('prodVazio').style.display !== 'none');
    el('prodFiltro').value = ''; filtrarProdutos();
    ok('limpar o filtro devolve tudo', visiveis() === prodsEsp.size);

    bloco('Vendedores: marcar dois ou mais ao mesmo tempo');
    const kpiPrincipal = () => nb(q('#kg-vend .kc')[0].textContent);
    const marcados = () => vendChips().filter(c => c.className.indexOf('on') >= 0).map(c => c.textContent.trim());

    // ── Soft Blindagem (faturamento) ──────────────────────────────────
    showTab('vendedores', el('tabVendedores'));
    limparVendedores();
    const fatSoftDe = nomes => softPeriodo.filter(r => nomes.includes(r.vend)).reduce((s, r) => s + r.preco, 0);
    ok('sem ninguém marcado, "Toda a equipe" fica aceso', marcados().join('|') === '👥 Toda a equipe', marcados().join('|'));
    toggleVendedor(vendsSoft[0]);
    ok('marcar um mostra o faturamento dele', kpiPrincipal().indexOf(nb(BRL(fatSoftDe([vendsSoft[0]])))) >= 0, kpiPrincipal().slice(0, 50));
    toggleVendedor(vendsSoft[1]);
    ok('marcar o segundo soma os dois', kpiPrincipal().indexOf(nb(BRL(fatSoftDe([vendsSoft[0], vendsSoft[1]])))) >= 0, kpiPrincipal().slice(0, 50));
    ok('os dois chips ficam acesos, e "toda a equipe" apaga', marcados().slice().sort().join('|') === [vendsSoft[0], vendsSoft[1]].sort().join('|'), marcados().join('|'));
    ok('o gráfico de evolução nomeia os dois', txt('vendEvoCt').indexOf(vendsSoft[0]) > 0 && txt('vendEvoCt').indexOf(vendsSoft[1]) > 0, txt('vendEvoCt'));
    ok('o ranking destaca as duas linhas', (el('vendTable').innerHTML.match(/rgba\(13,158,80,\.10\)/g) || []).length === 2, (el('vendTable').innerHTML.match(/rgba\(13,158,80,\.10\)/g) || []).length);
    toggleVendedor(vendsSoft[2] !== undefined ? vendsSoft[2] : vendsSoft[0]);
    if (vendsSoft[2] !== undefined) ok('dá para marcar um terceiro', kpiPrincipal().indexOf(nb(BRL(fatSoftDe(vendsSoft.slice(0, 3))))) >= 0, kpiPrincipal().slice(0, 50));
    else ok('dá para marcar um terceiro', true, 'fixture com 2 vendedores');
    toggleVendedor(vendsSoft[1]);
    ok('desmarcar um tira só ele da conta', kpiPrincipal().indexOf(nb(BRL(fatSoftDe([vendsSoft[0], vendsSoft[2]].filter(Boolean))))) >= 0, kpiPrincipal().slice(0, 50));
    limparVendedores();
    ok('"Toda a equipe" devolve a equipe inteira', kpiPrincipal().indexOf(nb(BRL(fatSoftDe(vendsSoft)))) >= 0 && marcados().join('|') === '👥 Toda a equipe', kpiPrincipal().slice(0, 50));

    // ── Reis Phones (lucro bruto) ─────────────────────────────────────
    switchCompany('reis'); await tick(140);
    showTab('vendedores', el('tabVendedores'));
    limparVendedores();
    const lbReisDe = nomes => reisAparelhos.filter(r => nomes.includes(r.vend)).reduce((s, r) => s + r.lb, 0);
    toggleVendedor(vendsReis[0]);
    toggleVendedor(vendsReis[1]);
    ok('na Reis também soma dois', kpiPrincipal().indexOf(nb(BRL(lbReisDe([vendsReis[0], vendsReis[1]])))) >= 0, kpiPrincipal().slice(0, 50));
    ok('e o rótulo diz quantos são', nb(txt('kg-vend')).indexOf('2 vendedores') >= 0 || nb(txt('vendFeedback')).indexOf('grupo de 2 vendedores') >= 0, txt('vendFeedback').slice(0, 70));
    ok('clicar no ranking volta a deixar só um', (onVendChangeDireto(vendsReis[0]), vendSelecionados().join('|') === vendsReis[0]), vendSelecionados().join('|'));
    limparVendedores();

    // volta para a Soft, que é onde o próximo bloco começa
    switchCompany('soft'); await tick(140);

    bloco('Troca de empresa: vendedor que não existe na outra empresa');
    showTab('vendedores', el('tabVendedores'));
    onVendChangeDireto('PIERRE');
    switchCompany('reis'); await tick(120);
    ok('seleção volta para "Toda a equipe"', vendSelecionados().length === 0, JSON.stringify(vendSelecionados()));
    ok('aba continua ativa', el('p-vendedores').classList.contains('active'));

    bloco('Cada empresa só mostra a própria planilha');
    {
      const heroReis = BRL(reisPeriodo.reduce((s, r) => s + r.lb, 0));
      const heroSoft = BRL(softPeriodo.reduce((s, r) => s + r.preco, 0));
      ok('Reis: SALES é o da planilha da Reis', SALES === _cache.reis.sales && SALES.length === reis.length, SALES.length);
      ok('Reis: nenhuma linha da Soft', !SALES.some(r => r.prod !== undefined || ['BL', 'BLF', 'BLC', 'STK', 'REL', 'UP', 'TAB'].includes(r.tipo)));
      ok('Reis: hero = lucro bruto só da planilha da Reis', nb(txt('heroValue')) === nb(heroReis), txt('heroValue') + ' vs ' + heroReis);
      switchCompany('soft'); await tick(120);
      ok('Soft: SALES é o da planilha da Soft', SALES === _cache.soft.sales && SALES.length === soft.length, SALES.length);
      ok('Soft: nenhuma linha da Reis', SALES.every(r => r.prod !== undefined) && !SALES.some(r => ['IP', 'AW', 'ID', 'MB', 'AC', 'AS'].includes(r.tipo)));
      ok('Soft: hero = faturamento só da planilha da Soft', nb(txt('heroValue')) === nb(heroSoft), txt('heroValue') + ' vs ' + heroSoft);
      switchCompany('reis'); await tick(120);
      ok('volta para a Reis sem arrastar dados da Soft', SALES === _cache.reis.sales && nb(txt('heroValue')) === nb(heroReis), txt('heroValue'));
    }

    // ══ METAS DIÁRIAS ═══════════════════════════════════════════════
    const mBRL = v => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const mCards = s => q('#mtGrid-' + s + ' .mt-card').length;
    const mPerto = (a, b) => Math.abs(a - b) < 0.01;
    // o "já feito" tem que sair das mesmas linhas que o dashboard usa no topo:
    // Reis = lucro bruto (LUCRO), Soft = faturamento (PREÇO), do dia 1 até hoje
    const mLbReis = reisPeriodo.reduce((s, r) => s + r.lb, 0);
    const mFatSoft = softPeriodo.reduce((s, r) => s + r.preco, 0);

    bloco('Metas diárias: botão no seletor de empresa');
    ok('botão "Metas Diárias" fica ao lado das empresas', !!el('btnMetas') && !!el('btnMetas').closest('.company-sw'));
    Metas.resetar();   // parte sempre do padrão, sem depender do que estiver salvo no navegador
    Metas.abrir();
    await Metas.carregarAoVivo();
    ok('painel de metas abre', el('p-metas').classList.contains('active'));
    ok('nenhuma aba do dashboard fica aberta junto', q('.panel.active').length === 1);
    ok('barra de período, hero e abas somem', document.querySelector('.pbar').style.display === 'none' && document.querySelector('.tabs').style.display === 'none' && el('heroMetric').style.display === 'none');
    ok('botão de metas marcado, empresa desmarcada', el('btnMetas').classList.contains('active') && !el('btnReis').classList.contains('active') && !el('btnSoft').classList.contains('active'));
    ok('cards padrão: 8 Reis, 4 Soft, 2 extras', mCards('reis') === 8 && mCards('soft') === 4 && mCards('extra') === 2, mCards('reis') + '/' + mCards('soft') + '/' + mCards('extra'));
    ok('cada card tem seu gráfico', q('#mtGrid-reis canvas').length === 8 && q('#mtGrid-extra canvas').length === 2);

    bloco('Metas diárias: "já feito" vem da planilha, sem digitar nada');
    ok('Reis usa o lucro bruto do mês (soma de LUCRO)', mPerto(Metas.estado().feitoReis, mLbReis), Metas.estado().feitoReis + ' vs ' + mLbReis);
    ok('Soft usa o faturamento do mês (soma de PREÇO)', mPerto(Metas.estado().feitoSoft, mFatSoft), Metas.estado().feitoSoft + ' vs ' + mFatSoft);
    ok('valor da Reis aparece na tela', nb(txt('mtFeito-reis')) === nb(mBRL(mLbReis)), txt('mtFeito-reis'));
    ok('valor da Soft aparece na tela', nb(txt('mtFeito-soft')) === nb(mBRL(mFatSoft)), txt('mtFeito-soft'));
    ok('período mostrado é do dia 1 até hoje', txt('mtPer-reis').indexOf('1 a ' + hoje.getDate() + '/') > 0, txt('mtPer-reis'));
    ok('não sobrou campo de "já feito" para digitar', !el('mtFeitoReis') && !el('mtFeitoSoft'));
    ok('o botão de atualizar da planilha existe', !!el('mtBtnRf'));

    bloco('Metas diárias: o cálculo');
    ok('meta diária = (total − já feito) ÷ dias', nb(txt('mtV-reis-0')) === nb(mBRL((120000 - mLbReis) / 16)), txt('mtV-reis-0'));
    ok('faltando = total − já feito', nb(txt('mtFalt-reis-0')) === nb('Faltando: ' + mBRL(120000 - mLbReis)), txt('mtFalt-reis-0'));
    ok('Soft calcula em cima do faturamento', nb(txt('mtV-soft-0')) === nb(mBRL((110000 - mFatSoft) / 16)), txt('mtV-soft-0'));
    const assistMes = softPeriodo.filter(r => semAcento(r.prod).indexOf('ASSIST') >= 0).reduce((t, r) => t + r.preco, 0);
    ok('meta extra de assistência lê a planilha, não um valor digitado', nb(txt('mtV-extra-0')) === nb(mBRL((60000 - assistMes) / 16)), txt('mtV-extra-0'));
    ok('o campo de dias não tem teto (dá para simular qualquer prazo)', !el('mtDias').getAttribute('max'), el('mtDias').getAttribute('max'));
    el('mtDias').value = '45'; Metas.onDias();
    ok('aceita mais de 31 dias', Metas.estado().dias === 45 && nb(txt('mtV-reis-0')) === nb(mBRL((120000 - mLbReis) / 45)), txt('mtV-reis-0'));
    el('mtDias').value = '0'; Metas.onDias();
    ok('mas nunca zero, que dividiria por nada', Metas.estado().dias === 1, Metas.estado().dias);
    el('mtDias').value = '10'; Metas.onDias();
    ok('mudar os dias restantes recalcula na hora', nb(txt('mtV-reis-0')) === nb(mBRL((120000 - mLbReis) / 10)), txt('mtV-reis-0'));
    Metas.setCampo('reis', 0, 'total', '1.000,00');
    ok('meta total aceita valor colado em formato BR', nb(txt('mtFalt-reis-0')) === nb('Faltando: ' + mBRL(Math.max(0, 1000 - mLbReis))), txt('mtFalt-reis-0'));
    ok('meta já batida mostra zero, nunca valor negativo', nb(txt('mtV-reis-0')) === nb(mBRL(0)), txt('mtV-reis-0'));
    Metas.setCampo('reis', 0, 'total', '120000');

    bloco('Metas diárias: valor colado em qualquer formato');
    ok('98.366,22 (BR com milhar)', Metas.parseBR('98.366,22') === 98366.22);
    ok('98366,22 (BR sem milhar)', Metas.parseBR('98366,22') === 98366.22);
    ok('98366.22 (ponto decimal)', Metas.parseBR('98366.22') === 98366.22);
    ok('120.000 é cento e vinte mil, não 120', Metas.parseBR('120.000') === 120000, Metas.parseBR('120.000'));
    ok('1.200.000 é um milhão e duzentos mil', Metas.parseBR('1.200.000') === 1200000, Metas.parseBR('1.200.000'));
    ok('R$ 98.366,22 (com prefixo)', Metas.parseBR('R$ 98.366,22') === 98366.22);
    ok('texto inválido vira 0, nunca NaN', Metas.parseBR('abc') === 0 && Metas.parseBR('') === 0);

    bloco('Metas diárias: meta total se formata sozinha enquanto digita');
    const mMask = Metas.mascaraBR;
    ok('120000 vira 120.000 (é valor em reais, não centavos)', mMask('120000') === '120.000', mMask('120000'));
    ok('1200 vira 1.200', mMask('1200') === '1.200', mMask('1200'));
    ok('1200000 vira 1.200.000', mMask('1200000') === '1.200.000', mMask('1200000'));
    ok('vírgula digitada é respeitada', mMask('120000,5') === '120.000,5', mMask('120000,5'));
    ok('centavos param em 2 casas', mMask('120000,567') === '120.000,56', mMask('120000,567'));
    ok('ponto do teclado numérico vira vírgula', mMask('12.3') === '12,3', mMask('12.3'));
    ok('ponto de milhar não é confundido com centavos', mMask('1.234') === '1.234', mMask('1.234'));
    ok('vírgula sozinha ganha o zero', mMask(',5') === '0,5', mMask(',5'));
    ok('zeros à esquerda somem', mMask('000120000') === '120.000', mMask('000120000'));
    ok('letra digitada é ignorada', mMask('12a3') === '123' && mMask('abc') === '', mMask('12a3'));

    const mInp = () => q('#mtGrid-reis .mt-inp')[0];
    const mDigitar = texto => { const e = mInp(); e.value = texto; e.selectionStart = texto.length; Metas.onValor(e, 'reis', 0, 'total'); return e; };
    mDigitar('120000');
    ok('o campo mostra 120.000 na hora', mInp().value === '120.000', mInp().value);
    ok('e o valor entendido é cento e vinte mil', Metas.estado().reis[0].total === 120000, Metas.estado().reis[0].total);
    ok('a meta diária já usa o valor formatado', nb(txt('mtV-reis-0')) === nb(mBRL((120000 - mLbReis) / 10)), txt('mtV-reis-0'));
    Metas.onValorSaiu(mInp(), 'reis', 0, 'total');
    ok('ao sair do campo os centavos fecham', mInp().value === '120.000,00', mInp().value);
    ok('fechar os centavos não muda o valor', Metas.estado().reis[0].total === 120000, Metas.estado().reis[0].total);
    const mCursor = mInp(); mCursor.value = '1200'; mCursor.selectionStart = 2;
    Metas.onValor(mCursor, 'reis', 0, 'total');
    ok('o cursor não pula para o fim ao editar no meio', mCursor.value === '1.200' && mCursor.selectionStart === 3, mCursor.value + ' pos ' + mCursor.selectionStart);
    mDigitar('120000'); Metas.onValorSaiu(mInp(), 'reis', 0, 'total');

    bloco('Metas diárias: variação desde a referência salva');
    Metas.snapshot();
    ok('a meta diária fica sozinha na linha, para o valor não ser cortado', q('#mtGrid-reis .mt-res .mt-v').length === mCards('reis') && q('#mtGrid-reis .mt-res .mt-delta').length === 0);
    ok('o selo de variação fica na linha do "faltando"', !!document.querySelector('#mtGrid-reis .mt-sub #mtDelta-reis-0') && !!document.querySelector('#mtGrid-reis .mt-sub .mt-falt'));
    ok('logo depois de salvar, a variação é "igual"', /igual/.test(txt('mtDelta-reis-0')), txt('mtDelta-reis-0'));
    el('mtDias').value = '20'; Metas.onDias();
    ok('mais dias pela frente → diária cai → selo verde', q('#mtDelta-reis-0 .mt-delta.down').length === 1, txt('mtDelta-reis-0'));
    el('mtDias').value = '5'; Metas.onDias();
    ok('menos dias → diária sobe → selo vermelho', q('#mtDelta-reis-0 .mt-delta.up').length === 1, txt('mtDelta-reis-0'));
    Metas.toggleDelta('reis', 0);
    ok('clicar no selo esconde a variação', txt('mtDelta-reis-0') === '···', txt('mtDelta-reis-0'));
    Metas.toggleDelta('reis', 0);
    ok('clicar de novo mostra de volta', /▲|▼|igual/.test(txt('mtDelta-reis-0')), txt('mtDelta-reis-0'));

    bloco('Metas diárias: adicionar e remover metas');
    const mSoftAntes = mCards('soft');
    Metas.addMeta('soft');
    ok('adicionar meta cria o card', mCards('soft') === mSoftAntes + 1);
    Metas.remover('soft', mSoftAntes);
    ok('remover devolve a contagem', mCards('soft') === mSoftAntes);
    Metas.addExtra();
    ok('meta extra é adicionada sem prompt do navegador', mCards('extra') === 3, mCards('extra'));
    Metas.remover('extra', 2);
    ok('meta extra removida', mCards('extra') === 2, mCards('extra'));
    ok('não sobrou exportar/importar entre aparelhos', !Metas.exportar && !Metas.importar && !Metas.codigoExport && !Metas.aplicarCodigo);
    ok('metas ficam salvas no navegador', !!(JSON.parse(localStorage.getItem('metas_v5')) || {}).reis);

    bloco('Metas diárias: texto do WhatsApp');
    const mWpp = Metas.textoWpp('all');
    ok('traz as duas empresas e as extras', /REIS PHONES/.test(mWpp) && /SOFT BLINDAGEM/.test(mWpp) && /Meta Assistência/.test(mWpp));
    ok('uma meta diária por card', (mWpp.match(/Meta diária/g) || []).length === 14, (mWpp.match(/Meta diária/g) || []).length);
    ok('manda o já feito lido da planilha', mWpp.indexOf(mBRL(mLbReis)) > 0 && mWpp.indexOf(mBRL(mFatSoft)) > 0);
    ok('sem NaN/undefined no texto', !/NaN|undefined|Infinity/.test(mWpp));
    ok('só Reis não menciona a Soft', !/SOFT BLINDAGEM/.test(Metas.textoWpp('reis')));

    bloco('Metas diárias: sincronização entre aparelhos');
    // Supabase de mentira: guarda a linha, registra o que foi enviado e deixa
    // o roteiro simular uma alteração vinda de outro aparelho.
    const nuvemFake = linhaInicial => {
      const reg = { enviados: [], handlers: [], linha: linhaInicial || null };
      const canal = { on(ev, cfg, cb) { reg.handlers.push(cb); return canal; }, subscribe() { return canal; } };
      reg.lib = {
        createClient: () => ({
          from: () => ({
            select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: reg.linha ? { dados: reg.linha } : null, error: null }) }) }),
            upsert: r => { reg.enviados.push(r); reg.linha = r.dados; return Promise.resolve({ error: null }); }
          }),
          channel: () => canal,
          removeChannel: () => {}
        })
      };
      reg.receber = (dados, aparelho) => reg.handlers.forEach(h => h({ new: { dados, atualizado_por: aparelho || 'outro-aparelho' } }));
      return reg;
    };

    ok('sem a biblioteca da nuvem, o painel segue funcionando offline', Metas.statusNuvem() === 'local' && mCards('reis') === 8, Metas.statusNuvem());

    // ── nuvem ainda vazia: este aparelho semeia o que tem ──────────────
    let nf = nuvemFake(null);
    window.supabase = nf.lib;
    await Metas.reconectarNuvem();
    ok('conecta e mostra o selo de sincronizado', Metas.statusNuvem() === 'ok' && txt('mtSync').indexOf('Sincronizado') > 0, txt('mtSync'));
    ok('nuvem vazia é semeada com as metas deste aparelho', nf.enviados.length === 1 && nf.enviados[0].dados.reis.length === 8, nf.enviados.length);
    ok('o realizado da planilha NÃO vai para a nuvem', !('feitoReis' in nf.enviados[0].dados) && !('feitoSoft' in nf.enviados[0].dados));
    ok('a linha enviada é sempre a mesma (global)', nf.enviados[0].id === 'global');
    ok('a linha carimba qual aparelho escreveu', nf.enviados[0].atualizado_por === Metas.aparelho());

    // ── nuvem já com metas: ela manda, não o que estava no navegador ───
    nf = nuvemFake({ dias: 7, extraTitle: 'Extras do sócio', reis: [{ nome: 'Meta do mês', total: 200000 }], soft: [{ nome: 'Soft 1', total: 90000 }], extra: [], delta: {} });
    window.supabase = nf.lib;
    await Metas.reconectarNuvem();
    ok('ao abrir em outro aparelho, as metas da nuvem mandam', mCards('reis') === 1 && mCards('soft') === 1 && mCards('extra') === 0, mCards('reis') + '/' + mCards('soft') + '/' + mCards('extra'));
    ok('dias restantes vêm da nuvem', el('mtDias').value === '7', el('mtDias').value);
    ok('título das metas extras vem da nuvem', el('mtExtraTitulo').value === 'Extras do sócio', el('mtExtraTitulo').value);
    ok('o já feito continua sendo o da planilha, não o da nuvem', mPerto(Metas.estado().feitoReis, mLbReis), Metas.estado().feitoReis);
    ok('a meta diária já usa os dois juntos', nb(txt('mtV-reis-0')) === nb(mBRL((200000 - mLbReis) / 7)), txt('mtV-reis-0'));
    ok('baixar da nuvem não devolve nada para a nuvem', nf.enviados.length === 0, nf.enviados.length);

    // ── editar aqui sobe para a nuvem ──────────────────────────────────
    Metas.setCampo('reis', 0, 'total', '250.000,00');
    await tick(520);   // o envio é agrupado por alguns décimos de segundo
    ok('alterar uma meta manda a linha para a nuvem', nf.enviados.length === 1 && nf.enviados[0].dados.reis[0].total === 250000, JSON.stringify((nf.enviados[0] || {}).dados || {}).slice(0, 60));
    ok('selo volta para sincronizado depois de salvar', Metas.statusNuvem() === 'ok', Metas.statusNuvem());
    el('mtDias').value = '12'; Metas.onDias();
    await tick(520);
    ok('mudar os dias também sobe', nf.enviados.length === 2 && nf.enviados[1].dados.dias === 12, nf.enviados.length);

    // ── alteração feita em outro aparelho aparece aqui na hora ─────────
    nf.receber({ dias: 3, extraTitle: 'Extras', reis: [{ nome: 'Veio do celular', total: 300000 }, { nome: 'Segunda', total: 400000 }], soft: [], extra: [], delta: {} });
    ok('alteração de outro aparelho entra sem recarregar a página', mCards('reis') === 2 && q('#mtGrid-reis .mt-nm')[0].value === 'Veio do celular', mCards('reis') + ' / ' + (q('#mtGrid-reis .mt-nm')[0] || {}).value);
    ok('os números recalculam com o que chegou', el('mtDias').value === '3' && nb(txt('mtV-reis-0')) === nb(mBRL((300000 - mLbReis) / 3)), txt('mtV-reis-0'));
    ok('receber de fora não reenvia para a nuvem (sem eco infinito)', nf.enviados.length === 2, nf.enviados.length);
    nf.receber({ dias: 99, extraTitle: 'Extras', reis: [], soft: [], extra: [], delta: {} }, Metas.aparelho());
    ok('o eco da minha própria escrita é ignorado', el('mtDias').value === '3' && mCards('reis') === 2, el('mtDias').value);

    bloco('Metas extras puxam Assistência e Acessórios da planilha da Soft');
    // A expectativa é escrita aqui, independente do código da página: se a
    // tela da Soft ou a meta mudarem de critério sozinhas, isto quebra.
    const mCat = p => {
      const s = semAcento(p);
      if (s.indexOf('GARANTIA') >= 0) return s.indexOf('REIS') >= 0 ? 'gar_reis' : 'gar_soft';
      if (s.indexOf('ASSIST') >= 0) return 'assist';
      if (s.indexOf('BLINDAGEM') >= 0 || s.indexOf('BLINDADO') >= 0 || s.indexOf('STICKER') >= 0 ||
          s.indexOf('RELOGIO') >= 0 || s.indexOf('TABLET') >= 0 || s.indexOf('NOTEBOOK') >= 0 ||
          s.indexOf('MULTIMIDIA') >= 0 || s.indexOf('CAMERA') >= 0 ||
          (s.indexOf('SUPORTE') >= 0 && s.indexOf('BLIND') >= 0)) return 'blind';
      if (s.indexOf('PLANO') >= 0 || s.indexOf('UPGRADE') >= 0) return 'plano';
      return 'acess';
    };
    const mFatCat = c => softPeriodo.filter(r => mCat(r.prod) === c).reduce((s, r) => s + r.preco, 0);
    const espAssist = mFatCat('assist'), espAcess = mFatCat('acess');
    ok('a planilha de teste tem os dois grupos', espAssist > 0 && espAcess > 0 && Math.abs(espAssist - espAcess) > 1, espAssist + ' / ' + espAcess);

    Metas.resetar(); await Metas.carregarAoVivo();
    ok('meta chamada "Assistência" já nasce lendo a planilha', q('#mtGrid-extra .mt-fonte')[0].value === 'assist', q('#mtGrid-extra .mt-fonte')[0].value);
    ok('meta chamada "Acessórios" também', q('#mtGrid-extra .mt-fonte')[1].value === 'acess', q('#mtGrid-extra .mt-fonte')[1].value);
    Metas.addExtra();
    ok('meta nova de nome qualquer continua na mão', q('#mtGrid-extra .mt-fonte')[2].value === 'manual', q('#mtGrid-extra .mt-fonte')[2].value);
    ok('e com campo para digitar o valor', q('#mtGrid-extra .mt-inp[data-campo="feito"]').length === 1, q('#mtGrid-extra .mt-inp[data-campo="feito"]').length);
    Metas.remover('extra', 2);

    Metas.setFonte(0, 'manual'); Metas.setFonte(0, 'assist'); await Metas.carregarAoVivo();
    ok('ligada à Assistência, lê o faturamento da planilha', mPerto(Metas.estado().extra[0].feito, espAssist), Metas.estado().extra[0].feito + ' vs ' + espAssist);
    ok('o campo de digitar some (não é mais na mão)', q('#mtGrid-extra .mt-inp[data-campo="feito"]').length === 0);
    ok('o valor lido aparece no card', nb(txt('mtExtraV-0')) === nb(mBRL(espAssist)), txt('mtExtraV-0'));
    ok('a meta diária da extra usa esse valor', nb(txt('mtV-extra-0')) === nb(mBRL((60000 - espAssist) / Math.max(1, Metas.estado().dias))), txt('mtV-extra-0'));

    Metas.setFonte(0, 'acess'); await Metas.carregarAoVivo();
    ok('trocar para Acessórios troca a conta', mPerto(Metas.estado().extra[0].feito, espAcess), Metas.estado().extra[0].feito + ' vs ' + espAcess);

    // o número da meta tem que ser o MESMO que o card da Visão Geral da Soft mostra
    const compAtual = ACTIVE_COMPANY;
    if (ACTIVE_COMPANY !== 'soft') { switchCompany('soft'); await tick(150); }
    const fatDoCard = titulo => {
      const card = q('#p-visao .sc').find(e => { const t = e.querySelector('.sc-title'); return t && t.textContent.indexOf(titulo) >= 0; });
      if (!card) return '(card não achado)';
      const item = Array.from(card.querySelectorAll('.sc-item')).find(i => /FATURAMENTO/.test(i.textContent));
      return item ? item.querySelector('.sc-item-v').textContent.trim() : '(sem faturamento)';
    };
    ok('card "Acessórios" da Soft = o que a meta puxou', nb(fatDoCard('Acessórios')) === nb(mBRL(espAcess)), fatDoCard('Acessórios') + ' vs ' + mBRL(espAcess));
    ok('card "Assistência" da Soft = o que a meta puxaria', nb(fatDoCard('Assistência')) === nb(mBRL(espAssist)), fatDoCard('Assistência') + ' vs ' + mBRL(espAssist));
    if (ACTIVE_COMPANY !== compAtual) { switchCompany(compAtual); await tick(150); }
    Metas.abrir(); await Metas.carregarAoVivo();

    bloco('Metas extras: o que é lido da planilha não viaja para a nuvem');
    const nfExtra = nuvemFake(null);
    window.supabase = nfExtra.lib;
    await Metas.reconectarNuvem();
    const extraEnviada = (nfExtra.enviados[0] || {}).dados.extra[0];
    ok('a nuvem recebe de onde a meta puxa o valor', extraEnviada.fonte === 'acess', JSON.stringify(extraEnviada));
    ok('mas não o valor lido, que cada aparelho lê sozinho', !('feito' in extraEnviada), JSON.stringify(extraEnviada));
    Metas.setFonte(0, 'manual'); await tick(520);
    const extraManual = nfExtra.enviados[nfExtra.enviados.length - 1].dados.extra[0];
    ok('voltando para "na mão", o valor digitado volta a viajar', extraManual.fonte === 'manual' && ('feito' in extraManual), JSON.stringify(extraManual));

    // quem já tinha metas antigas (sem fonte) tem o palpite gravado na nuvem,
    // em vez de readivinhado a cada vez que o painel abre
    const nfVelho = nuvemFake({dias:5, extraTitle:'Extras', reis:[{nome:'R',total:1000}], soft:[{nome:'S',total:1000}],
      extra:[{nome:'MR Assistência',total:60000,feito:9999},{nome:'MR ACESSÓRIOS',total:30000,feito:8888}], delta:{}});
    window.supabase = nfVelho.lib;
    await Metas.reconectarNuvem(); await tick(560);
    ok('meta antiga sem fonte é reconhecida pelo nome', Metas.estado().extra[0].fonte === 'assist' && Metas.estado().extra[1].fonte === 'acess', JSON.stringify(Metas.estado().extra.map(m=>m.fonte)));
    ok('e a configuração sobe para a nuvem, uma vez só', nfVelho.enviados.length === 1 && nfVelho.enviados[0].dados.extra[0].fonte === 'assist', nfVelho.enviados.length);

    bloco('Nuvem lenta não deixa este aparelho atropelar as metas salvas');
    // Cenário real: a planilha responde rápido, a nuvem demora. Antes da
    // correção o agrupamento de escrita (400ms) disparava primeiro e subia o
    // padrão deste aparelho por cima das metas de quem já tinha configurado.
    const salvas = {dias:9, extraTitle:'Extras', reis:[{nome:'Da nuvem',total:777000}],
      soft:[{nome:'Soft nuvem',total:111000}], extra:[], delta:{}};
    const nfLento = nuvemFake(salvas);
    const canalL = {on(){return canalL;},subscribe(){return canalL;}};
    nfLento.lib = {createClient: () => ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: () => new Promise(r => setTimeout(() => r({data:{dados:nfLento.linha},error:null}), 900)) }) }),
        upsert: r => { nfLento.enviados.push(r); nfLento.linha = r.dados; return Promise.resolve({error:null}); }
      }),
      channel: () => canalL, removeChannel: () => {}
    })};
    Metas.resetar();            // este aparelho está com o padrão
    window.supabase = nfLento.lib;
    const lendo = Metas.reconectarNuvem();
    await Metas.carregarAoVivo(); // a planilha volta antes da nuvem
    await tick(600);              // passa do agrupamento de 400ms
    ok('nada é escrito enquanto a nuvem não respondeu', nfLento.enviados.length === 0, nfLento.enviados.length);
    await lendo; await tick(120);
    ok('quando ela responde, as metas salvas é que mandam', mCards('reis') === 1 && Metas.estado().reis[0].total === 777000, JSON.stringify(Metas.estado().reis));
    ok('e o padrão deste aparelho não foi para a nuvem', !nfLento.enviados.some(e => (e.dados.reis||[]).length === 8), JSON.stringify(nfLento.enviados.map(e=>(e.dados.reis||[]).length)));

    bloco('Metas diárias: voltar para o dashboard');
    switchCompany('soft'); await tick(120);
    ok('clicar numa empresa fecha as metas', !el('p-metas').classList.contains('active') && !el('btnMetas').classList.contains('active'));
    ok('barra de período e abas voltam', document.querySelector('.pbar').style.display === '' && document.querySelector('.tabs').style.display === '');
    ok('empresa escolhida fica marcada', el('btnSoft').classList.contains('active'));
    ok('volta a aba que estava aberta antes', q('.panel.active').length === 1 && q('.panel.active')[0].id !== 'p-metas', (q('.panel.active')[0] || {}).id);

    bloco('Soft lê pela API do Sheets; o CSV publicado é só reserva');
    // O CSV de "Publicar na web" é servido em cache pelo Google: depois de a
    // planilha ser consertada ele ainda devolveu por minutos a versão vazia.
    // Por isso a API é a fonte e o CSV só entra se ela falhar.
    const fetchReal = window.fetch;
    const respOk = o => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(o), text: () => Promise.resolve(String(o)) });
    const metaSoft = { sheets: [{ properties: { sheetId: 179719176, title: 'P&L SOFT VAREJO' } }] };
    const csvReserva = valuesToCSV(SOFT);

    let urlsA = [];
    window.fetch = u => {
      const s = String(u); urlsA.push(s);
      if (s.indexOf('fields=sheets.properties') >= 0) return respOk(metaSoft);
      if (s.indexOf('/values/') >= 0) return respOk({ values: SOFT });
      return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('') });
    };
    _cache.soft = { sales: null, custos: null }; _pending.soft = null;
    const cargaApi = await fetchCompanyData('soft');
    ok('busca na planilha da Soft, não na da Reis', urlsA.some(u => u.indexOf(SOFT_SHEET_ID) >= 0) && !urlsA.some(u => u.indexOf('/values/') >= 0 && u.indexOf(REIS_SHEET_ID) >= 0));
    ok('acha a aba pelo gid (sobrevive a renomear a aba)', urlsA.some(u => u.indexOf('fields=sheets.properties') >= 0));
    ok('leu as vendas pela API', cargaApi.sales.length > 0, cargaApi.sales.length);
    ok('com a API de pé, não toca no CSV publicado', !urlsA.some(u => u.indexOf('output=csv') >= 0));

    let urlsB = [];
    window.fetch = u => {
      const s = String(u); urlsB.push(s);
      if (s.indexOf('output=csv') >= 0) return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(csvReserva) });
      return Promise.resolve({ ok: false, status: 503, text: () => Promise.resolve('') });
    };
    _cache.soft = { sales: null, custos: null }; _pending.soft = null;
    const cargaCsv = await fetchCompanyData('soft');
    ok('se a API cair, o CSV publicado assume', cargaCsv.sales.length > 0, cargaCsv.sales.length);
    ok('e o CSV foi mesmo buscado', urlsB.some(u => u.indexOf('output=csv') >= 0));

    window.fetch = fetchReal;

    bloco('Planilha vazia avisa, em vez de mostrar R$ 0,00 como se fosse real');
    _cache.soft = { sales: [], custos: [] }; _pending.soft = null;
    ACTIVE_COMPANY = 'soft'; SALES = []; CUSTOS = [];
    applyPeriod(); await tick(80);
    ok('a faixa de aviso aparece', el('avisoDados').style.display === 'flex', el('avisoDados').style.display);
    ok('o aviso diz de qual empresa', txt('avisoDadosTxt').indexOf('Soft Blindagem') >= 0, txt('avisoDadosTxt').slice(0, 60));
    ok('o aviso avisa que os números não valem', /não refletem a realidade/.test(txt('avisoDadosTxt')));
    ok('tem como tentar de novo sem recarregar', !!document.querySelector('#avisoDados button'));
    // devolve os dados e confere que a faixa some
    _cache.soft = { sales: soft, custos: [] }; SALES = soft;
    applyPeriod(); await tick(80);
    ok('com dados na planilha a faixa some', el('avisoDados').style.display === 'none', el('avisoDados').style.display);

    bloco('Nenhum texto quebrado em nenhuma aba');
    for (const co of ['reis', 'soft']) {
      if (ACTIVE_COMPANY !== co) { switchCompany(co); await tick(120); }
      for (const pn of q('.panel')) {
        const t = pn.textContent;
        const ruins = ['NaN', 'undefined', 'Infinity', '[object'].filter(k => t.includes(k));
        ok(co + ' / ' + pn.id + ' sem NaN/undefined', ruins.length === 0, ruins.join(','));
      }
    }
    // com um dia só de período (situação criada pelo clique na barra)
    aplicarPeriodoFixo(hojeIso, hojeIso, 'Dia escolhido no gráfico'); await tick(60);
    for (const pn of q('.panel')) {
      const ruins = ['NaN', 'undefined', 'Infinity'].filter(k => pn.textContent.includes(k));
      ok('período de 1 dia / ' + pn.id + ' sem NaN/undefined', ruins.length === 0, ruins.join(','));
    }
  } catch (e) {
    R.excecoes.push(BLOCO + ' → ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n'));
  }
  return R;
})()
