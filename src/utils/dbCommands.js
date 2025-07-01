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
	if (!pro_codigo || !quantidade || quantidade <= 0)
		throw new Error("Parâmetros inválidos para updateStock");

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

	if (result.rowCount === 0)
		throw new Error(`Produto ${pro_codigo} não encontrado.`);
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
	await connection.query(
		`
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
		DECLARE
			nTotalPedido NUMERIC(18,3);
			lDeduzirICMSDeson BOOL;
			oDevolucaoSaldoFlex BOOL;
			oBonificacaoSaldoFlex BOOL;
		BEGIN
			NEW.ITE_DESC_TOTAL := (NEW.ITE_QTD * NEW.ITE_DESC);

			SELECT COALESCE((SELECT OP.TO_DEDUZIR_ICMS_DESONERADO::BOOLEAN
				FROM VENDAS V
				LEFT JOIN TIPO_OPERACAO OP ON OP.TO_CODIGO = V.TO_CODIGO
				WHERE V.VEN_COD_PEDIDO = NEW.VEN_COD_PEDIDO), 'Y'::BOOLEAN)
			INTO lDeduzirICMSDeson;

			SELECT
				'D' = ANY (STRING_TO_ARRAY(P.CONSIDERAR_OPERACAO_SALDO_FLEX, ',')::TEXT[]),
				'B' = ANY (STRING_TO_ARRAY(P.CONSIDERAR_OPERACAO_SALDO_FLEX, ',')::TEXT[])
			INTO oDevolucaoSaldoFlex, oBonificacaoSaldoFlex
			FROM PARAMETRO P
			INNER JOIN VENDAS V ON V.VEN_COD_PEDIDO = NEW.VEN_COD_PEDIDO
			INNER JOIN EMPRESA E ON E.EMP_CODIGO = V.EMP_CODIGO AND E.EMP_CODIGO = P.EMP_CODIGO;

			nTotalPedido := (
				COALESCE(
					COALESCE(
						CASE
							WHEN NEW.VEN_MODELO_VENDA = 0 THEN
								CASE
									WHEN NEW.ITE_PRAZO_VISTA = 'P' THEN NEW.ITE_VALOR_UNIT_BRUTO
									ELSE NEW.ITE_VALOR_VISTA_BRUTO
								END * NEW.ITE_QTD
							ELSE NEW.ITE_TOTAL_BRUTO
						END,
						0
					)
					- NEW.ITE_DESC_TOTAL
					- COALESCE(NEW.ITE_DESC_RAT, 0)
					- CASE WHEN lDeduzirICMSDeson THEN COALESCE(NEW.ITE_VLR_ICMS_DESON, 0) ELSE 0 END
					+ COALESCE(NEW.ITE_ACRE_RAT, 0)
					+ COALESCE(NEW.ITE_FRETE_RAT, 0)
					+ COALESCE(NEW.ITE_VLR_IPI, 0)
					+ COALESCE(NEW.ITE_VLR_ICMS_ST, 0)
					- COALESCE(NEW.ITE_VICMSSTDESON, 0)
					+ COALESCE(NEW.ITE_VALOR_FCP_ST, 0)
					+ COALESCE(NEW.ITE_VLR_OUTRAS_DESPESAS, 0),
					0
				)
			);

			NEW.ITE_TOTAL_PEDIDO := nTotalPedido;
			NEW.ITE_QTD_AEXPEDIR := NEW.ITE_QTD - NEW.ITE_QTD_EXPEDIDO;
			NEW.ITE_QTD_UP_AEXPEDIR := NEW.ITE_QTD_UP - NEW.ITE_QTD_UP_EXPEDIDO;
			NEW.ITE_CMV := NEW.ITE_VALOR_CUSTO * NEW.ITE_QTD;
			NEW.ITE_MARGEM_BRUTA := NEW.ITE_TOTAL_PEDIDO - (NEW.ITE_VALOR_CUSTO * NEW.ITE_QTD);
			NEW.ITE_QTD_CORTE := COALESCE(NEW.ITE_QTD_CORTE_ANTES, 0) - COALESCE(NEW.ITE_QTD_CORTE_DEPOIS, 0);

			NEW.ITE_VALOR_UNIT_UP := COALESCE(
				NEW.ITE_VALOR_UNIT_UP,
				NEW.ITE_VALOR_UNIT / CASE
					WHEN NEW.ITE_QTD = 0 OR NEW.ITE_QTD_UP = 0 THEN 0.001
					ELSE NEW.ITE_QTD_UP / CASE WHEN NEW.ITE_QTD = 0 THEN 0.001 ELSE NEW.ITE_QTD END
				END
			);

			-- Garante valor inicial como fallback antes de qualquer cálculo
			IF NEW.ite_aliq_icms_efetiva IS NULL THEN
				NEW.ite_aliq_icms_efetiva := 0.00;
			END IF;

			-- Só tenta calcular se os campos estiverem presentes e o resultado for válido
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'itens_venda' AND column_name = 'ite_aliq_icms_efetiva'
			) THEN
				IF COALESCE(NEW.ite_total_bruto, 0) <> 0 THEN
					NEW.ite_aliq_icms_efetiva := (
						COALESCE(NEW.ite_vlr_icms, 0) / NEW.ite_total_bruto
					) * 100.00;
				END IF;
			END IF;

			NEW.ITE_CMV_COM_ICMS := 
				COALESCE(NEW.ITE_VALOR_CUSTO, 0) * COALESCE(NEW.ITE_QTD, 0) 
				+ COALESCE(NEW.ITE_VLR_ICMS, 0);
			NEW.ITE_CMV_CM_UNIT := NEW.ITE_CMV_CM / (NEW.ITE_QTD_UP / NEW.ITE_QTD);

			NEW.ITE_ICMS_CST := (
				SELECT CS_NUM FROM CST C
				INNER JOIN CLASSIFICACAO_FISCAL CF ON CF.CS_CODIGO = C.CS_CODIGO
				WHERE CF.CL_CODIGO = NEW.CL_CODIGO
			);

			NEW.ITE_CFOP := (
				SELECT NO_FCOP FROM NAT_OPERACAO N
				INNER JOIN CLASSIFICACAO_FISCAL CF ON CF.NO_CODIGO = N.NO_CODIGO
				WHERE CF.CL_CODIGO = NEW.CL_CODIGO
			);

			NEW.ITE_CUSTO_UNIT_SU_ULTIMA_COMPRA := NEW.ITE_CUSTO_UNIT_UP_ULTIMA_COMPRA * (NEW.ITE_QTD_UP / NEW.ITE_QTD);
			NEW.ITE_CUSTO_TOTAL_ULTIMA_COMPRA := NEW.ITE_CUSTO_UNIT_UP_ULTIMA_COMPRA * NEW.ITE_QTD_UP;
			NEW.ITE_DESCRICAO := CASE WHEN NEW.ITE_DESCRICAO = '' THEN NULL ELSE NEW.ITE_DESCRICAO END;

			NEW.ITE_SALDO_FLEX := CASE
				WHEN NEW.STATUS = 'V' OR (NEW.STATUS = 'D' AND oDevolucaoSaldoFlex) THEN
					CASE WHEN NEW.ITE_QTD = 0 THEN 0
					ELSE (((NEW.ITE_TOTAL_BRUTO - NEW.ITE_DESC_TOTAL - NEW.ITE_DESC_RAT)
						- (NEW.ITE_PRECO_TABELA * (NEW.ITE_QTD_UP / NEW.ITE_QTD) * NEW.ITE_QTD))
						* CASE WHEN NEW.STATUS = 'D' THEN -1 ELSE 1 END)
					END
				WHEN NEW.STATUS = 'B' AND oBonificacaoSaldoFlex THEN nTotalPedido * -1
				ELSE 0
			END;

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

async function checkRequiredColumns(connection) {
	const requiredColumns = ["ite_aliq_icms_efetiva", "ite_cmv_com_icms"];
	const missingColumns = [];

	for (const column of requiredColumns) {
		const { rowCount } = await connection.query(
			`SELECT 1 FROM information_schema.columns
			 WHERE table_name = 'itens_venda' AND column_name = $1`,
			[column]
		);

		if (rowCount === 0) {
			missingColumns.push(column);
		}
	}

	if (missingColumns.length > 0) {
		throw new Error(
			` Campos ausentes no banco: ${missingColumns.join(", ")}`
		);
	}
}

async function getEmpresaData(connection, emp_codigo) {
	const { rows } = await connection.query(
		`
		SELECT
			emp_cnpj AS "CNPJ",
			emp_nome AS "xNome",
			emp_nomefantasia AS "xFant",
			emp_inscricao AS "IE",
			emp_uf AS "UF",
			emp_cidade AS "xMun",
			emp_cidade_ibge_rep AS "cMun",
			emp_endereco AS "xLgr",
			emp_numero AS "nro",
			emp_bairro AS "xBairro",
			emp_cep AS "CEP",
			emp_telefone AS "fone",
			emp_idcsc AS "cscId",
			emp_csc AS "cscToken",
			emp_rp_cnpj AS "respCNPJ",
			emp_rp_contato AS "respNome",
			emp_rp_email AS "respEmail",
			emp_rp_fone AS "respFone"
		FROM empresa
		WHERE emp_codigo = $1
		LIMIT 1
		`,
		[emp_codigo]
	);

	if (rows.length === 0) {
		throw new Error(`Empresa com emp_codigo ${emp_codigo} não encontrada.`);
	}

	return rows[0];
}

async function getCertificadoData(connection, emp_codigo) {
	const { rows } = await connection.query(
		`
		SELECT
			cer_caminho AS "caminho",
			cer_senha AS "senha"
		FROM certificado
		WHERE emp_codigo = $1 AND cer_ativo = 'Y'
		ORDER BY cer_vencimento DESC
		LIMIT 1
		`,
		[emp_codigo]
	);

	if (rows.length === 0) {
		throw new Error(
			`Certificado ativo para emp_codigo ${emp_codigo} não encontrado.`
		);
	}

	return rows[0];
}

async function getVendaById(connection, ven_cod_pedido) {
	const { rows } = await connection.query(
		`
		SELECT
			ven_cod_pedido,
			ven_total,
			ven_desconto,
			ven_frete,
			ven_ipi,
			ven_icms_st,
			ven_outras_despesas,
			ven_data_hora_finaliza,
			ven_modelo_dfe,
			ven_numero_dfe,
			ven_serie_dfe,
			ven_obs,
			ven_tipo_frete
		FROM vendas
		WHERE ven_cod_pedido = $1
		LIMIT 1
		`,
		[ven_cod_pedido]
	);

	if (rows.length === 0) {
		throw new Error(
			`Venda com ven_cod_pedido ${ven_cod_pedido} não encontrada.`
		);
	}

	return rows[0];
}

async function getItensVendaByPedido(connection, ven_cod_pedido) {
	const { rows } = await connection.query(
		`
		SELECT
			ite_codigo,
			pro_codigo,
			ite_qtd,
			ite_valor_unit,
			ite_total,
			ite_unidade,
			ite_aliq_icms_efetiva,
			ite_vlr_icms,
			ite_icms_cst,
			ite_bc_icms,
			ite_vlr_ipi,
			ite_vlr_icms_st,
			ite_cfop,
			ite_descricao
		FROM itens_venda
		WHERE ven_cod_pedido = $1
		`,
		[ven_cod_pedido]
	);

	return rows;
}


async function getProducts(connection) {
	const { rows } = await connection.query(`
     SELECT DISTINCT
      p.pro_codigo,
      p.pro_descricao,
      p.pro_unidade,
      p.pro_preco_custo,
      p.pro_preco_venda,
      p.pro_lucro,
      p.pro_codigo_ean,
      p.pro_codigo_fiscal,
      p.pro_peso_bruto,
      p.pro_peso,
      COALESCE(ees.ees_ax_saldo, 0) AS estoque
    FROM
      produto p
    INNER JOIN
      estoque_empresa_saldo ees ON ees.pro_codigo = p.pro_codigo
    WHERE
      COALESCE(ees.ees_ax_saldo, 0) >= 10
      AND (p.atualizado IS NULL OR p.atualizado = 'N')
    ORDER BY
      p.pro_codigo;
  `
	);
	return rows;
}

async function getProductsSync(connection) {
	const { rows } = await connection.query(`
    SELECT
      p.pro_codigo,
      p.pro_descricao,
      p.pro_preco_custo,
      p.pro_preco_venda,
      p.pro_unidade,
      p.pro_codigo_ean,
      p.pro_codigo_fiscal,
      p.pro_peso,
      p.pro_peso_bruto,
      p.pro_lucro,
      ees.ees_ax_saldo AS estoque
    FROM
      produto p
    INNER JOIN
      estoque_empresa_saldo ees ON ees.pro_codigo = p.pro_codigo
    WHERE
      COALESCE(ees.ees_ax_saldo, 0) >= 1
  `);

	return rows;
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
	checkRequiredColumns,
	getEmpresaData,
	getCertificadoData,
	getVendaById,
	getItensVendaByPedido,
	getProducts,
	getProductsSync
};
