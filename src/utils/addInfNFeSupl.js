const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

function adicionarInfNFeSupl(xmlAssinado, qrCode, urlChave) {
  const doc = new DOMParser().parseFromString(xmlAssinado, 'application/xml');

  const nfeNode = doc.getElementsByTagName('NFe')[0];
  const signatureNode = doc.getElementsByTagName('Signature')[0];

  if (!nfeNode || !signatureNode) {
    throw new Error('❌ Erro ao localizar <NFe> ou <Signature> no XML assinado.');
  }

  const namespace = "http://www.portalfiscal.inf.br/nfe";

  const infNFeSupl = doc.createElementNS(namespace, 'infNFeSupl');

  const qrNode = doc.createElementNS(namespace, 'qrCode');
  qrNode.textContent = qrCode;

  const urlNode = doc.createElementNS(namespace, 'urlChave');
  urlNode.textContent = urlChave;

  infNFeSupl.appendChild(qrNode);
  infNFeSupl.appendChild(urlNode);

  // Inserir o infNFeSupl ANTES da tag <Signature>
  nfeNode.insertBefore(infNFeSupl, signatureNode);

  return new XMLSerializer().serializeToString(doc);
}


module.exports = adicionarInfNFeSupl