// Planilhas sintéticas, no mesmo formato das abas FATURAMENTO (Reis) e da
// planilha da Soft, geradas de forma determinística (mesma semente → mesmos
// dados) e relativas à data de hoje, para que os testes não envelheçam.
// Nada aqui é dado real de cliente.

function rng(seed) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}
const pad = n => String(n).padStart(2, '0');
const br = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Dias úteis dos últimos `meses` meses até hoje (inclusive).
function diasAteHoje(meses) {
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - (meses - 1), 1, 12);
  const out = [];
  for (let d = new Date(ini); d <= hoje; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) out.push(new Date(d)); // domingo fechado
  }
  return out;
}

function reisValues() {
  const r = rng(11);
  const vend = ['SANDY', 'DIEGO', 'JULIO', 'VIDAL'];
  const itens = [
    { tipo: 'IPHONE', mod: 'IPHONE 15 PRO MAX 256GB', preco: 7500 },
    { tipo: 'IPHONE', mod: 'IPHONE 13 128GB', preco: 3200 },
    { tipo: 'IPHONE', mod: 'IPHONE 16 PRO 128GB', preco: 6800 },
    { tipo: 'IPHONE', mod: 'IPHONE 14 PRO', preco: 4900 },
    { tipo: 'APPLE WATCH', mod: '', preco: 2400 },
    { tipo: 'IPAD', mod: 'IPAD 10', preco: 3100 },
    { tipo: 'ACESSÓRIO', mod: '', preco: 150 },
    { tipo: 'ASSISTÊNCIA', mod: '', preco: 400 },
  ];
  const rows = [['STATUS', 'DATA', 'CLIENTE', 'VENDEDOR', 'TIPO', 'GARANTIA', 'PAGSEGURO', 'SEGUNDO CARTÃO', 'PIX', 'DINHEIRO', 'APARELHO NA TROCA', 'VALOR TOTAL COLETADO', 'LUCRO', 'TAXA DO CARTÃO', 'CUSTO DO PRODUTO', 'MODELO DO APARELHO VENDIDO']];
  const dias = diasAteHoje(8);
  dias.forEach((d, di) => {
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const it = itens[Math.floor(r() * itens.length)];
      const v = vend[Math.floor(r() * vend.length)];
      const val = it.preco + Math.floor(r() * 300);
      const lucro = Math.floor(val * (0.08 + r() * 0.14));
      const gar = r() < 0.2 ? 'LOJISTA' : (r() < 0.5 ? 'LACRADO' : '1 ANO');
      const status = r() < 0.05 ? 'CANCELADO' : 'FEITO';
      rows.push([status, br(d), 'CLIENTE ' + (1 + Math.floor(r() * 80)), v, it.tipo, gar, val, 0, 0, 0, 0, val, lucro, Math.floor(val * 0.03), val - lucro, it.mod]);
    }
  });
  // Casos que já quebraram a página de verdade:
  const hoje = dias[dias.length - 1];
  rows.push(['FEITO', `${pad(hoje.getDate())}/${pad(hoje.getMonth() + 1)}`, 'CLIENTE SEM ANO', 'SANDY', 'IPHONE', '1 ANO', 3000, 0, 0, 0, 0, 3000, 500, 90, 2500, 'IPHONE 12 64GB']); // data sem ano
  rows.push(['FEITO', '12/12/0204', 'CLIENTE ANO ERRADO', 'SANDY', 'IPHONE', '1 ANO', 3000, 0, 0, 0, 0, 3000, 500, 90, 2500, 'IPHONE 12 64GB']); // lixo: deve ser descartada
  return rows;
}

function softValues() {
  const r = rng(23);
  const vend = ['SANDY', 'VIDAL', 'PIERRE', 'ANA'];
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const mesAtual = hoje.getMonth(), anoAtual = hoje.getFullYear();
  const produtos = [
    ['BLINDAGEM FRONTAL', 120], ['BLINDAGEM COMPLETA', 180], ['STICKER TRASEIRO', 60], ['CÂMERA BLINDADA', 90],
    ['ASSISTÊNCIA TÉCNICA', 650], ['PLANO PROTEÇÃO 6 MESES', 300], ['ACESSÓRIO CAPINHA', 80], ['FONE DE OUVIDO', 150],
  ];
  const rows = [['VENDEDOR', 'DATA', 'CLIENTE', 'PRODUTO VENDIDO', 'PREÇO', 'STATUS', 'MARCA/MODELO', 'MODELO']];
  const dias = diasAteHoje(8);
  dias.forEach(d => {
    const n = 2 + Math.floor(r() * 5);
    // garantia: até 2 meses atrás só existia o nome genérico; depois, separada
    const recente = (d.getFullYear() * 12 + d.getMonth()) >= (anoAtual * 12 + mesAtual - 1);
    for (let i = 0; i < n; i++) {
      let [prod, preco] = produtos[Math.floor(r() * produtos.length)];
      if (r() < 0.18) { prod = recente ? (r() < 0.4 ? 'GARANTIA ESTENDIDA REIS PHONES' : 'GARANTIA ESTENDIDA SOFT BLINDAGEM') : 'GARANTIA ESTENDIDA'; preco = 250; }
      const v = vend[Math.floor(r() * vend.length)];
      const status = r() < 0.06 ? 'CANCELADO' : 'PAGO';
      rows.push([v, br(d), 'CLIENTE ' + (1 + Math.floor(r() * 120)), prod, String(preco + Math.floor(r() * 40)).replace('.', ','), status, 'APPLE', 'IPHONE 13']);
    }
  });
  // Lançamentos de hoje ainda com status HOJE (viram PAGO depois): contam.
  rows.push(['SANDY', br(hoje), 'CLIENTE HOJE 1', 'BLINDAGEM COMPLETA', '190', 'HOJE', 'APPLE', 'IPHONE 15']);
  rows.push(['PIERRE', br(hoje), 'CLIENTE HOJE 2', 'GARANTIA ESTENDIDA SOFT BLINDAGEM', '250', 'HOJE', 'APPLE', 'IPHONE 15']);
  rows.push(['PIERRE', br(hoje), 'CLIENTE HOJE 3', 'BLINDAGEM FRONTAL', '0', 'HOJE', 'APPLE', 'IPHONE 15']); // preço zero: sempre foi descartado
  return rows;
}

module.exports = { reisValues, softValues, iso, pad };
