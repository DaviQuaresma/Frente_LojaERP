/** @format */

const fs = require("fs");
const https = require("https");
const axios = require("axios");
const extractFromPfx = require("./extractPfx");

const pfxBuffer = fs.readFileSync("./certs/arquivoA1.p12");
const senha = "Fran!123";
const xml = fs.readFileSync("xml-assinado.xml", "utf-8");

const { privateKeyPem, certificatePem } = extractFromPfx(pfxBuffer, senha);

const agent = new https.Agent({
	key: privateKeyPem,
	cert: certificatePem,
	rejectUnauthorized: false,
});

const envelope = `
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:nfe="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">
  <soap12:Header/>
  <soap12:Body>
    <nfe:nfeDadosMsg>
      ${xml.replace(/<\?xml.*?\?>/, "").trim()}
    </nfe:nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>
`;

(async () => {
	try {
		const { data } = await axios.post(
			"https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
			envelope,
			{
				httpsAgent: agent,
				headers: {
					"Content-Type": "application/soap+xml; charset=utf-8",
				},
			}
		);

		fs.writeFileSync("resposta_teste_envio.xml", data);
		console.log("📨 Enviado com sucesso. Resposta salva.");
	} catch (err) {
		console.error("❌ Falha no envio:", err.message);
	}
})();
