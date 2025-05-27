/** @format */

const axios = require("axios");
const https = require("https");
const dns = require("dns");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("../utils/sefazHelper");

async function enviarXmlParaSefaz(xmlAssinado, certificadoPem, chavePrivada, ufEmpresa) {
	const ambiente = getAmbienteAtual();
	const sefaz = getSefazInfo(ufEmpresa, ambiente);
	const urlSefaz = sefaz.envio;
	const host = new URL(urlSefaz).hostname;

	const logFilePath = path.join(os.homedir(), "Desktop", "log.txt");
	fs.appendFileSync(logFilePath, `\n\nVerificando DNS de: ${host}\n`, "utf-8");

	try {
		await new Promise((resolve, reject) => {
			dns.lookup(host, (err, address) => {
				if (err) {
					fs.appendFileSync(logFilePath, `❌ Erro DNS: ${err.message}\n`, "utf-8");
					return reject(new Error(`DNS não resolvido: ${err.message}`));
				}
				fs.appendFileSync(logFilePath, `✅ DNS OK: ${address}\n`, "utf-8");
				resolve();
			});
		});
	} catch (err) {
		throw err;
	}

	console.log(`🔗 Enviando para SEFAZ na URL: ${urlSefaz}`);
	fs.appendFileSync(logFilePath, `🔗 Enviando para SEFAZ na URL: ${urlSefaz}\n`, "utf-8");

	const agent = new https.Agent({
		cert: certificadoPem,
		key: chavePrivada,
		rejectUnauthorized: false,
		minVersion: 'TLSv1.2',
	});

	const xmlLimpo = xmlAssinado
		.replace(/^\uFEFF/, "") // Remove BOM
		.replace(/<\?xml[^>]*\?>/, "") // Remove cabeçalho XML
		.replace(/[\r\n\t]/g, "") // Remove quebras de linha e tabulações
		.replace(/>\s+</g, "><") // Remove espaços entre tags
		.trim();

	const idLote = String(Date.now()).padStart(15, "0"); // Ex: 000017171234567

	const enviNFeXml =
		`<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
		`<idLote>${idLote}</idLote>` +
		`<indSinc>1</indSinc>` +
		xmlLimpo +
		`</enviNFe>`;


	const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
		<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
			<soap12:Body>
				<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
					${enviNFeXml}
				</nfeDadosMsg>
			</soap12:Body>
		</soap12:Envelope>`.trim();

	const response = await axios.post(urlSefaz, soapEnvelope, {
		httpsAgent: agent,
		headers: {
			"Content-Type": "application/soap+xml; charset=utf-8",
		},
	});

	return response.data;
}

module.exports = enviarXmlParaSefaz;
