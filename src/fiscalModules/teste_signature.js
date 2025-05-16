const fs = require("fs");
const extractFromPfx = require("./extractPfx");
const assinarXml = require("./xmlSignature");

const xml = fs.readFileSync("xml-assinado.xml", "utf-8"); // pode ser o gerado mesmo
const pfx = fs.readFileSync("./certs/arquivoA1.p12");
const senha = "Fran!123";

const { privateKeyPem, certificatePem } = extractFromPfx(pfx, senha);

try {
	const assinado = assinarXml(xml, privateKeyPem, certificatePem, "CHAVEFICTICIA");

	fs.writeFileSync("teste-assinado.xml", assinado);
	console.log("✅ XML assinado e salvo como teste-assinado.xml");
} catch (err) {
	console.error("❌ Erro na assinatura:", err.message);
}
