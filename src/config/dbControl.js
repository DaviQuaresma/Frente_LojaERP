/** @format */

const fs = require("fs");
const path = require("path");
const os = require("os");

const appDataDir = path.join(
	os.homedir(),
	"AppData",
	"Roaming",
	"frentelojaerp",
	"config"
);

const settingsPath = path.join(appDataDir, "db_settings.json");

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
		console.log("db_settings.json criado no caminho:", settingsPath);
	}
}

function getDatabaseConfig() {
	garantirArquivoConfig(); 
	const content = fs.readFileSync(settingsPath, "utf-8");
	return JSON.parse(content);
}

function setDatabaseConfig(novaCfg) {
	garantirArquivoConfig();
	const atual = getDatabaseConfig();

	if (novaCfg.salvos) {
		atual.salvos = {
			...atual.salvos,
			...novaCfg.salvos,
		};
	}

	if (novaCfg.ativo) {
		atual.ativo = novaCfg.ativo;
	}

	fs.writeFileSync(settingsPath, JSON.stringify(atual, null, 2));
}

module.exports = {
	getDatabaseConfig,
	setDatabaseConfig,
};
