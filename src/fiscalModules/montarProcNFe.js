/** @format */

const { DOMParser, XMLSerializer } = require("@xmldom/xmldom");

function montarProcNFe(xmlAssinado, qrCode, urlChave, protNFeXml) {
	// Remove header se existir
	const nfeSemHeader = xmlAssinado.replace(/<\?xml.*?\?>/, "").trim();

	// Cria DOM dos elementos
	const parser = new DOMParser();
	const nfeDoc = parser.parseFromString(nfeSemHeader, "text/xml");
	const protDoc = parser.parseFromString(protNFeXml, "text/xml");

	// Cria manualmente o elemento infNFeSupl
	const infNFeSupl = nfeDoc.createElement("infNFeSupl");
	const qrCodeTag = nfeDoc.createElement("qrCode");
	const urlChaveTag = nfeDoc.createElement("urlChave");

	qrCodeTag.appendChild(nfeDoc.createTextNode(qrCode));
	urlChaveTag.appendChild(nfeDoc.createTextNode(urlChave));
	infNFeSupl.appendChild(qrCodeTag);
	infNFeSupl.appendChild(urlChaveTag);

	// Cria a raiz <procNFe>
	const procNFeDoc = parser.parseFromString(
		`<procNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"></procNFe>`,
		"text/xml"
	);
	const procNFe = procNFeDoc.documentElement;

	// Importa os nós para o novo documento
	const nfeNode = procNFeDoc.importNode(nfeDoc.documentElement, true);
	const suplNode = procNFeDoc.importNode(infNFeSupl, true);
	const protNode = procNFeDoc.importNode(
		protDoc.getElementsByTagName("protNFe")[0],
		true
	);

	// Adiciona os elementos na ordem correta
	procNFe.appendChild(nfeNode);
	procNFe.appendChild(suplNode);
	procNFe.appendChild(protNode);

	// Serializa o XML final
	const xmlFinal = new XMLSerializer().serializeToString(procNFeDoc);
	return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlFinal}`;
}

module.exports = montarProcNFe;
