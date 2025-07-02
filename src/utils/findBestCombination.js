/** @format */

function shuffleArray(array) {
	return array.sort(() => Math.random() - 0.5);
}

function findBestCombination(produtos, valorAlvo) {
	let melhorCombinacao = [];
	let melhorSoma = 0;
	const limite = produtos.length;
	const margemAceitavel = 0.5; // tolerância de ajuste

	// 🔥 Embaralhar produtos para gerar combinações aleatórias
	const produtosEmbaralhados = shuffleArray([...produtos]);

	for (let i = 0; i < limite; i++) {
		const carrinho = [];
		let total = 0;

		for (let j = i; j < limite; j++) {
			const produto = produtosEmbaralhados[j];

			const preco = Number(produto.preco);
			const estoque = Number(produto.estoque);

			if (!preco || !estoque) continue; // Ignora produtos inválidos

			const maxQtd = Math.floor((valorAlvo - total) / preco);

			if (maxQtd > 0) {
				const qtd = Math.min(maxQtd, estoque);

				if (qtd >= 1 && Number.isInteger(qtd)) {
					carrinho.push({ ...produto, quantidade: qtd });
					total += qtd * preco;
				}
			}

			if (total >= valorAlvo) break;
		}

		// Agora compara permitindo a margem aceitável
		const diferenca = Math.abs(valorAlvo - total);

		if (total > melhorSoma && diferenca <= margemAceitavel) {
			melhorCombinacao = carrinho;
			melhorSoma = total;
		}
	}

	return {
		combination: melhorCombinacao,
		total: melhorSoma,
		adjustment: parseFloat((valorAlvo - melhorSoma).toFixed(2)),
	};
}

module.exports = { findBestCombination };
