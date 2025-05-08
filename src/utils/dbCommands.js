/** @format */

async function insertSale(connection, total, arredonda, desconto, usu_codigo = -161) {
	const insertQuery = `
	INSERT INTO vendas (
		ven_data, ven_desconto, cli_codigo, par_cp_codigo, est_codigo,
		ven_total, ven_arredonda, ven_data_hora_finaliza, ven_hora,
		ve_codigo, ven_status, to_codigo, ta_codigo, ven_cupom, finalizado,
		usu_codigo, ven_troco, ven_modelo_venda, ven_data_hora_faturamento,
		ven_modelo_dfe, ven_dfe, ven_modelo_nfe,
		ven_frete, ven_ipi, ven_icms_st, ven_mov_estoque, emp_codigo,
		ven_tipo_frete, tp_codigo, tx_codigo, co_codigo, faturado,
		ven_tipo_venda, ser_total
	) VALUES (
		TO_DATE(TO_CHAR(NOW(), 'DD/MM/YYYY'), 'DD/MM/YYYY'),
		$1, 1, 2, 14, $2, $3,
		NOW(), TO_CHAR(NOW(), 'HH24:MI:SS'), 1, 'V', 1, 7, 'S', 'Y',
		$4, 0.0, 1, NOW(),
		'65', 6, '65',
		0.0, 0.0, 0.0, 'P', 1,
		0, 1, 1, 9, 'Y', 'P', 0
	)
	RETURNING ven_cod_pedido;
	`;

	const values = [
		parseFloat(desconto || 0),
		parseFloat(total || 0),
		parseFloat(arredonda || 0),
		parseInt(usu_codigo || -161),
	];

	const { rows } = await connection.query(insertQuery, values);
	return rows[0].ven_cod_pedido;
}

async function updateStock(connection, pro_codigo, quantidade) {
	if (!pro_codigo || !quantidade || quantidade <= 0) throw new Error("Parâmetros inválidos para updateStock");

	const result = await connection.query(
		`UPDATE estoque_empresa_saldo
		SET ees_ax_saldo = ees_ax_saldo - $1,
			ees_up_saldo = ees_up_saldo - $1,
			ees_up_disponivel = ees_up_disponivel - $1,
			ees_up_custo_total = ees_up_custo_total - $1
		WHERE pro_codigo = $2
		RETURNING ees_ax_saldo;`,
		[quantidade, pro_codigo]
	);

	if (result.rowCount === 0) throw new Error(`Produto ${pro_codigo} não encontrado.`);
}

async function createTablesIfNotExists(connection) {
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
	await connection.query(`
		INSERT INTO vendas_inserted (
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
}

async function dropAndCreateTrigger(connection) {
	await connection.query(`
		DROP TRIGGER IF EXISTS p999_trg_computed_itens_venda ON itens_venda;
		DROP FUNCTION IF EXISTS p999_trg_computed_itens_venda();

		CREATE OR REPLACE FUNCTION public.p999_trg_computed_itens_venda()
		RETURNS trigger AS $$
		BEGIN
			-- Executa apenas se a coluna existir
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'itens_venda' AND column_name = 'ite_aliq_icms_efetiva'
			) THEN
				NEW.ite_aliq_icms_efetiva := COALESCE(NEW.ite_aliq_icms_efetiva, 0.00);
			END IF;

			NEW.ite_total := (
				COALESCE(NEW.ite_total_bruto, 0) - COALESCE(NEW.ite_desc, 0)
				- COALESCE(NEW.ite_desc_rat, 0) + COALESCE(NEW.ite_vlr_ipi, 0)
				+ COALESCE(NEW.ite_vlr_icms_st, 0) - COALESCE(NEW.ite_vlr_icms_deson, 0)
				- COALESCE(NEW.ite_vicmsstdeson, 0)
			)::NUMERIC(18,2);

			NEW.ite_desc_total := COALESCE(NEW.ite_qtd, 0) * COALESCE(NEW.ite_desc, 0);
			NEW.ite_descricao := CASE WHEN TRIM(COALESCE(NEW.ite_descricao, '')) = '' THEN NULL ELSE NEW.ite_descricao END;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		CREATE TRIGGER p999_trg_computed_itens_venda
		BEFORE INSERT OR UPDATE ON itens_venda
		FOR EACH ROW EXECUTE FUNCTION public.p999_trg_computed_itens_venda();
	`);
}

async function createTriggerNFC(connection) {
	await connection.query(`
		DO $$
		DECLARE max_nfe integer;
		BEGIN
			SELECT COALESCE(MAX(ven_numero_dfe::integer), 0) INTO max_nfe FROM vendas;
			IF NOT EXISTS (
				SELECT 1 FROM pg_class WHERE relname = 'seq_ven_numero_dfe') THEN
				EXECUTE format('CREATE SEQUENCE seq_ven_numero_dfe START WITH %s;', max_nfe + 1);
			ELSE
				PERFORM setval('seq_ven_numero_dfe', max_nfe, true);
			END IF;
		END $$;
	`);
}

async function defineDefaultNFC(connection) {
	await connection.query(`
		ALTER TABLE vendas ALTER COLUMN ven_numero_dfe
		SET DEFAULT nextval('seq_ven_numero_dfe');
	`);
}

async function createTriggerNf_number(connection) {
	await connection.query(`
		CREATE OR REPLACE FUNCTION sync_nf_numero_with_dfe()
		RETURNS trigger AS $$
		BEGIN
			IF NEW.ven_numero_dfe IS NOT NULL THEN
				NEW.nf_numero := NEW.ven_numero_dfe;
			END IF;
			RETURN NEW;
		END;
		$$ LANGUAGE plpgsql;

		DROP TRIGGER IF EXISTS trg_sync_nf_numero ON vendas;

		CREATE TRIGGER trg_sync_nf_numero
		BEFORE INSERT OR UPDATE ON vendas
		FOR EACH ROW EXECUTE FUNCTION sync_nf_numero_with_dfe();
	`);
}

module.exports = {
	updateStock,
	insertSale,
	createTablesIfNotExists,
	insertIntoVendasInserted,
	dropAndCreateTrigger,
	createTriggerNFC,
	defineDefaultNFC,
	createTriggerNf_number,
};
