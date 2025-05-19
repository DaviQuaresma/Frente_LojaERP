/** @format */

// scripts/postbuild.js
const fs = require("fs");
const path = require("path");

// Caminho para onde o arquivo NÃO deve estar embutido
const filePath = path.join(__dirname, "../src/config/db_settings.json");

if (fs.existsSync(filePath)) {
	fs.unlinkSync(filePath);
	console.log("🧹 db_settings.json removido da build.");
} else {
	console.log("ℹ️ Nenhum db_settings.json encontrado na build para remover.");
}
