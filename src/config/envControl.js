/** @format */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const settingsPath = path.join(app.getPath("userData"), "settings.json");

// Retorna o ambiente atual (production | development)
function getAmbienteAtual() {
	try {
		if (!fs.existsSync(settingsPath)) {
			console.warn(
				"⚠️ Arquivo settings.json não encontrado. Usando 'development' por padrão."
			);
			return "development";
		}

		const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
		return settings.NODE_ENV || "development";
	} catch (err) {
		console.error("❌ Erro ao ler o settings.json:", err.message);
		return "development";
	}
}

// Define e salva o novo ambiente
function setAmbiente(novoValor) {
	try {
		let settings = {};
		if (fs.existsSync(settingsPath)) {
			settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
		} else {
			console.log("📁 Criando settings.json em:", settingsPath);
		}

		settings.NODE_ENV = novoValor;
		fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
		console.log(`🌍 Ambiente alterado para: ${novoValor}`);
	} catch (err) {
		console.error("❌ Erro ao salvar o settings.json:", err.message);
	}
}

module.exports = {
	getAmbienteAtual,
	setAmbiente,
};
