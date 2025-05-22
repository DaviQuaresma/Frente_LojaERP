/** @format */

const fs = require("fs");
const { app } = require("electron");
const path = require("path");
const crypto = require("crypto");
const extractFromPfx = require("./extractPfx");
const generateXml = require("./xmlGenerate");
const assinarXml = require("./xmlSignature");
const enviarXmlParaSefaz = require("./sefazSend");
const gerarChaveAcesso = require("../utils/gerarChaveAcesso");

const {
  getEmpresaData,
  getVendaById,
  getItensVendaByPedido,
  createXmlTable,
} = require("../utils/dbCommands");

const { getNewClient } = require("../db/getNewClient");

module.exports = async function fiscalMain(vendaID, certificadoManual) {
  const emp_codigo = 1;
  const connection = await getNewClient();

  // 📦 Coleta de dados
  const empresa = await getEmpresaData(connection, emp_codigo);
  const venda = await getVendaById(connection, vendaID);
  const itens = await getItensVendaByPedido(connection, vendaID);
  const { caminho, senha } = certificadoManual;
  const { getAmbienteAtual } = require("../config/envControl");

  // 🔐 Leitura e extração do certificado
  const pfxBuffer = fs.readFileSync(caminho);
  const { privateKeyPem, certificatePem } = extractFromPfx(
    pfxBuffer,
    senha.trim()
  );

  // 🧠 Montagem do bloco IDE (identificação da NFe)
  const ambiente = getAmbienteAtual();
  const tpAmb = ambiente === "production" ? "1" : "2";

  const ide = {
    cUF: empresa.UF === "PB" ? "25" : "",
    cNF: "85792078", // pode tornar dinâmico depois
    natOp: "VENDA DE MERCADORIA",
    mod: "65",
    serie: venda.ven_serie_nfe || "1", // fallback seguro
    nNF: venda.ven_numero_dfe,
    dhEmi: new Date(venda.ven_data_hora_finaliza || Date.now()).toISOString(),
    tpNF: "1",
    idDest: "1",
    cMunFG: empresa.cMun || "2513901",
    tpImp: "4",
    tpEmis: "9",
    tpAmb,
    finNFe: "1",
    indFinal: "1",
    indPres: "1",
    procEmi: "0",
    verProc: "3.0.928.8245",
    dhCont: new Date().toISOString(),
    xJust: "NFC-e emitida em modo de Contingência...",
  };

  // 🔐 Geração da chave de acesso
  const chave = gerarChaveAcesso({
    cUF: ide.cUF,
    AAMM: "2505", // pode usar data dinâmica depois
    CNPJ: empresa.CNPJ,
    mod: ide.mod,
    serie: ide.serie,
    nNF: ide.nNF,
    tpEmis: ide.tpEmis,
    cNF: ide.cNF,
  });

  ide.cDV = chave.slice(-1); // dígito verificador

  // 🔗 Geração do QR Code
  const baseUrl = "http://www.sefaz.pb.gov.br/nfce";
  const qrCodeSemHash = `${baseUrl}?p=${chave}|2|1|${empresa.cscId}|2.33|6450325146626E31513848555744503048636647704135417059553D|${tpAmb}`;
  const hash = crypto
    .createHmac("sha1", empresa.cscToken)
    .update(qrCodeSemHash)
    .digest("hex")
    .toUpperCase();
  const qrCodeFinal = `${qrCodeSemHash}|${hash}`;

  // 🧮 Processamento de itens
  const produtosXml = [];
  let vProd = 0,
    vBC = 0,
    vICMS = 0,
    vIPI = 0,
    vST = 0,
    vTotTrib = 0;

  for (const item of itens) {
    const totalItem = parseFloat(item.ite_total || 0);
    const valorUnit = parseFloat(item.ite_valor_unit || 0);
    const qtd = parseFloat(item.ite_qtd || 1);
    const icms = parseFloat(item.ite_vlr_icms || 0);
    const bc = parseFloat(item.ite_bc_icms || 0);
    const ipi = parseFloat(item.ite_vlr_ipi || 0);
    const st = parseFloat(item.ite_vlr_icms_st || 0);

    produtosXml.push({
      cProd: item.pro_codigo.toString(),
      cEAN: "SEM GTIN",
      xProd: item.ite_descricao || "PRODUTO",
      NCM: "00000000",
      CFOP: item.ite_cfop || "5102",
      uCom: item.ite_unidade || "UN",
      qCom: qtd.toFixed(4),
      vUnCom: valorUnit.toFixed(10),
      vProd: totalItem.toFixed(2),
      cEANTrib: "SEM GTIN",
      uTrib: item.ite_unidade || "UN",
      qTrib: qtd.toFixed(4),
      vUnTrib: valorUnit.toFixed(10),
      indTot: "1",
    });

    vProd += totalItem;
    vBC += bc;
    vICMS += icms;
    vIPI += ipi;
    vST += st;
    vTotTrib += icms + ipi + st;
  }

  // 🧾 Montagem do objeto final para XML
  const dados = {
    chave,
    suplementar: {
      qrCode: qrCodeFinal,
      urlChave: "www.sefaz.pb.gov.br/nfce/consulta",
    },
    ide,
    emit: {
      CNPJ: empresa.CNPJ,
      xNome: empresa.xNome,
      xFant: empresa.xFant,
      enderEmit: {
        xLgr: empresa.xLgr,
        nro: empresa.nro,
        xBairro: empresa.xBairro,
        cMun: empresa.cMun || "2513901",
        xMun: empresa.xMun,
        UF: empresa.UF,
        CEP: empresa.CEP,
        cPais: "1058",
        xPais: "BRASIL",
        fone: empresa.fone || "",
      },
      IE: empresa.IE,
      CRT: "3",
    },
    prod: produtosXml[0], // simplificado (pode virar array depois)
    imposto: {
      vTotTrib: vTotTrib.toFixed(2),
      ICMS: {
        orig: "0",
        CST: itens[0].ite_icms_cst || "00",
        modBC: "3",
        vBC: vBC.toFixed(2),
        pICMS:
          Number(itens[0].ite_aliq_icms_efetiva) > 0
            ? Number(itens[0].ite_aliq_icms_efetiva).toFixed(4)
            : "0.0000",
        vICMS: vICMS.toFixed(2),
      },
      PIS: {
        CST: "01",
        vBC: vProd.toFixed(2),
        pPIS: "1.6500",
        vPIS: "0.04",
      },
      COFINS: {
        CST: "01",
        vBC: vProd.toFixed(2),
        pCOFINS: "7.6000",
        vCOFINS: "0.18",
      },
    },
    // Trecho revisado da estrutura "dados.total" com parseFloat
    total: {
      vBC: vBC.toFixed(2),
      vICMS: vICMS.toFixed(2),
      vICMSDeson: "0.00",
      vFCP: "0.00",
      vBCST: "0.00",
      vST: vST.toFixed(2),
      vFCPST: "0.00",
      vFCPSTRet: "0.00",
      vProd: vProd.toFixed(2),
      vFrete: parseFloat(venda.ven_frete || 0).toFixed(2),
      vSeg: "0.00",
      vDesc: parseFloat(venda.ven_desconto || 0).toFixed(2),
      vII: "0.00",
      vIPI: vIPI.toFixed(2),
      vIPIDevol: "0.00",
      vPIS: "0.04",
      vCOFINS: "0.18",
      vOutro: parseFloat(venda.ven_outras_despesas || 0).toFixed(2),
      vNF: parseFloat(venda.ven_total || 0).toFixed(2),
      vTotTrib: vTotTrib.toFixed(2),
    },

    transp: {
      modFrete: venda.ven_tipo_frete?.toString() || "9",
    },
    pag: {
      tPag: "01",
      vPag: parseFloat(venda.ven_total || 0).toFixed(2),
    },
    infAdic: {
      infCpl: venda.ven_obs || "",
    },
    infRespTec: {
      CNPJ: empresa.respCNPJ,
      xContato: empresa.respNome,
      email: empresa.respEmail,
      fone: empresa.respFone,
    },
  };

  // Cria a tabela no banco (caso ainda não exista)
  await createXmlTable(connection);

  // 🧱 Geração do XML base
  const xml = generateXml(dados).trim();

  // 🔐 Assinatura do XML
  const assinado = assinarXml(xml, privateKeyPem, certificatePem, dados.chave);

  // 🧼 Limpeza do XML final
  const conteudoFinal = assinado
    .replace(/^\uFEFF/, "") // remove BOM (byte order mark)
    .replace(/<\?xml.*?\?>/, "") // remove cabeçalho XML
    .replace(/^[\s\S]*?(<NFe[\s\S]*<\/NFe>)/, "$1") // isola o conteúdo real do NFe
    .trim();

  // 🗂️ Nome do arquivo lógico
  const timestamp = Date.now();
  const nomeArquivo = `xml-assinado-${vendaID}-${timestamp}.xml`;

  // 🛢️ Salva no banco de dados
  await connection.query(
    `
  INSERT INTO xmls_gerados (nome, tamanho, conteudo)
  VALUES ($1, $2, $3)
`,
    [nomeArquivo, Buffer.byteLength(conteudoFinal, "utf-8"), conteudoFinal]
  );

  console.log(`🗄️ XML assinado inserido no banco como: ${nomeArquivo}`);

  // 📡 Envio para SEFAZ
  const resposta = await enviarXmlParaSefaz(
    conteudoFinal,
    certificatePem,
    privateKeyPem
  );

  // 🔎 (Opcional: logar recibo ou salvar resposta no banco também)
  const match = resposta.match(/<nRec>(.*?)<\/nRec>/);
  if (match) {
    console.log("📦 Recibo:", match[1]);
  } else {
    console.log("⚠️ Nenhum recibo retornado. Verifique a resposta da SEFAZ.");
  }
};
