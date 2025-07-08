/** @format */

const fs = require("fs");
const path = require("path");
const os = require("os");

// 🛡 Caminho persistente fora do .asar
const appDataDir = path.join(
	os.homedir(),
	"AppData",
	"Roaming",
	"frentelojaerp",
	"config"
);

const settingsPath = path.join(appDataDir, "db_settings.json");

// 🛠 Cria pasta e arquivo base se necessário
function garantirArquivoConfig() {
	if (!fs.existsSync(appDataDir)) {
		fs.mkdirSync(appDataDir, { recursive: true });
	}
	if (!fs.existsSync(settingsPath)) {
		const estruturaInicial = {
			salvos: {},
			ativo: null,
		};
		fs.writeFileSync(settingsPath, JSON.stringify(estruturaInicial, null, 2));
		console.log("📁 db_settings.json criado no caminho:", settingsPath);
	}
}

// 🔍 Lê config completa do arquivo
function getDatabaseConfig() {
	garantirArquivoConfig(); // garante existência
	const content = fs.readFileSync(settingsPath, "utf-8");
	return JSON.parse(content);
}

// 💾 Atualiza config com novos dados
function setDatabaseConfig(novaCfg) {
	garantirArquivoConfig();
	const atual = getDatabaseConfig();

	if (novaCfg.salvos) atual.salvos = novaCfg.salvos;
	if (novaCfg.ativo) atual.ativo = novaCfg.ativo;

	fs.writeFileSync(settingsPath, JSON.stringify(atual, null, 2));
}

module.exports = {
	getDatabaseConfig,
	setDatabaseConfig,
};
