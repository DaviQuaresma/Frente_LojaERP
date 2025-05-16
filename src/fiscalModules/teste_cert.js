/** @format */

const fs = require("fs");
const forge = require("node-forge");

const pfxBuffer = fs.readFileSync("./certs/arquivoA1.p12");
const senha = "Fran!123";

const p12Der = forge.util.createBuffer(pfxBuffer.toString("binary"), "binary");
const p12Asn1 = forge.asn1.fromDer(p12Der);
const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

for (const safeContent of p12.safeContents) {
	for (const safeBag of safeContent.safeBags) {
		if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
			console.log("🔐 Encontrada chave privada!");
		} else if (safeBag.type === forge.pki.oids.certBag) {
			console.log("📜 Encontrado certificado!");
			console.log("→ Subject:", safeBag.cert.subject.attributes);
			console.log("→ Emitido por:", safeBag.cert.issuer.attributes);
		} else {
			console.log("❓ Tipo desconhecido:", safeBag.type);
		}
	}
}
