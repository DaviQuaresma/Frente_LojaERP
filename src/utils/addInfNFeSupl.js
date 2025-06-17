const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

function adicionarInfNFeSupl(xmlAssinado, qrCode, urlChave) {
  const doc = new DOMParser().parseFromString(xmlAssinado, 'application/xml');

  const nfeNode = doc.getElementsByTagName('NFe')[0];
  const signatureNode = doc.getElementsByTagName('Signature')[0];

  if (!nfeNode || !signatureNode) {
    throw new Error('❌ Erro ao localizar <NFe> ou <Signature> no XML assinado.');
  }

  const infNFeSupl = doc.createElement('infNFeSupl');

  const qrNode = doc.createElement('qrCode');
  qrNode.textContent = qrCode;

  const urlNode = doc.createElement('urlChave');
  urlNode.textContent = urlChave;

  infNFeSupl.appendChild(qrNode);
  infNFeSupl.appendChild(urlNode);

  // Inserir infNFeSupl após a tag <Signature>
  if (signatureNode.nextSibling) {
    nfeNode.insertBefore(infNFeSupl, signatureNode.nextSibling);
  } else {
    nfeNode.appendChild(infNFeSupl);
  }

  return new XMLSerializer().serializeToString(doc);
}

module.exports = adicionarInfNFeSupl;
