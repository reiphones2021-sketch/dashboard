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
    ok('cards padrão: 8 Reis, 4 Soft, 1 extra', mCards('reis') === 8 && mCards('soft') === 4 && mCards('extra') === 1, mCards('reis') + '/' + mCards('soft') + '/' + mCards('extra'));
    ok('cada card tem seu gráfico', q('#mtGrid-reis canvas').length === 8 && q('#mtGrid-extra canvas').length === 1);

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
    ok('meta extra usa o "já feito" do próprio card', nb(txt('mtV-extra-0')) === nb(mBRL((60000 - 8281.52) / 16)), txt('mtV-extra-0'));
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
    ok('meta extra é adicionada sem prompt do navegador', mCards('extra') === 2);
    Metas.remover('extra', 1);
    ok('meta extra removida', mCards('extra') === 1);
    ok('não sobrou exportar/importar entre aparelhos', !Metas.exportar && !Metas.importar && !Metas.codigoExport && !Metas.aplicarCodigo);
    ok('metas ficam salvas no navegador', !!(JSON.parse(localStorage.getItem('metas_v5')) || {}).reis);

    bloco('Metas diárias: texto do WhatsApp');
    const mWpp = Metas.textoWpp('all');
    ok('traz as duas empresas e as extras', /REIS PHONES/.test(mWpp) && /SOFT BLINDAGEM/.test(mWpp) && /Meta Assistência/.test(mWpp));
    ok('uma meta diária por card', (mWpp.match(/Meta diária/g) || []).length === 13, (mWpp.match(/Meta diária/g) || []).length);
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

    bloco('Metas diárias: voltar para o dashboard');
    switchCompany('soft'); await tick(120);
    ok('clicar numa empresa fecha as metas', !el('p-metas').classList.contains('active') && !el('btnMetas').classList.contains('active'));
    ok('barra de período e abas voltam', document.querySelector('.pbar').style.display === '' && document.querySelector('.tabs').style.display === '');
    ok('empresa escolhida fica marcada', el('btnSoft').classList.contains('active'));
    ok('volta a aba que estava aberta antes', q('.panel.active').length === 1 && q('.panel.active')[0].id !== 'p-metas', (q('.panel.active')[0] || {}).id);

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
