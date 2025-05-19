/** @format */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

const settingsPath = path.join(app.getPath("userData"), "db_settings.json");

// Se não existir, cria o arquivo base
if (!fs.existsSync(settingsPath)) {
	fs.writeFileSync(
		settingsPath,
		JSON.stringify({ salvos: {}, ativo: null }, null, 2)
	);
	console.log("📁 Arquivo db_settings.json criado em:", settingsPath);
}

// Lê a config completa do arquivo
function getDatabaseConfig() {
	const content = fs.readFileSync(settingsPath, "utf-8");
	return JSON.parse(content);
}

// Atualiza a config com novos dados (sobrescreve tudo)
function setDatabaseConfig(novaCfg) {
	const settings = fs.existsSync(settingsPath)
		? JSON.parse(fs.readFileSync(settingsPath, "utf-8"))
		: { salvos: {}, ativo: null };

	if (novaCfg.salvos) {
		settings.salvos = novaCfg.salvos;
	}
	if (novaCfg.ativo) {
		settings.ativo = novaCfg.ativo;
	}

	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
	console.log("✅ Configuração de banco salva:", settings);
}

module.exports = {
	getDatabaseConfig,
	setDatabaseConfig,
};
