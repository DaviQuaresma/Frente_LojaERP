/** @format */

const { Client } = require("pg");

async function conectarBanco(config) {
	const client = new Client(config);
	await client.connect();
	return client;
}

module.exports = { conectarBanco };