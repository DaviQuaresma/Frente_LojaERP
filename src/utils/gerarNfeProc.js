/** @format */

const { create } = require("xmlbuilder2");

module.exports = function gerarNfeProc(xmlAssinado, protNFeXmlStr, infNFeSuplStr = null) {
  try {
    const nfeProc = create({ version: "1.0", encoding: "UTF-8" }).ele("nfeProc", {
      xmlns: "http://www.portalfiscal.inf.br/nfe",
      versao: "4.00",
    });

    // Converte strings para elementos XML
    const nfe = create(xmlAssinado).root();
    const protNFe = create(protNFeXmlStr).root();

    nfeProc.import(nfe);
    if (infNFeSuplStr) {
      const infSupl = create(infNFeSuplStr).root();
      nfeProc.import(infSupl);
    }
    nfeProc.import(protNFe);

    return nfeProc.end({ prettyPrint: false });
  } catch (err) {
    throw new Error(`❌ Erro ao montar nfeProc: ${err.message}`);
  }
};
