/** @format */

const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const config = require("../../config.json")

const userDataPath = app.getPath("userData");

function salvarConfigBanco(config) {
	const configFile = path.join(userDataPath, `${config.database}.json`);
	fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

	// Atualiza o config.json principal
	const mainConfigPath = path.join(userDataPath, "config.json");
	fs.writeFileSync(
		mainConfigPath,
		JSON.stringify({ active: config.database }, null, 2)
	);
}

function carregarConfigBanco() {
	const mainConfigPath = path.join(userDataPath, "config.json");
	if (!fs.existsSync(mainConfigPath)) return null;

	const { active } = JSON.parse(fs.readFileSync(mainConfigPath, "utf-8"));
	if (!active) return null;

	const configFile = path.join(userDataPath, `${active}.json`);
	if (!fs.existsSync(configFile)) return null;

	return JSON.parse(fs.readFileSync(configFile, "utf-8"));
}

module.exports = {
	salvarConfigBanco,
	carregarConfigBanco,
};
