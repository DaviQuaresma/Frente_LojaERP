/** @format */

async function getAvailableProducts(connection) {
	const query = `
		SELECT DISTINCT
			p.pro_codigo,
			p.pro_descricao,
			p.pro_preco_venda,
			COALESCE(ees.ees_ax_saldo, 0) AS estoque
		FROM
			produto p
		INNER JOIN
			estoque_empresa_saldo ees ON ees.pro_codigo = p.pro_codigo
		WHERE
			COALESCE(ees.ees_ax_saldo, 0) >= 10
		ORDER BY
			p.pro_codigo
	`;

	const { rows } = await connection.query(query);

	// Mapear no formato compatível com findBestCombination
	return rows.map((row) => ({
		pro_codigo: row.pro_codigo,
		descricao: row.pro_descricao,
		preco: parseFloat(row.pro_preco_venda),
		estoque: parseFloat(row.estoque),
	}));
}

module.exports = { getAvailableProducts };
