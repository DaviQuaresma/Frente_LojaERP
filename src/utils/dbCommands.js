/** @format */

async function insertSale(
	connection,
	total,
	arredonda,
	desconto,
	usu_codigo = -161
) {
	const insertQuery = `
		INSERT INTO vendas (
			ven_data,
			ven_desconto,
			cli_codigo,
			par_cp_codigo,
			est_codigo,
			ven_total,
			ven_arredonda,
			ven_data_hora_finaliza,
			ven_hora,
			ve_codigo,
			ven_status,
			to_codigo,
			ta_codigo,
			ven_cupom,
			finalizado,
			nf_numero,
			usu_codigo,
			ven_troco,
			ven_modelo_venda,
			ven_data_hora_faturamento,
			ven_obs_interna,
			ven_modelo_dfe,
			ven_numero_dfe,
			ven_dfe,
			ven_modelo_nfe,
			ven_frete,
			ven_ipi,
			ven_icms_st,
			ven_mov_estoque,
			emp_codigo,
			ven_tipo_frete,
			tp_codigo,
			tx_codigo,
			co_codigo,
			faturado,
			ven_tipo_venda,
			ser_total
		) VALUES (
			TO_DATE(TO_CHAR(NOW(), 'DD/MM/YYYY'), 'DD/MM/YYYY'), -- $1  ven_data
			$1,                  -- $2  ven_desconto
			1,                   -- $3  cli_codigo
			2,                   -- $4  par_cp_codigo
			14,                  -- $5  est_codigo
			$2,                  -- $6  ven_total
			$3,                  -- $7  ven_arredonda
			NOW(),               -- $8  ven_data_hora_finaliza
			TO_CHAR(NOW(), 'HH24:MI:SS'), -- $9  ven_hora
			1,                   -- $10 ve_codigo
			'V',                 -- $13 ven_status
			1,                   -- $15 to_codigo
			7,                   -- $16 ta_codigo
			'S',                 -- $21 ven_cupom
			'Y',                 -- $22 finalizado
			1,                   -- $24 nf_numero
			$4,                  -- $25 usu_codigo
			0.0,                 -- $26 ven_troco
			1,                   -- $27 ven_modelo_venda
			NOW(),               -- $28 ven_data_hora_faturamento
			'VENDA FRENTE DE CAIXA 1', -- $29 ven_obs_interna
			'65',                -- $30 ven_modelo_dfe
			1,                   -- $31 ven_numero_dfe
			1,                   -- $32 ven_dfe
			'65',                -- $33 ven_modelo_nfe
			0.0,                 -- $35 ven_frete
			0.0,                 -- $36 ven_ipi
			0.0,                 -- $37 ven_icms_st
			'P',                 -- $38 ven_mov_estoque
			1,                   -- $40 emp_codigo
			0,                 -- $41 ven_tipo_frete
			1,
			1,
			9,
			'Y',
			'P',
			0
		)
		RETURNING ven_cod_pedido;
	`;

	const values = [
		desconto, // $1
		total, // $2
		arredonda, // $3
		usu_codigo, // $4
	];

	const { rows } = await connection.query(insertQuery, values);
	return rows[0].ven_cod_pedido;
}

async function updateStock(connection, pro_codigo, quantidade) {
	if (!pro_codigo || !quantidade || quantidade <= 0) {
		throw new Error("Parâmetros inválidos para updateStock");
	}

	const result = await connection.query(
		`
			UPDATE estoque_empresa_saldo
		SET
			ees_ax_saldo = ees_ax_saldo - $1,
			ees_up_saldo = ees_up_saldo - $1,
			ees_up_disponivel = ees_up_disponivel - $1,
			ees_up_custo_total = ees_up_custo_total - $1
		WHERE pro_codigo = $2
		RETURNING ees_ax_saldo;
	  	`,
		[quantidade, pro_codigo]
	);

	if (result.rowCount === 0) {
		throw new Error(
			`Produto com código ${pro_codigo} não encontrado para atualizar estoque.`
		);
	}

	console.log(
		`
		📉 Estoque atualizado: produto ${pro_codigo}, -${quantidade}, novo saldo: ${result.rows[0].ees_ax_saldo}
		📉 Estoque atualizado: produto ${pro_codigo}, -${quantidade}, novo saldo: ${result.rows[0].ees_up_saldo}
		📉 Estoque atualizado: produto ${pro_codigo}, -${quantidade}, novo saldo: ${result.rows[0].ees_up_disponivel}
		📉 Estoque atualizado: produto ${pro_codigo}, -${quantidade}, novo saldo: ${result.rows[0].ees_up_custo_total}
		`
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
