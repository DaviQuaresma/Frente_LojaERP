/** @format */

const axios = require("axios");
const https = require("https");
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("../utils/sefazHelper");

async function enviarXmlParaSefaz(xmlAssinado, certificadoPem, chavePrivada, ufEmpresa) {
	const ambiente = getAmbienteAtual();
	const sefaz = getSefazInfo(ufEmpresa, ambiente);
	const urlSefaz = sefaz.envio;

	console.log(`🔗 Enviando para SEFAZ na URL: ${urlSefaz}`);

	const agent = new https.Agent({
		cert: certificadoPem,
		key: chavePrivada,
		rejectUnauthorized: false,
	});

	// Remove o cabeçalho XML (<?xml ... ?>) e espaços extras
	const xmlLimpo = xmlAssinado.replace(/<\?xml.*?\?>/, "").trim();

	// Monta o enviNFe
	const enviNFeXml = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>000000000000001</idLote><indSinc>1</indSinc>${xmlLimpo}</enviNFe>`;

	// Monta o envelope SOAP completo
	const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
		<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
			<soap12:Body>
				<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
					${enviNFeXml}
				</nfeDadosMsg>
			</soap12:Body>
		</soap12:Envelope>`.trim();

	// Envia para a SEFAZ
	const response = await axios.post(urlSefaz, soapEnvelope, {
		httpsAgent: agent,
		headers: {
			"Content-Type": "application/soap+xml; charset=utf-8",
		},
	});

	return response.data;
}

module.exports = enviarXmlParaSefaz;
