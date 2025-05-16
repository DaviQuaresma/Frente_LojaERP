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
	const chaveSemDV =
		cUF +
		AAMM +
		CNPJ.padStart(14, "0") +
		mod.padStart(2, "0") +
		serie.padStart(3, "0") +
		nNF.padStart(9, "0") +
		tpEmis +
		cNF.padStart(8, "0");

	const peso = [2, 3, 4, 5, 6, 7, 8, 9];
	let soma = 0;
	let pos = 0;

	for (let i = chaveSemDV.length - 1; i >= 0; i--) {
		soma += Number(chaveSemDV[i]) * peso[pos];
		pos = (pos + 1) % peso.length;
	}

	let modulo = soma % 11;
	let dv = modulo === 0 || modulo === 1 ? 0 : 11 - modulo;

	return chaveSemDV + dv;
};
