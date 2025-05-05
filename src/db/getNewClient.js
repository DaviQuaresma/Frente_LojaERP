/** @format */

const { Client } = require("pg");
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function getConfigPath() {
	return path.join(app.getPath("userData"), "config.json");
}

function carregarConfigBanco() {
	const mainPath = getConfigPath();
	if (!fs.existsSync(mainPath)) return null;
	const { active } = JSON.parse(fs.readFileSync(mainPath, "utf-8"));
	const dbPath = path.join(app.getPath("userData"), `${active}.json`);
	if (!fs.existsSync(dbPath)) return null;
	return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

async function getNewClient() {
	const config = carregarConfigBanco();
	if (!config) throw new Error("⚠️ Nenhuma configuração de banco foi salva.");
	const client = new Client(config);
	await client.connect();
	return client;
}

module.exports = { getNewClient };
