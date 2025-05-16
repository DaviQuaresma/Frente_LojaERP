/** @format */

const fs = require("fs");
const extractFromPfx = require("./extractPfx");
const generateXml = require("./xmlGenerate");
const assinarXml = require("./xmlSignature");
const enviarXmlParaSefaz = require("./sefazSend");
const crypto = require("crypto");

(async () => {
	const pfxBuffer = fs.readFileSync("./certs/arquivoA1.p12");
	const senha = "Fran!123";

	const { privateKeyPem, certificatePem } = extractFromPfx(pfxBuffer, senha);

	const tpAmb = process.env.NODE_ENV === "production" ? "1" : "2";

	// ✅ DADOS FIXOS
	const chave = "25250524836327000166550010000043909857920788";
	const CSC_ID = "1";
	const CSC_TOKEN = "AEE30B6E3824DE8F4F6533B05EB1CBBED82C4782";

	// ✅ GERA QR CODE COM HASH
	const baseUrl =
		tpAmb === "1"
			? "http://www.sefaz.pb.gov.br/nfce"
			: "http://www.sefaz.pb.gov.br/nfce";

	const qrCodeSemHash = `${baseUrl}?p=${chave}|2|1|${CSC_ID}|2.33|6450325146626E31513848555744503048636647704135417059553D|${tpAmb}`;

	const hash = crypto
		.createHmac("sha1", CSC_TOKEN)
		.update(qrCodeSemHash)
		.digest("hex")
		.toUpperCase();

	const qrCodeFinal = `${qrCodeSemHash}|${hash}`;

	// ✅ MOCK COMPLETO COM QR CODE
	const dados = {
		chave,
		suplementar: {
			qrCode: qrCodeFinal,
			urlChave: "www.sefaz.pb.gov.br/nfce/consulta",
		},
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
			tpAmb,
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
			xProd: "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
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
			infCpl: "Lei n 12.741/12: Voce pagou aproximadamente: R$ 0,60 de tributos federais...",
		},
		infRespTec: {
			CNPJ: "11918344000109",
			xContato: "EDSON LUCIANO FURCIN",
			email: "edson@domtec.com.br",
			fone: "1436625005",
		},
	};

	const xml = generateXml(dados).trim();
	console.log("🔍 XML GERADO:\n", xml);

	const assinado = assinarXml(
		xml,
		privateKeyPem,
		certificatePem,
		dados.chave
	).trim();

	const assinadoSemHeader = assinado.replace(/<\?xml.*?\?>/, "").trim();

	// ✅ injeta infNFeSupl após a assinatura
	const infNFeSupl = `
	<infNFeSupl>
		<qrCode>${dados.suplementar.qrCode}</qrCode>
		<urlChave>${dados.suplementar.urlChave}</urlChave>
	</infNFeSupl>`;

	const assinadoComSupl = assinadoSemHeader.replace(
		"</ds:Signature>",
		"</ds:Signature>" + infNFeSupl.trim()
	);

	fs.writeFileSync("xml-assinado.xml", assinadoComSupl);
	console.log("✅ XML assinado com sucesso e salvo como xml-assinado.xml");

	const resposta = await enviarXmlParaSefaz(
		assinadoComSupl,
		certificatePem,
		privateKeyPem
	);

	fs.writeFileSync("resposta-sefaz.xml", resposta);
	console.log("📨 Enviado para SEFAZ! Resposta salva em resposta-sefaz.xml");

	const match = resposta.match(/<nRec>(.*?)<\/nRec>/);
	if (match) {
		console.log("📦 Recibo:", match[1]);
	} else {
		console.log("⚠️ Nenhum recibo retornado. Verifique a resposta da SEFAZ.");
	}
})();
