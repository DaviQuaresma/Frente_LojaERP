/** @format */

const { Client } = require("pg");
const { getDatabaseConfig } = require("../config/dbControl");

function getNomeBancoAtivo() {
	try {
		const settings = getDatabaseConfig();
		return settings.ativo || null;
	} catch (err) {
		console.error("Erro ao obter banco ativo local:", err.message);
		return null;
	}
}

async function getNewClient() {
	const bancoAtivoLocal = getNomeBancoAtivo();

	if (!bancoAtivoLocal) {
		throw new Error("Nenhum banco ativo foi definido no arquivo de config local.");
	}

	try {
		const res = await fetch(`http://localhost:5001/api/database/${bancoAtivoLocal}`);

		if (!res.ok) {
			throw new Error(`Erro ao buscar banco "${bancoAtivoLocal}" na API: ${res.statusText}`);
		}

		const banco = await res.json();

		if (!banco || banco.database !== bancoAtivoLocal) {
			throw new Error(`Banco ativo "${bancoAtivoLocal}" não foi encontrado na API ou os dados estão inconsistentes.`);
		}

		const { host, port, user, password, database } = banco;
		if (!host || !port || !user || !password || !database) {
			throw new Error(`Configuração incompleta do banco "${bancoAtivoLocal}" na API. Verifique se todos os campos estão preenchidos.`);
		}

		const databaseData = { host, port, user, password, database };

		const client = new Client(databaseData);
		await client.connect();
		return client;

	} catch (err) {
		throw new Error("Erro ao buscar bancos cadastrados na API: " + err.message);
	}
}

module.exports = {
	getNewClient,
	getNomeBancoAtivo,
};
