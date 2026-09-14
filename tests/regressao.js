// ╔══════════════════════════════════════════════════════════════════════╗
// ║  TRAVA DE REGRESSÃO DO DASHBOARD                                      ║
// ║                                                                       ║
// ║  Cada bloco abaixo protege um comportamento que já foi entregue e     ║
// ║  aprovado. Se um teste falhar depois de uma edição, a edição quebrou  ║
// ║  algo — conserte a edição, NÃO o teste. Roda com `npm test`, no       ║
// ║  pre-commit e no GitHub Actions antes de publicar.                    ║
// ╚══════════════════════════════════════════════════════════════════════╝
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const Papa = require('papaparse');
const { reisValues, softValues, iso, pad } = require('./fixtures');

const RAIZ = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

// ── página no jsdom, com Chart.js e rede substituídos ─────────────────
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;
const errosPagina = [];
w.__charts = {};
w.Chart = class { constructor(canvas, cfg) { this.canvas = canvas; this.config = cfg; this.data = cfg.data; this.options = cfg.options || {}; w.__charts[canvas.id] = this; } destroy() {} resize() {} };
w.Chart.defaults = { font: {} };
w.Papa = Papa;
// Rede 'pendurada': o DOMContentLoaded da página fica esperando para sempre e
// não renderiza por cima do roteiro (que carrega as planilhas sintéticas).
w.fetch = () => new Promise(() => {});
w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = () => ({});
w.console.log = () => {}; w.console.warn = () => {};
w.console.error = (...a) => errosPagina.push(a.join(' '));
w.addEventListener('error', e => errosPagina.push('exceção: ' + (e.error && e.error.message || e.message)));

const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i)[1];
w.__REIS = reisValues();
w.__SOFT = softValues();

// Tudo roda num único eval, no mesmo escopo léxico do script da página
// (senão os let/const do arquivo não ficam visíveis para o roteiro).
const roteiro = fs.readFileSync(path.join(__dirname, 'roteiro.js'), 'utf8');

(async () => {
  let R;
  try { R = await w.eval(inline + '\n;' + roteiro); }
  catch (e) { console.log('FALHA GERAL ao executar a página: ' + e.message + '\n' + e.stack); process.exit(1); }

  let falhas = 0;
  let bloco = '';
  R.passos.forEach(p => {
    if (p.bloco !== bloco) { bloco = p.bloco; console.log('\n' + bloco); }
    if (!p.ok) falhas++;
    console.log((p.ok ? '   ok    ' : '   FALHA ') + p.nome + (p.detalhe ? '   [' + p.detalhe + ']' : ''));
  });
  R.excecoes.forEach(e => { falhas++; console.log('\n   EXCEÇÃO no roteiro: ' + e); });
  errosPagina.forEach(e => { falhas++; console.log('   ERRO da página: ' + e); });

  // ── verificações estáticas (arquivos que fazem parte da trava) ───────
  console.log('\nArquivos da trava');
  const estatico = (nome, cond, det) => { if (!cond) falhas++; console.log((cond ? '   ok    ' : '   FALHA ') + nome + (det ? '   [' + det + ']' : '')); };
  const wf = path.join(RAIZ, '.github', 'workflows', 'pages.yml');
  estatico('workflow de publicação existe', fs.existsSync(wf));
  if (fs.existsSync(wf)) {
    const y = fs.readFileSync(wf, 'utf8');
    estatico('deploy só roda depois dos testes (needs: test)', /needs:\s*\[?\s*test/.test(y));
    estatico('workflow executa npm test', /npm test/.test(y));
  }
  estatico('CLAUDE.md com as regras existe', fs.existsSync(path.join(RAIZ, 'CLAUDE.md')));
  estatico('CSS do celular: célula de grid encolhe', /\.cg>\*,\.kg>\*,\.split>\*\{min-width:0;\}/.test(html));
  estatico('CSS do celular: tabelas comparativas rolam no card', /#cmpTable,#compTable\{overflow-x:auto;\}/.test(html));
  estatico('favicon embutido', /<link rel="icon" href="data:image\/svg\+xml/.test(html));
  estatico('GitHub Pages: link público sem login (sem vercel.json)', !fs.existsSync(path.join(RAIZ, 'vercel.json')));

  console.log('\n' + (falhas ? '✖ ' + falhas + ' FALHA(S) — a edição quebrou algo que estava travado.' : '✔ TRAVA OK — ' + R.passos.length + ' verificações passaram.'));
  process.exit(falhas ? 1 : 0);
})();
