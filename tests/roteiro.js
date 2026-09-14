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
    ok('seletor lista os vendedores do período', el('vendSel').options.length === vendsReis.length + 1, el('vendSel').options.length + ' opções vs ' + vendsReis.length + ' vendedores');
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
    ok('clique no ranking seleciona o vendedor', el('vendSel').value === vendsReis[0] && txt('vendEvoCt').includes(vendsReis[0]));
    ok('linha destacada em azul (cor da Reis)', el('vendTable').innerHTML.includes('rgba(29,90,154,.10)'));
    onVendChangeDireto('__TODOS__');

    bloco('Reis Phones — pizza e detalhamento levam ao vendedor');
    showTab('visao', q('.tabs .tab')[0]);
    const pie = window.__charts['c-vendPie'];
    ok('pizza existe e tem onClick', pie && typeof pie.options.onClick === 'function');
    ok('legenda da pizza navega em vez de esconder fatia', pie && pie.options.plugins.legend && typeof pie.options.plugins.legend.onClick === 'function');
    pie.options.onClick({}, [{ index: 0 }]); await tick(30);
    ok('fatia → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && el('vendSel').value === pie.data.labels[0], el('vendSel').value);
    showTab('visao', q('.tabs .tab')[0]);
    pie.options.plugins.legend.onClick({}, { index: 1 }); await tick(30);
    ok('legenda → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && el('vendSel').value === pie.data.labels[1], el('vendSel').value);
    showTab('visao', q('.tabs .tab')[0]);
    const linhasDet = q('#vendDetail .br-row');
    ok('linhas do detalhamento são clicáveis', linhasDet.length > 0 && linhasDet.every(r => (r.getAttribute('onclick') || '').includes('abrirVendedor')));
    eval(linhasDet[linhasDet.length - 1].getAttribute('onclick')); await tick(30); // jsdom não dispara onclick inline
    ok('detalhamento → aba Vendedores com o vendedor', el('p-vendedores').classList.contains('active') && el('vendSel').value === linhasDet[linhasDet.length - 1].querySelector('.br-lbl').textContent, el('vendSel').value);

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
    ok('seletor lista os vendedores do período', el('vendSel').options.length === vendsSoft.length + 1, el('vendSel').options.length + ' vs ' + vendsSoft.length);
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

    bloco('Troca de empresa: vendedor que não existe na outra empresa');
    showTab('vendedores', el('tabVendedores'));
    onVendChangeDireto('PIERRE');
    switchCompany('reis'); await tick(120);
    ok('seletor volta para "Toda a equipe"', el('vendSel').value === '__TODOS__', el('vendSel').value);
    ok('aba continua ativa', el('p-vendedores').classList.contains('active'));

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
