const mapProductToPayload = require('../utils/mapProductToPayload.js');
const axios = require('axios');
const pLimit = require('p-limit').default;
const { getProductsSync } = require('../utils/dbCommands.js');
const { getNewClient } = require('../db/getNewClient');
const { setToken } = require('./middlewareRequests');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isProdutoIgual(local, remoto) {
  const camposComparar = [
    'descricao', 'codigoProprio', 'codCategoria', 'estoque', 'estoqueMinimo',
    'controlarEstoque', 'margemLucro', 'precoCusto', 'precoVenda', 'origemFiscal',
    'unidadeTributada', 'refEanGtin', 'ncm', 'codigoCEST', 'excecaoIPI',
    'codigoGrupoTributos', 'anotacoesNFE', 'anotacoesInternas', 'pesoBruto',
    'pesoLiquido', 'tags'
  ];

  for (const campo of camposComparar) {
    const a = local[campo] ?? '';
    const b = remoto[campo] ?? '';
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.sort().join(',') !== b.sort().join(',')) return false;
    } else if (a !== b) {
      return false;
    }
  }
  return true;
}

function buscarProdutoPorCodigo(codigoProprio, listaOrdenada) {
  let esquerda = 0;
  let direita = listaOrdenada.length - 1;
  const codigo = (codigoProprio || '').toString().toLowerCase();

  while (esquerda <= direita) {
    const meio = Math.floor((esquerda + direita) / 2);
    const atual = (listaOrdenada[meio].codigoProprio || '').toString().toLowerCase();

    if (codigo === atual) return listaOrdenada[meio];
    if (codigo < atual) {
      direita = meio - 1;
    } else {
      esquerda = meio + 1;
    }
  }

  return null;
}

async function processarProduto(prod, token, produtosOrdenados, logs) {
  const payload = mapProductToPayload(prod);
  const produtoCache = buscarProdutoPorCodigo(payload.codigoProprio, produtosOrdenados);

  if (produtoCache && isProdutoIgual(payload, produtoCache)) {
    logs.ignorados.push(payload.codigoProprio);
    return;
  }

  try {
    await sleep(1000);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    if (produtoCache) {
      await axios.put(`http://localhost:3000/api/produtos/${produtoCache.codigo}`, payload, { headers });
      logs.atualizados.push(payload.codigoProprio);
    } else {
      await axios.post(`http://localhost:3000/api/produtos`, payload, { headers });
      logs.criados.push(payload.codigoProprio);
    }
  } catch (err) {
    logs.erros.push({
      codigo: payload.codigoProprio,
      erro: err?.response?.data || err.message,
    });
  }
}

async function syncProducts() {
  console.log('[IPC] Iniciando syncProducts...');

  let connection, token;
  try {
    connection = await getNewClient();
    token = await setToken();
  } catch (err) {
    console.error('❌ Erro inicial ao preparar sincronização:', err.message || err);
    return;
  }

  let produtos = [];
  try {
    produtos = await getProductsSync(connection);
    if (!produtos.length) {
      console.log('⚠️ Nenhum produto encontrado para sincronizar.');
      return;
    }
  } catch (err) {
    console.error('❌ Erro ao buscar produtos do banco:', err.message || err);
    return;
  }

  let produtosOrdenados = [];
  try {
    const { data } = await axios.get(`http://localhost:3000/api/produtos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    produtosOrdenados = (data?.data || data || []).sort((a, b) =>
      (a.codigoProprio || '').toLowerCase().localeCompare((b.codigoProprio || '').toLowerCase())
    );

    console.log(`📦 Produtos no middleware: ${produtosOrdenados.length}`);
  } catch (err) {
    console.error('❌ Erro ao carregar produtos do middleware:', err?.response?.data || err.message);
    return;
  }

  const logs = { atualizados: [], criados: [], ignorados: [], erros: [] };
  const limit = pLimit(1);

  const tasks = produtos.map((prod) =>
    limit(() => processarProduto(prod, token, produtosOrdenados, logs))
  );

  await Promise.all(tasks);

  console.log(`
✅ Sincronização finalizada:
  - Criados:     ${logs.criados.length}
  - Atualizados: ${logs.atualizados.length}
  - Ignorados:   ${logs.ignorados.length}
  - Erros:       ${logs.erros.length}
  `);

  if (logs.erros.length) {
    logs.erros.forEach(e =>
      console.error(`❌ Erro [${e.codigo}]:`, e.erro)
    );
  }

  console.log('[IPC] syncProducts finalizado.');
}

module.exports = syncProducts;
