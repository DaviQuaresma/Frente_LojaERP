/** @format */

const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");
const crypto = require("crypto");

function assinarXml(xmlString, privateKeyPem, certificatePem, chave) {
	const doc = new DOMParser().parseFromString(xmlString, "text/xml");

	// 1. Localiza o nó infNFe
	const infNFeNode = doc.getElementsByTagName("infNFe")[0];

	// 2. Canonicaliza infNFe
	const canonicalXml = new XMLSerializer().serializeToString(infNFeNode).trim();
	const canonicalBuffer = Buffer.from(canonicalXml, "utf-8");
	const hash = crypto
		.createHash("sha1")
		.update(canonicalBuffer)
		.digest("base64");

	// 3. Limpa o certificado
	const certificadoLimpo = certificatePem
		.replace(/-----BEGIN CERTIFICATE-----/g, "")
		.replace(/-----END CERTIFICATE-----/g, "")
		.replace(/(\r\n|\n|\r|\s+)/g, "")
		.trim();

	// 4. Monta a estrutura XML da assinatura
	const signatureXml = `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
  <SignedInfo>
    <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
    <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
    <Reference URI="#NFe${chave}">
      <Transforms>
        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      </Transforms>
      <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
      <DigestValue>${hash}</DigestValue>
    </Reference>
  </SignedInfo>
  <SignatureValue></SignatureValue>
  <KeyInfo>
    <X509Data>
      <X509Certificate>${certificadoLimpo}</X509Certificate>
    </X509Data>
  </KeyInfo>
</Signature>`.trim();

	// 5. Assina o SignedInfo
	const signedDoc = new DOMParser().parseFromString(signatureXml, "text/xml");
	const signedInfoNode = signedDoc.getElementsByTagName("SignedInfo")[0];
	const signedInfoXml = new XMLSerializer()
		.serializeToString(signedInfoNode)
		.trim();

	const signer = crypto.createSign("RSA-SHA1");
	signer.update(signedInfoXml);
	const signatureValue = signer.sign(privateKeyPem, "base64");

	signedDoc.getElementsByTagName("SignatureValue")[0].textContent =
		signatureValue;

	// 6. Insere a <Signature> após <infNFe>
	const finalSignatureNode = doc.importNode(signedDoc.documentElement, true);
	doc.documentElement.insertBefore(finalSignatureNode, infNFeNode.nextSibling);

	// 7. Retorna o XML assinado final, sem espaços extras
	return new XMLSerializer().serializeToString(doc).trim();
}

module.exports = assinarXml;
