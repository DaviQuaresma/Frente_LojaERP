/** @format */

const fs = require("fs");
const forge = require("node-forge");

async function validarCertificado(caminho, senha) {
	try {
		const pfxBuffer = fs.readFileSync(caminho);
		const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
		forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, senha); // <- aqui explode com senha errada
		return { valido: true };
	} catch (err) {
		throw new Error("Senha inválida ou certificado corrompido.");
	}
}

module.exports = { validarCertificado };
