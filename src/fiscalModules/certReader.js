/** @format */

const forge = require("node-forge");

/**
 * Lê o conteúdo do certificado PFX armazenado em buffer e retorna chaves PEM
 */
module.exports = function parsePfxBuffer(pfxBuffer, password) {
	const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
	const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

	const keyObj = p12.getBags({ bagType: forge.pki.oids.keyBag })[
		forge.pki.oids.keyBag
	][0];
	const certObj = p12.getBags({ bagType: forge.pki.oids.certBag })[
		forge.pki.oids.certBag
	][0];

	const privateKeyPem = forge.pki.privateKeyToPem(keyObj.key);
	const certificatePem = forge.pki.certificateToPem(certObj.cert);

	return { privateKeyPem, certificatePem };
}
