function shuffleArray(array) {
	return array.sort(() => Math.random() - 0.5);
}

function findBestCombination(produtos, valorAlvo) {
	let melhorCombinacao = [];
	let melhorSoma = 0;
	const limite = produtos.length;
	const margemAceitavel = 1.5;

	const produtosEmbaralhados = shuffleArray([...produtos]);

	for (let i = 0; i < limite; i++) {
		const carrinho = [];
		let total = 0;

		for (let j = i; j < limite; j++) {
			const produto = produtosEmbaralhados[j];

			const preco = Number(produto.preco);
			const estoque = Number(produto.estoque);

			if (!preco || !estoque) continue;

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

		let diferenca = parseFloat((valorAlvo - total).toFixed(2));

		// Aceita combinação com diferença dentro da margem
		if (Math.abs(diferenca) <= margemAceitavel) {
			// Tenta ajustar o último item para bater exatamente com o valor alvo
			const ultimoItem = carrinho[carrinho.length - 1];
			if (ultimoItem) {
				const precoOriginal = Number(ultimoItem.preco);
				const totalAtual = total;

				// Aplica ajuste no preço do último item
				const novoTotalUltimoItem = (ultimoItem.quantidade * precoOriginal) + diferenca;
				const novoPreco = novoTotalUltimoItem / ultimoItem.quantidade;

				// Valida que o preço ajustado ainda é positivo e não absurdo
				if (novoPreco > 0 && Math.abs(novoPreco - precoOriginal) <= 1.5) {
					ultimoItem.preco = parseFloat(novoPreco.toFixed(4));
					total = parseFloat((totalAtual + diferenca).toFixed(2));
					diferenca = parseFloat((valorAlvo - total).toFixed(2));

					// Aceita só se a correção realmente fechou no valorAlvo
					if (diferenca === 0 && total === valorAlvo) {
						melhorCombinacao = carrinho;
						melhorSoma = total;
					}
				}
			}
		}
	}

	return {
		combination: melhorCombinacao,
		total: melhorSoma,
		adjustment: parseFloat((valorAlvo - melhorSoma).toFixed(2)),
	};
}


module.exports = { findBestCombination };
