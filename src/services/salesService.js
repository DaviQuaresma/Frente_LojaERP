/** @format */

const { getAvailableProducts } = require("./stockService");
const { findBestCombination } = require("../utils/findBestCombination");
const {
	insertSale,
	updateStock,
	createTablesIfNotExists,
	insertIntoVendasInserted,
	dropAndCreateTrigger,
	checkRequiredColumns,
} = require("../utils/dbCommands");

const {
	getCodigoEgestorPorCodigoProprio,
	atualizarCacheProdutos,
} = require("../cache/cacheProdutos");

const { getNewClient } = require("../db/getNewClient");
const { VendaMiddleware } = require("./middlewareRequests");

function shuffleArray(array) {
	return array.sort(() => Math.random() - 0.5);
}

async function createSale(valorAlvo) {
	await atualizarCacheProdutos();

	console.log("🔁 Iniciando createSale com valor:", valorAlvo);
	const connection = await getNewClient();

	try {
		await checkRequiredColumns(connection);
		await connection.query("BEGIN /* Início da transação de venda automática */");

		await createTablesIfNotExists(connection);
		await dropAndCreateTrigger(connection);

		await connection.query(`
			DO $$
			BEGIN
				IF NOT EXISTS (
					SELECT 1 FROM pg_class WHERE relname = 'cod_itens_venda'
				) THEN
					CREATE SEQUENCE cod_itens_venda START WITH 1;
				END IF;
			END $$;
		`);

		console.log(`🌟 Valor alvo para venda: R$ ${valorAlvo.toFixed(2)}`);

		let produtos = await getAvailableProducts(connection);
		console.log("🔍 Produtos buscados no banco local:", produtos.length);

		// Filtrar apenas os produtos que existem no cache do eGestor
		const produtosSincronizados = [];
		for (const p of produtos) {
			const codigoProprio = p.pro_codigo?.toString();
			const codEgestor = await getCodigoEgestorPorCodigoProprio(codigoProprio);
			if (codEgestor) produtosSincronizados.push(p);
		}

		console.log("🔒 Produtos sincronizados disponíveis para venda:", produtosSincronizados.length);

		// Agora sim aplica o filtro de estoque e embaralha
		produtos = produtosSincronizados.filter((p) => p.estoque && p.estoque >= 10);
		produtos = shuffleArray(produtos);

		if (produtos.length === 0) {
			throw new Error("Nenhum produto com estoque suficiente disponível.");
		}

		const combinacao = findBestCombination(produtos, valorAlvo);
		if (!combinacao || combinacao.combination.length === 0) {
			throw new Error("Não foi possível montar uma combinação de produtos.");
		}

		const itensValidos = [];
		for (const item of combinacao.combination) {
			const { rows } = await connection.query(
				`SELECT ees_ax_saldo FROM estoque_empresa_saldo WHERE pro_codigo = $1`,
				[item.pro_codigo]
			);
			const estoqueAtual = parseFloat(rows[0]?.ees_ax_saldo ?? 0);
			if (estoqueAtual >= item.quantidade) {
				itensValidos.push(item);
			} else {
				throw new Error(`Estoque insuficiente para o produto ${item.pro_codigo}`);
			}
		}

		const somaValida = combinacao.total;

		if (somaValida !== valorAlvo) {
			throw new Error(`Valor final divergente. Esperado: ${valorAlvo}, Obtido: ${somaValida}`);
		}

		const valorFinal = somaValida;
		const arredonda = 0;
		const desconto = 0;
		const vendaId = await insertSale(connection, valorFinal, arredonda, desconto);

		let itensInseridos = 0;
		for (const item of itensValidos) {
			const { rows } = await connection.query(
				`SELECT nextval('cod_itens_venda') AS novo_codigo`
			);
			const novoCodigo = rows[0].novo_codigo;

			const aliqEfetiva = item.ite_aliq_icms_efetiva ?? 0.0;

			await connection.query(
				`INSERT INTO itens_venda (
					ven_cod_pedido, pro_codigo, ite_codigo, ite_qtd, ite_valor_unit, ite_total,
					ite_aliq_icms_efetiva, status_produto_volume_pedido, ite_incluido_sem_estoque,
					ite_estoque_processado, ite_promocao, ite_opcao, ite_origem_preco_venda,
					opcoes_entrega, ite_cmv_com_icms
				) VALUES (
					$1, $2, $3, $4, $5, $6,
					$7, 'SEM_INCLUSAO', false,
					'N', 'N', 'R', 0,
					'Pendente', 0.00
				)`,
				[
					vendaId,
					item.pro_codigo,
					novoCodigo,
					item.quantidade,
					item.preco,
					item.preco * item.quantidade,
					aliqEfetiva,
				]
			);

			await updateStock(connection, item.pro_codigo, item.quantidade);
			itensInseridos++;
		}

		await insertIntoVendasInserted(connection, {
			venda: {
				ven_cod_pedido: vendaId,
				total: valorFinal,
				desconto: desconto || 0,
				arredonda: arredonda || 0,
				data: new Date().toISOString(),
			},
			itens: itensValidos,
		});

		// Tenta enviar para API
		try {
			console.log("🛒 Enviando venda para API com vendaId:", vendaId);
			if (!vendaId) throw new Error("Não foi recebido venda ID para operação fiscal");

			await VendaMiddleware(connection, vendaId);

			await connection.query("COMMIT");
			console.log(`✅ Venda ${vendaId} finalizada com ${itensInseridos} itens.`);
			return "Operação realizada com sucesso!";
		} catch (apiError) {
			await connection.query("ROLLBACK");
			console.error("Erro na integração com API. Transação revertida.", apiError);
			throw apiError;
		}
	} catch (err) {
		await connection.query("ROLLBACK");
		console.error("❌ Erro na venda:", err);
		throw err;
	} finally {
		await connection.end();
	}
}

module.exports = { createSale };
