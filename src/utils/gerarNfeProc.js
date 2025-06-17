module.exports = function gerarNfeProc(xmlAssinado, protNFeXmlStr) {
  const matchNFe = xmlAssinado.match(/<NFe[\s\S]*?<\/NFe>/);
  const matchProt = protNFeXmlStr.match(/<protNFe[\s\S]*<\/protNFe>/);

  if (!matchNFe || !matchProt) {
    throw new Error("❌ Não foi possível extrair a NFe ou o protNFe para compor o nfeProc.");
  }

  const nfeXml = matchNFe[0].trim();
  const protXml = matchProt[0].trim();

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${nfeXml}
  ${protXml}
</nfeProc>`.trim();
};
