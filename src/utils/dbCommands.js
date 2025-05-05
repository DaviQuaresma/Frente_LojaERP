/** @format */

async function insertSale(connection, total, arredonda, desconto) {
	const ta_codigo = 7; // da tabela_preco
	const to_codigo = 1; // da tipo_operacao
	const tx_codigo = 1; // da terminal_caixa
	const ve_codigo = 1; // da vendedor
	const est_codigo = 1; // da estado_pedido
	const cli_codigo = 2;
	const par_cp_codigo = 2;
	const emp_codigo = 1;
	const usu_codigo = 1;
	const ven_tab_preco = 2;
	const ven_modelo_venda = 1;

	const { rows } = await connection.query(
		`INSERT INTO vendas (
			ven_data, ven_total, ven_arredonda, ven_desconto,
			cli_codigo, par_cp_codigo, est_codigo, ve_codigo,
			ven_status, ven_tipo, ven_tab_preco, to_codigo,
			ta_codigo, tx_codigo, emp_codigo, usu_codigo,
			ven_modelo_venda, ven_tipo_pag_jor, ven_data_hora_finaliza,
			ven_hora
		) VALUES (
			NOW(), $1, $2, $3,
			$4, $5, $6, $7,
			'V', 'P', $8, $9,
			$10, $11, $12, $13,
			$14, 'P', NOW(),
			TO_CHAR(NOW(), 'HH24:MI:SS')
		) RETURNING ven_cod_pedido`,
		[
			total,
			arredonda,
			desconto,
			cli_codigo,
			par_cp_codigo,
			est_codigo,
			ve_codigo,
			ven_tab_preco,
			to_codigo,
			ta_codigo,
			tx_codigo,
			emp_codigo,
			usu_codigo,
			ven_modelo_venda,
		]
	);

	return rows[0].ven_cod_pedido;
}

async function updateStock(connection, pro_codigo, quantidade) {
	if (!pro_codigo || !quantidade || quantidade <= 0) {
		throw new Error("Parâmetros inválidos para updateStock");
	}

	const result = await connection.query(
		`
	  UPDATE estoque_empresa_saldo
	  SET ees_ax_saldo = ees_ax_saldo - $1
	  WHERE pro_codigo = $2
	  RETURNING ees_ax_saldo
	  `,
		[quantidade, pro_codigo]
	);

	if (result.rowCount === 0) {
		throw new Error(
			`Produto com código ${pro_codigo} não encontrado para atualizar estoque.`
		);
	}

	console.log(
		`📉 Estoque atualizado: produto ${pro_codigo}, -${quantidade}, novo saldo: ${result.rows[0].ees_ax_saldo}`
	);
}

async function createTablesIfNotExists(connection) {
	console.log("\n\nCriando tabelas!\n\n");
	await connection.query(`
	  CREATE TABLE IF NOT EXISTS vendas_inserted (
		id SERIAL PRIMARY KEY,
		ven_cod_pedido INTEGER,
		total NUMERIC,
		desconto NUMERIC,
		arredonda NUMERIC,
		data TIMESTAMP,
		itens JSONB
	  );
	`);
}

async function insertIntoVendasInserted(connection, vendaCompleta) {
	const { venda, itens } = vendaCompleta;
	await connection.query(
		`INSERT INTO vendas_inserted (
		ven_cod_pedido, total, desconto, arredonda, data, itens
	  ) VALUES ($1, $2, $3, $4, $5, $6)`,
		[
			venda.ven_cod_pedido,
			venda.total,
			venda.desconto,
			venda.arredonda,
			venda.data,
			JSON.stringify(itens),
		]
	);
	console.log(`🗃️ Venda ${venda.ven_cod_pedido} salva em vendas_inserted`);
}

async function dropAndCreateTrigger(connection) {
	await connection.query(
		`
		-- Remove os triggers que usam a função
		DROP TRIGGER IF EXISTS p999_trg_computed_itens_venda ON itens_venda;
		DROP TRIGGER IF EXISTS trg_computed_itens_venda ON itens_venda;

		-- Agora sim: remove a função
		DROP FUNCTION IF EXISTS p999_trg_computed_itens_venda();
		DROP FUNCTION IF EXISTS public.p999_trg_computed_itens_venda();

		-- Cria novamente a função
		CREATE OR REPLACE FUNCTION public.p999_trg_computed_itens_venda()
		RETURNS trigger
		LANGUAGE plpgsql
		AS $$
		BEGIN
		-- Proteção contra valores nulos em campo obrigatório
		NEW.ite_aliq_icms_efetiva := COALESCE(NEW.ite_aliq_icms_efetiva, 0.00);

		-- Cálculo do total do item
		NEW.ite_total := (
			COALESCE(NEW.ite_total_bruto, 0)
			- COALESCE(NEW.ite_desc, 0)
			- COALESCE(NEW.ite_desc_rat, 0)
			+ COALESCE(NEW.ite_vlr_ipi, 0)
			+ COALESCE(NEW.ite_vlr_icms_st, 0)
			- COALESCE(NEW.ite_vlr_icms_deson, 0)
			- COALESCE(NEW.ite_vicmsstdeson, 0)
		)::NUMERIC(18, 2);

		-- Preencher ITE_DESC_TOTAL como qtd * desc unit
		NEW.ite_desc_total := COALESCE(NEW.ite_qtd, 0) * COALESCE(NEW.ite_desc, 0);

		-- Ajustar descrição para NULL se for string vazia
		NEW.ite_descricao := CASE
			WHEN TRIM(COALESCE(NEW.ite_descricao, '')) = '' THEN NULL
			ELSE NEW.ite_descricao
		END;

		RETURN NEW;
		END;
		$$;
	`
	);
}

module.exports = {
	updateStock,
	insertSale,
	createTablesIfNotExists,
	insertIntoVendasInserted,
	dropAndCreateTrigger,
};
