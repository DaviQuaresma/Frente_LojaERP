/** @format */

// src/utils/calculator.js

function findBestCombination(products, targetValue) {
	// Ordenar produtos do maior para o menor preço
	const sortedProducts = products.sort((a, b) => b.preco - a.preco);

	let combination = [];
	let currentSum = 0;

	for (let produto of sortedProducts) {
		if (currentSum + produto.preco <= targetValue) {
			combination.push(produto); // sem alterar o preço
			currentSum += produto.preco;
		}
	}

	const adjustment = targetValue - currentSum;

	return {
		combination,
		total: currentSum,
		adjustment: adjustment, // pode ser positivo ou zero
	};
}

module.exports = { findBestCombination };
