/** @format */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const settingsPath = path.join(app.getPath("userData"), "settings.json");

// Retorna o ambiente atual (production | development)
function getAmbienteAtual() {
	if (!fs.existsSync(settingsPath)) {
		return "development";
	}

	const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
	return settings.NODE_ENV || "development";
}

// Define e salva o novo ambiente
function setAmbiente(novoValor) {
	const settings = fs.existsSync(settingsPath)
		? JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		: {};

	settings.NODE_ENV = novoValor;

	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
	console.log(`🌍 Ambiente alterado para: ${novoValor}`);
}

module.exports = { getAmbienteAtual, setAmbiente };
