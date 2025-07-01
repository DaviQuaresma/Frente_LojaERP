const mapProductToPayload = require('../utils/mapProductToPayload.js');
const axios = require('axios');
const pLimit = require('p-limit').default;
const { getProductsSync } = require('../utils/dbCommands.js');
const { getNewClient } = require('../db/getNewClient');
const { setToken } = require('./middlewareRequests.js');

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

async function processarProduto(prod, token, cacheProdutos, logs) {
  const payload = mapProductToPayload(prod);
  const produtoCache = cacheProdutos.get(payload.codigoProprio);

  if (produtoCache && isProdutoIgual(payload, produtoCache)) {
    logs.ignorados.push(payload.codigoProprio);
    return;
  }

  try {
    await sleep(1200);

    if (produtoCache) {
      const codigo = produtoCache.codigo;

      const { data: atualizado } = await axios.put(
        `http://localhost:3000/api/produtos/${codigo}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      logs.atualizados.push(payload.codigoProprio);
    } else {
      const { data: criado } = await axios.post(
        `http://localhost:3000/api/produtos`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      logs.criados.push(payload.codigoProprio);
    }
  } catch (err) {
    logs.erros.push({ codigo: payload.codigoProprio, erro: err?.response?.data || err.message });
  }
}

async function syncProducts() {
  console.log('[IPC] Iniciando syncProducts...');

  const connection = await getNewClient();
  const produtos = await getProductsSync(connection);
  const token = await setToken();

  let cacheProdutos = new Map();
  try {
    const { data } = await axios.get(`http://localhost:3000/api/produtos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const produtosEGestor = data?.data || data || [];

    produtosEGestor.forEach((p) => {
      cacheProdutos.set(p.codigoProprio, p);
    });

    console.log(` Produtos em cache: ${cacheProdutos.size}`);
  } catch (err) {
    console.error(' Erro ao carregar cache de produtos:', err?.response?.data || err.message);
    return;
  }

  const logs = { atualizados: [], criados: [], ignorados: [], erros: [] };
  const limit = pLimit(1);
  const tasks = produtos.map((prod) => limit(() => processarProduto(prod, token, cacheProdutos, logs)));

  await Promise.all(tasks);

  console.log(`[] Criados: ${logs.criados.length} \n Atualizados: ${logs.atualizados.length} \n️ Ignorados: ${logs.ignorados.length} \n Erros: ${logs.erros.length}`);
  if (logs.erros.length) {
    logs.erros.forEach(e => console.error(` [${e.codigo}]`, e.erro));
  }

  console.log('[IPC] syncProducts finalizado.');
}

module.exports = syncProducts;
