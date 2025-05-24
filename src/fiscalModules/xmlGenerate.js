/** @format */

const { create } = require("xmlbuilder2");
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("../utils/sefazHelper");

module.exports = function gerarXmlNfe(dados) {
	const doc = create({ version: "1.0", encoding: "UTF-8" }).ele("NFe", {
		xmlns: "http://www.portalfiscal.inf.br/nfe",
	});

	const infNFe = doc.ele("infNFe", { versao: "4.00", Id: `NFe${dados.chave}` });

	const ide = infNFe.ele("ide");
	ide
		.ele("cUF").txt(dados.ide.cUF).up()
		.ele("cNF").txt(dados.ide.cNF).up()
		.ele("natOp").txt(dados.ide.natOp).up()
		.ele("mod").txt(dados.ide.mod).up()
		.ele("serie").txt(dados.ide.serie).up()
		.ele("nNF").txt(dados.ide.nNF).up()
		.ele("dhEmi").txt(dados.ide.dhEmi).up()
		.ele("tpNF").txt(dados.ide.tpNF).up()
		.ele("idDest").txt(dados.ide.idDest).up()
		.ele("cMunFG").txt(dados.ide.cMunFG).up()
		.ele("tpImp").txt(dados.ide.tpImp).up()
		.ele("tpEmis").txt(dados.ide.tpEmis).up()
		.ele("cDV").txt(dados.ide.cDV).up()
		.ele("tpAmb").txt(dados.ide.tpAmb).up()
		.ele("finNFe").txt(dados.ide.finNFe).up()
		.ele("indFinal").txt(dados.ide.indFinal).up()
		.ele("indPres").txt(dados.ide.indPres).up();

	if (dados.ide.indIntermed) {
		ide.ele("indIntermed").txt(dados.ide.indIntermed).up();
	}

	ide
		.ele("procEmi").txt(dados.ide.procEmi).up()
		.ele("verProc").txt(dados.ide.verProc).up();

	if (dados.ide.tpEmis === "9") {
		ide
			.ele("dhCont")
			.txt(dados.ide.dhCont)
			.up()
			.ele("xJust")
			.txt(dados.ide.xJust)
			.up();
	}

	// emitente
	const emit = infNFe.ele("emit");
	emit
		.ele("CNPJ").txt(dados.emit.CNPJ).up()
		.ele("xNome").txt(dados.emit.xNome).up()
		.ele("xFant").txt(dados.emit.xFant).up();

	const enderEmit = emit.ele("enderEmit");
	enderEmit
		.ele("xLgr").txt(dados.emit.enderEmit.xLgr).up()
		.ele("nro").txt(dados.emit.enderEmit.nro).up()
		.ele("xBairro").txt(dados.emit.enderEmit.xBairro).up()
		.ele("cMun").txt(dados.emit.enderEmit.cMun).up()
		.ele("xMun").txt(dados.emit.enderEmit.xMun).up()
		.ele("UF").txt(dados.emit.enderEmit.UF).up()
		.ele("CEP").txt(dados.emit.enderEmit.CEP).up()
		.ele("cPais").txt(dados.emit.enderEmit.cPais).up()
		.ele("xPais").txt(dados.emit.enderEmit.xPais).up()
		.ele("fone").txt(dados.emit.enderEmit.fone).up();

	emit.ele("IE").txt(dados.emit.IE).up().ele("CRT").txt(dados.emit.CRT).up();

	// det (detalhes dos produtos)
	const det = infNFe.ele("det", { nItem: "1" });

	const prod = det.ele("prod");
	prod
		.ele("cProd").txt(dados.prod.cProd).up()
		.ele("cEAN").txt(dados.prod.cEAN).up()
		.ele("xProd").txt(dados.prod.xProd).up()
		.ele("NCM").txt(dados.prod.NCM).up()
		.ele("CFOP").txt(dados.prod.CFOP).up()
		.ele("uCom").txt(dados.prod.uCom).up()
		.ele("qCom").txt(dados.prod.qCom).up()
		.ele("vUnCom").txt(dados.prod.vUnCom).up()
		.ele("vProd").txt(dados.prod.vProd).up()
		.ele("cEANTrib").txt(dados.prod.cEANTrib).up()
		.ele("uTrib").txt(dados.prod.uTrib).up()
		.ele("qTrib").txt(dados.prod.qTrib).up()
		.ele("vUnTrib").txt(dados.prod.vUnTrib).up()
		.ele("indTot").txt(dados.prod.indTot).up();

	const imposto = det.ele("imposto");
	imposto.ele("vTotTrib").txt(dados.imposto.vTotTrib).up();

	const icms = imposto.ele("ICMS").ele("ICMS00");
	icms
		.ele("orig").txt(dados.imposto.ICMS.orig).up()
		.ele("CST").txt(dados.imposto.ICMS.CST).up()
		.ele("modBC").txt(dados.imposto.ICMS.modBC).up()
		.ele("vBC").txt(dados.imposto.ICMS.vBC).up()
		.ele("pICMS").txt(dados.imposto.ICMS.pICMS).up()
		.ele("vICMS").txt(dados.imposto.ICMS.vICMS).up();

	const pis = imposto.ele("PIS").ele("PISAliq");
	pis
		.ele("CST").txt(dados.imposto.PIS.CST).up()
		.ele("vBC").txt(dados.imposto.PIS.vBC).up()
		.ele("pPIS").txt(dados.imposto.PIS.pPIS).up()
		.ele("vPIS").txt(dados.imposto.PIS.vPIS).up();

	const cofins = imposto.ele("COFINS").ele("COFINSAliq");
	cofins
		.ele("CST").txt(dados.imposto.COFINS.CST).up()
		.ele("vBC").txt(dados.imposto.COFINS.vBC).up()
		.ele("pCOFINS").txt(dados.imposto.COFINS.pCOFINS).up()
		.ele("vCOFINS").txt(dados.imposto.COFINS.vCOFINS).up();

	// total
	const total = infNFe.ele("total").ele("ICMSTot");

	total
		.ele("vBC").txt(dados.total.vBC).up()
		.ele("vICMS").txt(dados.total.vICMS).up()
		.ele("vICMSDeson").txt(dados.total.vICMSDeson).up()
		.ele("vFCP").txt(dados.total.vFCP).up()
		.ele("vBCST").txt(dados.total.vBCST).up()
		.ele("vST").txt(dados.total.vST).up()
		.ele("vFCPST").txt(dados.total.vFCPST).up()
		.ele("vFCPSTRet").txt(dados.total.vFCPSTRet).up()
		.ele("vProd").txt(dados.total.vProd).up()
		.ele("vFrete").txt(dados.total.vFrete).up()
		.ele("vSeg").txt(dados.total.vSeg).up()
		.ele("vDesc").txt(dados.total.vDesc).up()
		.ele("vII").txt(dados.total.vII).up()
		.ele("vIPI").txt(dados.total.vIPI).up()
		.ele("vIPIDevol").txt(dados.total.vIPIDevol).up()
		.ele("vPIS").txt(dados.total.vPIS).up()
		.ele("vCOFINS").txt(dados.total.vCOFINS).up()
		.ele("vOutro").txt(dados.total.vOutro).up()
		.ele("vNF").txt(dados.total.vNF).up()
		.ele("vTotTrib").txt(dados.total.vTotTrib).up();

	// transp
	const transp = infNFe.ele("transp");
	transp.ele("modFrete").txt(dados.transp.modFrete).up();

	// pag
	const pag = infNFe.ele("pag");
	const detPag = pag.ele("detPag");
	detPag.ele("tPag").txt(dados.pag.tPag);
	detPag.ele("vPag").txt(dados.pag.vPag);

	// infAdic
	const infAdic = infNFe.ele("infAdic");
	infAdic.ele("infCpl").txt(dados.infAdic.infCpl);

	// infRespTec
	const respTec = infNFe.ele("infRespTec");
	respTec
		.ele("CNPJ").txt(dados.infRespTec.CNPJ).up()
		.ele("xContato").txt(dados.infRespTec.xContato).up()
		.ele("email").txt(dados.infRespTec.email).up()
		.ele("fone").txt(dados.infRespTec.fone).up();

	return doc.doc().end({ headless: false, prettyPrint: false });
};
