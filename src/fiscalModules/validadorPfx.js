/** @format */

const https = require("https");
const fs = require("fs");

const pfxPath =
	process.env.NODE_ENV === "production"
		? "C:/certificados/arquivoA1.p12"
		: "./certs/arquivoA1.p12";

const senha = "Fran!123";

try {
	const pfxBuffer = fs.readFileSync(pfxPath);

	if (!pfxBuffer || !Buffer.isBuffer(pfxBuffer)) {
		throw new Error("❌ Arquivo .p12 não carregado corretamente.");
	}

	console.log("📦 PFX lido com sucesso, testando criação do contexto TLS...");

	const agent = new https.Agent({
		pfx: pfxBuffer,
		passphrase: senha,
		rejectUnauthorized: false,
	});

	console.log("✅ Certificado é compatível com Node.js (https.Agent)");
} catch (err) {
	console.error("❌ Falha ao carregar certificado .p12 para uso em HTTPS:");
	console.error(err.message || err);
}
