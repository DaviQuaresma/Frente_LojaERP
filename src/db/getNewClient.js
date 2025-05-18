/** @format */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "../config/db_settings.json");

function carregarBancoAtivo() {
	if (!fs.existsSync(settingsPath))
		throw new Error("Arquivo db_settings.json não encontrado");

	const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));

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

module.exports = { getNewClient };
