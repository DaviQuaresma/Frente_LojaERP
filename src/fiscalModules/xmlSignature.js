/** @format */

const { DOMParser } = require("@xmldom/xmldom");
const { SignedXml } = require("xml-crypto");

function assinarXml(xmlString, privateKeyPem, certificatePem, chave) {
	const doc = new DOMParser().parseFromString(xmlString, "text/xml");

	const sig = new SignedXml();

	// Corrige o algoritmo de canonicalização
	sig.canonicalizationAlgorithm =
		"http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
	sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

	sig.addReference(
		"//*[local-name(.)='infNFe']",
		[
			"http://www.w3.org/2000/09/xmldsig#enveloped-signature",
			"http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
		],
		"http://www.w3.org/2000/09/xmldsig#sha1"
	);

	sig.signingKey = privateKeyPem;

	sig.keyInfoProvider = {
		getKeyInfo: () =>
			`<X509Data><X509Certificate>${certificatePem
				.replace(/-----BEGIN CERTIFICATE-----/g, "")
				.replace(/-----END CERTIFICATE-----/g, "")
				.replace(/\r?\n|\r|\s+/g, "")
				.trim()}</X509Certificate></X509Data>`,
	};

	sig.computeSignature(xmlString, {
		location: {
			reference: "//*[local-name(.)='infNFe']",
			action: "after",
		},
	});

	return sig.getSignedXml().trim();
}

module.exports = assinarXml;
