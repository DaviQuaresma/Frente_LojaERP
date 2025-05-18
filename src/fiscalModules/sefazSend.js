/** @format */

const axios = require("axios");
const https = require("https");
const { getAmbienteAtual } = require("../config/envControl");
const ambiente = getAmbienteAtual();

const urlSefaz =
	ambiente === "production"
		? "https://nfce.sefaz.pb.gov.br/NFCEe4/services/NfeAutorizacao4"
		: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";

async function enviarXmlParaSefaz(xmlAssinado, certificadoPem, chavePrivada) {
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
