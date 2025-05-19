/** @format */

const { Client } = require("pg");
const { getDatabaseConfig } = require("../config/dbControl");

function carregarBancoAtivo() {
	const settings = getDatabaseConfig();

	if (!settings.ativo || !settings.salvos || !settings.salvos[settings.ativo]) {
		throw new Error("Banco de dados ativo não está definido corretamente.");
	}

	return settings.salvos[settings.ativo];
}

async function getNewClient() {
	const config = carregarBancoAtivo();
	const client = new Client(config);
	await client.connect();
	return client;
}

function getNomeBancoAtivo() {
	try {
		const settings = getDatabaseConfig();
		return settings.ativo || null;
	} catch {
		return null;
	}
}

module.exports = {
	getNewClient,
	getNomeBancoAtivo,
};
