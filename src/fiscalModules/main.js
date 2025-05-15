/** @format */

const fs = require("fs");
const extractFromPfx = require("./extractPfx");
const generateXml = require("./xmlGenerate");
const assinarXml = require("./xmlSignature");

(async () => {
	const pfxBuffer = fs.readFileSync("./certs/arquivoA1.p12");
	const senha = "Fran!123";

	const { privateKeyPem, certificatePem } = extractFromPfx(pfxBuffer, senha);

	const dados = {
		chave: "25250524836327000166550010000043909857920788",
		ide: {
			cUF: "25",
			cNF: "85792078",
			natOp: "VENDA DE MERCADORIA",
			mod: "65",
			serie: "1",
			nNF: "4390",
			dhEmi: "2025-05-09T15:44:12-03:00",
			tpNF: "1",
			idDest: "1",
			cMunFG: "2513901",
			tpImp: "4",
			tpEmis: "9",
			cDV: "8",
			tpAmb: "1",
			finNFe: "1",
			indFinal: "1",
			indPres: "1",
			procEmi: "0",
			verProc: "3.0.928.8245",
			dhCont: "2025-05-09T15:44:12-03:00",
			xJust: "NFC-e emitida em modo de Contingencia...",
		},
		emit: {
			CNPJ: "24836327000166",
			xNome: "JANIO DUTRA DA SILVA",
			xFant: "J D VARIEDADES",
			enderEmit: {
				xLgr: "R FRANCISCO FELIX",
				nro: "121",
				xBairro: "SAO BENTINHO",
				cMun: "2513901",
				xMun: "SAO BENTO",
				UF: "PB",
				CEP: "58865000",
				cPais: "1058",
				xPais: "BRASIL",
				fone: "83991180976",
			},
			IE: "162740085",
			CRT: "3",
		},
		prod: {
			cProd: "1",
			cEAN: "SEM GTIN",
			xProd: "GEL MASSAGEADOR NATGEL 150 G 00001",
			NCM: "33049910",
			CFOP: "5102",
			uCom: "UN",
			qCom: "1.0000",
			vUnCom: "2.3300000000",
			vProd: "2.33",
			cEANTrib: "SEM GTIN",
			uTrib: "UN",
			qTrib: "1.0000",
			vUnTrib: "2.3300000000",
			indTot: "1",
		},
		imposto: {
			vTotTrib: "1.19",
			ICMS: {
				orig: "0",
				CST: "00",
				modBC: "3",
				vBC: "2.33",
				pICMS: "20.0000",
				vICMS: "0.47",
			},
			PIS: {
				CST: "01",
				vBC: "2.33",
				pPIS: "1.6500",
				vPIS: "0.04",
			},
			COFINS: {
				CST: "01",
				vBC: "2.33",
				pCOFINS: "7.6000",
				vCOFINS: "0.18",
			},
		},
		total: {
			vBC: "2.33",
			vICMS: "0.47",
			vICMSDeson: "0.00",
			vFCP: "0.00",
			vBCST: "0.00",
			vST: "0.00",
			vFCPST: "0.00",
			vFCPSTRet: "0.00",
			vProd: "2.33",
			vFrete: "0.00",
			vSeg: "0.00",
			vDesc: "0.00",
			vII: "0.00",
			vIPI: "0.00",
			vIPIDevol: "0.00",
			vPIS: "0.04",
			vCOFINS: "0.18",
			vOutro: "0.00",
			vNF: "2.33",
			vTotTrib: "1.19",
		},
		transp: {
			modFrete: "9",
		},
		pag: {
			tPag: "01",
			vPag: "2.33",
		},
		infAdic: {
			infCpl:
				"Lei n 12.741/12: Voce pagou aproximadamente: R$ 0,60 de tributos federais...",
		},
		infRespTec: {
			CNPJ: "11918344000109",
			xContato: "EDSON LUCIANO FURCIN",
			email: "edson@domtec.com.br",
			fone: "1436625005",
		},
	};

	const xml = generateXml(dados);
	const assinado = assinarXml(xml, privateKeyPem, certificatePem, dados.chave);

	fs.writeFileSync("xml-assinado.xml", assinado);
	console.log("✅ XML assinado com sucesso e salvo como xml-assinado.xml");
})();
