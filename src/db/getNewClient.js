/** @format */

const { default: axios } = require("axios");
const { Client } = require("pg");

async function getNewClient() {

	const response = await axios.get(`http://localhost:5001/api/database/active/data`);

	if (!response || response.status !== 200) {
		throw new Error("Falha na busca pelo banco ativo");
	}

	const bancoAtivoLocal = response.data.data.database.trim();

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
	getNewClient
};
