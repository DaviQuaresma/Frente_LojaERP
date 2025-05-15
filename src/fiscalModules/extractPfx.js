/** @format */

const fs = require("fs");
const forge = require("node-forge");

const CERT_PATH =
	process.env.NODE_ENV === "production"
		? "C:/certificados/arquivoA1.p12"
		: "./certs/arquivoA1.p12";

module.exports = function extractFromPfx(pfxBuffer, password) {
	const p12Der = forge.util.createBuffer(
		pfxBuffer.toString("binary"),
		"binary"
	);
	const p12Asn1 = forge.asn1.fromDer(p12Der);
	const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

	let keyObj, certObj;

	for (const safeContent of p12.safeContents) {
		for (const safeBag of safeContent.safeBags) {
			if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
				keyObj = forge.pki.privateKeyToPem(safeBag.key);
			} else if (safeBag.type === forge.pki.oids.certBag) {
				certObj = forge.pki.certificateToPem(safeBag.cert);
			}
		}
	}

	return { privateKeyPem: keyObj, certificatePem: certObj };
};

// Exemplo de uso em testes locais:
if (require.main === module) {
	const { privateKeyPem, certificatePem } = module.exports(
		undefined,
		"Fran!123"
	);

	console.log("🔐 PRIVATE KEY:\n", privateKeyPem);
	console.log("📜 CERTIFICATE:\n", certificatePem);
}
