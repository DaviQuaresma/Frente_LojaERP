/** @format */

const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const crypto = require("crypto");

function assinarXml(xmlString, privateKeyPem, certificatePem, chave) {
	const doc = new DOMParser().parseFromString(xmlString, "text/xml");

	const infNFeNode = doc.getElementsByTagName("infNFe")[0];

	// 1. Canonicaliza infNFe
	const canonicalXml = new XMLSerializer().serializeToString(infNFeNode);

	const canonicalBuffer = Buffer.from(canonicalXml, "utf-8");
	const hash = crypto
		.createHash("sha1")
		.update(canonicalBuffer)
		.digest("base64");

	// 2. Cria o XML da Signature
	const signatureXml = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <Reference URI="#NFe${chave}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
      <DigestValue>${hash}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue></SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${certificatePem
				.replace("-----BEGIN CERTIFICATE-----", "")
				.replace("-----END CERTIFICATE-----", "")
				.replace(/\n/g, "")}</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>`.trim();

	// 3. Assina o SignedInfo
	const signedDoc = new DOMParser().parseFromString(signatureXml, "text/xml");
	const signedInfoNode = signedDoc.getElementsByTagName("SignedInfo")[0];
	const signedInfoXml = new XMLSerializer().serializeToString(signedInfoNode);

	const signature = crypto.createSign("RSA-SHA1");
	signature.update(signedInfoXml);
	const signatureValue = signature.sign(privateKeyPem, "base64");

	// 4. Coloca o valor na SignatureValue
	signedDoc.getElementsByTagName("SignatureValue")[0].textContent =
		signatureValue;

	// 5. Importa a <Signature> final no XML original
	const finalSignatureNode = doc.importNode(signedDoc.documentElement, true);
	doc.documentElement.appendChild(finalSignatureNode);

	// 6. Retorna XML final
	return new XMLSerializer().serializeToString(doc);
}

module.exports = assinarXml;
