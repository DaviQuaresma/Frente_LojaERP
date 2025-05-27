/** @format */

const forge = require("node-forge");

module.exports = function extractFromPfx(pfxBuffer, senha) {
	const p12Der = forge.util.createBuffer(
		pfxBuffer.toString("binary"),
		"binary"
	);
	const p12Asn1 = forge.asn1.fromDer(p12Der);
	const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

	let privateKey = null;
	let certificate = null;

	// Primeiro, capturamos a chave privada real
	for (const safeContent of p12.safeContents) {
		for (const safeBag of safeContent.safeBags) {
			if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag && safeBag.key) {
				privateKey = safeBag.key;
			}
		}
	}

	if (!privateKey) throw new Error("❌ Chave privada não encontrada no .p12");

	// Agora buscamos o certificado correspondente à chave
	for (const safeContent of p12.safeContents) {
		for (const safeBag of safeContent.safeBags) {
			if (
				safeBag.type === forge.pki.oids.certBag &&
				safeBag.cert.publicKey &&
				safeBag.cert.publicKey.n &&
				privateKey.n &&
				safeBag.cert.publicKey.n.equals(privateKey.n)
			) {
				certificate = safeBag.cert;
			}
		}
	}

	if (!certificate)
		throw new Error("❌ Certificado correspondente à chave não encontrado");

	const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
	const certificatePem = forge.pki.certificateToPem(certificate);
	const subject = certificate.subject.attributes;

	// Busca todos os CNPJs válidos nos atributos do certificado
	const allCnpjs = subject
		.map(attr => attr.value?.match(/\d{14}/))
		.filter(Boolean)
		.map(match => match[0]);

	// Seleciona o último, que geralmente é o do titular do certificado
	const cnpj = allCnpjs.length > 0 ? allCnpjs[allCnpjs.length - 1] : null;

	return { privateKeyPem, certificatePem, subject, cnpj };
};
