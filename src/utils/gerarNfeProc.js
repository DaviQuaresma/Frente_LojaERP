module.exports = function gerarNfeProc(xmlAssinado, protNFeXmlStr, infNFeSuplStr = "") {
  let matchNFe = xmlAssinado.match(/<NFe[\s\S]*<\/NFe>/);
  const matchProt = protNFeXmlStr.match(/<protNFe[\s\S]*<\/protNFe>/);
  const matchSupl = infNFeSuplStr?.match(/<infNFeSupl[\s\S]*<\/infNFeSupl>/);

  if (!matchNFe || !matchProt) {
    throw new Error("❌ Não foi possível extrair a NFe ou o protNFe para compor o nfeProc.");
  }

  let nfeXml = matchNFe[0].trim();
  const protXml = matchProt[0].trim();
  const suplXml = matchSupl?.[0]?.trim() || "";

  if (suplXml) {
    nfeXml = nfeXml.replace(/(<Signature[\s\S]*?<\/Signature>)/, `${suplXml}$1`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  ${nfeXml}
  ${protXml}
</nfeProc>`.trim();
};
