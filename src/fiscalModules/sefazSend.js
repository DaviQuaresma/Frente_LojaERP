/** @format */

import axios from "axios";
import https from "https";

async function enviarXmlParaSefaz(
	xmlAssinado,
	certificadoPem,
	chavePrivada
) {
	const agent = new https.Agent({
		cert: certificadoPem,
		key: chavePrivada,
		rejectUnauthorized: false,
	});

	const soapEnvelope = `
    <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
      <soap:Header/>
      <soap:Body>
        <nfe:nfeDadosMsg>
          ${xmlAssinado}
        </nfe:nfeDadosMsg>
      </soap:Body>
    </soap:Envelope>`;

	const { data } = await axios.post(
		"https://nfce.sefaz.pb.gov.br/NFCEe4/services/NfeAutorizacao4?wsdl",
		soapEnvelope,
		{
			httpsAgent: agent,
			headers: { "Content-Type": "application/soap+xml; charset=utf-8" },
		}
	);

	return data;
}
