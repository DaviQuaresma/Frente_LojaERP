/** @format */

// tests/index.js
const { getNewClient } = require("../src/db/getNewClient"); // ou ../src/db/getNewClient
const { createSale } = require("../src/services/salesService");

async function main() {
	const client = await getNewClient();
	try {
		await client.connect(); // se necessário — geralmente getNewClient já conecta
		console.log("🔌 Conectado ao PostgreSQL!");

		const valorAlvo = 30;
		await createSale(valorAlvo);
	} catch (err) {
		console.error("❌ Erro na execução:", err);
	} finally {
		await client.end();
		console.log("🔌 Conexão encerrada.");
	}
}

main();
