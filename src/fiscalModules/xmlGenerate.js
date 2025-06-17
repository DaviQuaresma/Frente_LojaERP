/** @format */

const { create } = require("xmlbuilder2");

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

	ide.ele("procEmi").txt(dados.ide.procEmi).up().ele("verProc").txt(dados.ide.verProc).up();

	if (dados.ide.tpEmis === "9") {
		ide.ele("dhCont").txt(dados.ide.dhCont).up().ele("xJust").txt(dados.ide.xJust).up();
	}

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
		.ele("xPais").txt(dados.emit.enderEmit.xPais).up();

	emit.ele("IE").txt(dados.emit.IE).up().ele("CRT").txt(dados.emit.CRT).up();

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
	imposto.ele("vTotTrib").txt(dados.prod.vTotTrib || "0.00").up();


	const icmsData = dados.imposto?.ICMS || { orig: "0", CST: "00", modBC: "3", vBC: "0.00", pICMS: "0.00", vICMS: "0.00", CSOSN: "102" };
	const pisData = dados.imposto?.PIS || { CST: "01", vBC: "0.00", pPIS: "0.00", vPIS: "0.00" };
	const cofinsData = dados.imposto?.COFINS || { CST: "01", vBC: "0.00", pCOFINS: "0.00", vCOFINS: "0.00" };

	const icms = imposto.ele("ICMS");
	if (dados.emit.CRT === "1") {
		const icmsSn = icms.ele("ICMSSN102");
		icmsSn.ele("orig").txt(icmsData.orig).up();
		icmsSn.ele("CSOSN").txt(icmsData.CSOSN).up();
	} else {
		const icms00 = icms.ele("ICMS00");
		icms00
			.ele("orig").txt(icmsData.orig).up()
			.ele("CST").txt(icmsData.CST).up()
			.ele("modBC").txt(icmsData.modBC).up()
			.ele("vBC").txt(icmsData.vBC).up()
			.ele("pICMS").txt(icmsData.pICMS).up()
			.ele("vICMS").txt(icmsData.vICMS).up();
	}

	const pis = imposto.ele("PIS");
	if (pisData.CST === "99") {
		const pisOutr = pis.ele("PISOutr");
		pisOutr
			.ele("CST").txt(pisData.CST).up()
			.ele("vBC").txt(pisData.vBC).up()
			.ele("pPIS").txt(pisData.pPIS).up()
			.ele("vPIS").txt(pisData.vPIS).up();
	} else {
		const pisAliq = pis.ele("PISAliq");
		pisAliq
			.ele("CST").txt(pisData.CST).up()
			.ele("vBC").txt(pisData.vBC).up()
			.ele("pPIS").txt(pisData.pPIS).up()
			.ele("vPIS").txt(pisData.vPIS).up();
	}

	const cofins = imposto.ele("COFINS");
	if (cofinsData.CST === "99") {
		const cofOutr = cofins.ele("COFINSOutr");
		cofOutr
			.ele("CST").txt(cofinsData.CST).up()
			.ele("vBC").txt(cofinsData.vBC).up()
			.ele("pCOFINS").txt(cofinsData.pCOFINS).up()
			.ele("vCOFINS").txt(cofinsData.vCOFINS).up();
	} else {
		const cofAliq = cofins.ele("COFINSAliq");
		cofAliq
			.ele("CST").txt(cofinsData.CST).up()
			.ele("vBC").txt(cofinsData.vBC).up()
			.ele("pCOFINS").txt(cofinsData.pCOFINS).up()
			.ele("vCOFINS").txt(cofinsData.vCOFINS).up();
	}

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

	const transp = infNFe.ele("transp");
	transp.ele("modFrete").txt(dados.transp.modFrete).up();

	const pag = infNFe.ele("pag");
	const detPag = pag.ele("detPag");
	detPag.ele("tPag").txt(dados.pag.tPag);
	detPag.ele("vPag").txt(dados.pag.vPag);

	if (dados.infAdic?.infCpl?.trim()) {
		const infAdic = infNFe.ele("infAdic");
		infAdic.ele("infCpl").txt(dados.infAdic.infCpl.trim());
	}

	const respTec = infNFe.ele("infRespTec");
	respTec
		.ele("CNPJ").txt(dados.infRespTec.CNPJ).up()
		.ele("xContato").txt(dados.infRespTec.xContato).up()
		.ele("email").txt(dados.infRespTec.email).up();

	const foneLimpo = (dados.infRespTec.fone || "").replace(/\D/g, "");
	if (foneLimpo.length >= 10) {
		respTec.ele("fone").txt(foneLimpo);
	}

	return doc.end({ headless: false, prettyPrint: false });
};
