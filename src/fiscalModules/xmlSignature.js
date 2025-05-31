/** @format */

const { DOMParser } = require("@xmldom/xmldom");
const { SignedXml } = require("xml-crypto");

function assinarXml(xmlString, privateKeyPem, certificatePem) {
	if (!xmlString.includes("<infNFe")) {
		throw new Error("XML informado não contém a tag <infNFe>. Não é possível assinar.");
	}

	const doc = new DOMParser().parseFromString(xmlString, "text/xml");
	const sig = new SignedXml();

	sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
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
		getKeyInfo: () => {
			const certClean = certificatePem
				.replace(/-----BEGIN CERTIFICATE-----/g, "")
				.replace(/-----END CERTIFICATE-----/g, "")
				.replace(/[\r\n\s]/g, "")
				.trim();

			return `<X509Data><X509Certificate>${certClean}</X509Certificate></X509Data>`;
		},
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
