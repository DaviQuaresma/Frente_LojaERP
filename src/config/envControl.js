/** @format */

const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "../config/settings.json");

function getAmbienteAtual() {
	if (!fs.existsSync(settingsPath)) {
		return "development";
	}

	const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
	return settings.NODE_ENV || "development";
}

function setAmbiente(novoValor) {
	const settings = fs.existsSync(settingsPath)
		? JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		: {};

	settings.NODE_ENV = novoValor;

	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

module.exports = { getAmbienteAtual, setAmbiente };
