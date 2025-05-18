/** @format */

module.exports = function gerarChaveAcesso({
	cUF,
	AAMM,
	CNPJ,
	mod,
	serie,
	nNF,
	tpEmis,
	cNF,
}) {
	console.log("🔍 Dados para chave de acesso:", {
		cUF,
		AAMM,
		CNPJ,
		mod,
		serie,
		nNF,
		tpEmis,
		cNF,
	});

	// Validação básica de campos obrigatórios
	const camposObrigatorios = { cUF, AAMM, CNPJ, mod, serie, nNF, tpEmis, cNF };
	for (const [campo, valor] of Object.entries(camposObrigatorios)) {
		if (valor === undefined || valor === null || String(valor).trim() === "") {
			throw new Error(
				`❌ Campo obrigatório ausente para chave de acesso: ${campo}`
			);
		}
	}

	// Formatação com padStart
	const chaveSemDV =
		String(cUF).padStart(2, "0") +
		String(AAMM).padStart(4, "0") +
		String(CNPJ).padStart(14, "0") +
		String(mod).padStart(2, "0") +
		String(serie).padStart(3, "0") +
		String(nNF).padStart(9, "0") +
		String(tpEmis) +
		String(cNF).padStart(8, "0");

	// Cálculo do dígito verificador
	const peso = [2, 3, 4, 5, 6, 7, 8, 9];
	let soma = 0;
	let pos = 0;

	for (let i = chaveSemDV.length - 1; i >= 0; i--) {
		soma += Number(chaveSemDV[i]) * peso[pos];
		pos = (pos + 1) % peso.length;
	}

	const modulo = soma % 11;
	const dv = modulo === 0 || modulo === 1 ? 0 : 11 - modulo;

	return chaveSemDV + dv;
};
