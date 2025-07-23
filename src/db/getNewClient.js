/** @format */

const { Client } = require("pg");
const axios = require("axios");
const { getDatabaseConfig } = require("../config/dbControl");

function getNomeBancoAtivo() {
	try {
		const settings = getDatabaseConfig();
		return settings.ativo || null;
	} catch (err) {
		console.error("❌ Erro ao obter banco ativo local:", err.message);
		return null;
	}
}

async function getNewClient() {
	const bancoAtivoNome = getNomeBancoAtivo();
	if (!bancoAtivoNome) {
		throw new Error("Nenhum banco ativo foi definido no arquivo de config local.");
	}

	let bancos;
	try {
		const response = await axios.get("http://localhost:3001/api/database");
		bancos = response.data;
	} catch (err) {
		throw new Error("Erro ao buscar bancos cadastrados na API: " + err.message);
	}

	const banco = bancos.find(b => b.database === bancoAtivoNome);

	if (!banco) {
		throw new Error(`Banco ativo "${bancoAtivoNome}" não foi encontrado na API.`);
	}

	// Validação mínima dos campos essenciais
	const { host, port, user, password, database } = banco;
	if (!host || !port || !user || !password || !database) {
		throw new Error(
			`Configuração incompleta do banco "${banco.nome}" na API. Verifique se todos os campos estão preenchidos.`
		);
	}

	const client = new Client({ host, port, user, password, database });
	await client.connect();
	return client;
}

module.exports = {
	getNewClient,
	getNomeBancoAtivo,
};
