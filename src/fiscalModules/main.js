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
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("../utils/sefazHelper");
const getDataHoraFormatoSefaz = require("../utils/getDataHoraSefaz");

const {
  getEmpresaData,
  getVendaById,
  getItensVendaByPedido,
  createXmlTable,
} = require("../utils/dbCommands");

const { getNewClient } = require("../db/getNewClient");

function getCUF(uf) {
  const tabela = {
    AC: "12", AL: "27", AP: "16", AM: "13", BA: "29",
    CE: "23", DF: "53", ES: "32", GO: "52", MA: "21",
    MT: "51", MS: "50", MG: "31", PA: "15", PB: "25",
    PR: "41", PE: "26", PI: "22", RJ: "33", RN: "24",
    RS: "43", RO: "11", RR: "14", SC: "42", SP: "35",
    SE: "28", TO: "17"
  };

  return tabela[uf] || "";
}

module.exports = async function fiscalMain(vendaID, certificadoManual) {
  const emp_codigo = 1;
  const desktopPath = app.getPath("desktop");
  const logFilePath = path.join(desktopPath, "log.txt");

  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "=== Log de Vendas ===\n\n\n\n", "utf-8");
  }

  try {
    fs.appendFileSync(logFilePath, `VendaID: ${vendaID}\n\n\n\n`, "utf-8");
    fs.appendFileSync(
      logFilePath,
      `Certificado: ${JSON.stringify(certificadoManual)}\n\n\n\n`,
      "utf-8"
    );

    const connection = await getNewClient();
    const empresa = await getEmpresaData(connection, emp_codigo);
    console.log("📦 Dados da empresa:", empresa);
    console.table(empresa);
    const venda = await getVendaById(connection, vendaID);
    const itens = await getItensVendaByPedido(connection, vendaID);

    const { caminho, senha } = certificadoManual;
    const pfxBuffer = fs.readFileSync(caminho);

    const { privateKeyPem, certificatePem, subject, cnpj } = extractFromPfx(pfxBuffer, senha.trim());

    console.log("🔍 Certificado carregado com sucesso.");
    console.log("🔍 Subject do certificado:", subject);
    console.log("🔍 CNPJ extraído do certificado:", cnpj || "não encontrado");

    const cnpjCertBase = cnpj?.substring(0, 8);
    const cnpjEmitente = String(empresa.CNPJ).replace(/\D/g, "");
    const cnpjEmitenteBase = cnpjEmitente.substring(0, 8);

    console.log("🏢 CNPJ do certificado (base):", cnpjCertBase);
    console.log("🏬 CNPJ do emitente (base):", cnpjEmitenteBase);

    if (!cnpjCertBase || cnpjCertBase !== cnpjEmitenteBase) {
      throw new Error(
        `❌ CNPJ do certificado (${cnpjCertBase || "inválido"}) difere do CNPJ do emitente (${cnpjEmitenteBase})`
      );
    }

    const ambiente = getAmbienteAtual();
    const tpAmb = ambiente === "production" ? "1" : "2";
    const sefazInfo = getSefazInfo(empresa.UF, ambiente);

    const ide = {
      cUF: getCUF(empresa.UF),
      cNF: "85792078",
      natOp: "VENDA DE MERCADORIA",
      mod: "65",
      serie: venda.ven_serie_nfe || "1",
      nNF: venda.ven_numero_dfe,
      dhEmi: getDataHoraFormatoSefaz(new Date(venda.ven_data_hora_finaliza || Date.now())),
      tpNF: "1",
      idDest: "1",
      cMunFG: empresa.cMunFG,
      tpImp: "4",
      tpEmis: "9",
      tpAmb,
      finNFe: "1",
      indFinal: "1",
      indPres: "1",
      procEmi: "0",
      verProc: "3.0.928.8245",
      ...(tpAmb === "2" && {
        dhCont: getDataHoraFormatoSefaz(new Date()),
        xJust: "NFC-e emitida em modo de Contingência...",
      }),
    };

    const chave = gerarChaveAcesso({
      cUF: ide.cUF,
      AAMM: "2505",
      CNPJ: empresa.CNPJ,
      mod: ide.mod,
      serie: ide.serie,
      nNF: ide.nNF,
      tpEmis: ide.tpEmis,
      cNF: ide.cNF,
    });

    ide.cDV = chave.slice(-1);

    const baseUrl = sefazInfo.qrCode;
    const qrCodeSemHash = `${baseUrl}?p=${chave}|2|1|${empresa.cscId}|2.33|6450325146626E31513848555744503048636647704135417059553D|${tpAmb}`;
    const hash = crypto.createHmac("sha1", empresa.cscToken).update(qrCodeSemHash).digest("hex").toUpperCase();
    const qrCodeFinal = `${qrCodeSemHash}|${hash}`;

    const produtosXml = [];
    let vProd = 0, vBC = 0, vICMS = 0, vIPI = 0, vST = 0, vTotTrib = 0;

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
        NCM: item.pro_codigo_fiscal || "00000000",
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

    const obsLimpa = (venda.ven_obs || "").trim();


    const telefoneRaw =
      empresa.emp_telefone ||
      empresa.emp_rp_fone ||
      empresa.emp_cont_telefone ||
      empresa.emp_telefone1_rep ||
      empresa.emp_telefone2_rep ||
      "99 9999 9999";

    const telefoneFormatado = telefoneRaw.replace(/\D/g, "");
    const fone =
      telefoneFormatado.length >= 10 && telefoneFormatado.length <= 11
        ? telefoneFormatado
        : undefined;

    const dados = {
      chave,
      suplementar: {
        qrCode: qrCodeFinal,
        urlChave: sefazInfo.qrCode,
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
          CEP: String(empresa.CEP || "").replace(/\D/g, "").padStart(8, "0"),
          cPais: "1058",
          xPais: "BRASIL",
          ...(fone ? { fone } : {}),
        },
        IE: empresa.IE,
        CRT: "3",
      },
      prod: produtosXml[0],
      imposto: {
        vTotTrib: vTotTrib.toFixed(2),
        ICMS: {
          orig: "0",
          CST: itens[0].ite_icms_cst || "00",
          modBC: "3",
          vBC: vBC.toFixed(2),
          pICMS: Number(itens[0].ite_aliq_icms_efetiva) > 0 ? Number(itens[0].ite_aliq_icms_efetiva).toFixed(4) : "0.0000",
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
      ...(obsLimpa
        ? {
          infAdic: {
            infCpl: obsLimpa,
          },
        }
        : {}),
      infRespTec: {
        CNPJ: empresa.respCNPJ,
        xContato: empresa.respNome,
        email: empresa.respEmail,
        fone: empresa.respFone,
      },
    };

    await createXmlTable(connection);
    const xml = generateXml(dados).trim();


    const assinado = assinarXml(xml, privateKeyPem, certificatePem, dados.chave)
      .replace(/^\uFEFF/, "")                    // remove BOM
      .replace(/<\?xml[^>]*\?>/, "")             // remove header XML
      .replace(/>\s+</g, "><")                   // remove espaços/quebras entre tags
      .replace(/[\r\n\t]/g, "")                  // remove qualquer tab, CR ou LF
      .trim();


    const conteudoFinal = assinado
      .replace(/^\uFEFF/, "")
      .replace(/<\?xml.*?\?>/, "")
      .replace(/^[\s\S]*?(<NFe[\s\S]*<\/NFe>)/, "$1")
      .trim();

    const timestamp = Date.now();
    const nomeArquivo = `xml-assinado-${vendaID}-${timestamp}.xml`;
    await connection.query(
      `INSERT INTO xmls_gerados (nome, tamanho, conteudo) VALUES ($1, $2, $3)`,
      [nomeArquivo, Buffer.byteLength(conteudoFinal, "utf-8"), conteudoFinal]
    );

    const resposta = await enviarXmlParaSefaz(conteudoFinal, certificatePem, privateKeyPem, empresa.UF);

    if (!resposta || typeof resposta !== "string" || resposta.trim() === "") {
      throw new Error("❌ Resposta da SEFAZ vazia ou inválida.");
    }

    const matchRecibo = resposta.match(/<nRec>(.*?)<\/nRec>/);
    const matchMotivo = resposta.match(/<xMotivo>(.*?)<\/xMotivo>/);
    const matchStatus = resposta.match(/<cStat>(.*?)<\/cStat>/);
    const matchProtocolo = resposta.match(/<protNFe.*?<\/protNFe>/s);

    if (matchRecibo) {
      console.log("📦 Recibo retornado:", matchRecibo[1]);
      fs.appendFileSync(logFilePath, `📦 Recibo retornado: ${matchRecibo[1]}\n\n\n\n`, "utf-8");
    } else {
      console.log("⚠️ Nenhum recibo retornado.");
      fs.appendFileSync(logFilePath, `⚠️ Nenhum recibo retornado.\n`, "utf-8");

      if (matchStatus && matchMotivo) {
        const status = matchStatus[1];
        const motivo = matchMotivo[1];

        console.log(`❌ Rejeição ${status}: ${motivo}`);
        fs.appendFileSync(
          logFilePath,
          `❌ Rejeição ${status}: ${motivo}\n\n\n\n`,
          "utf-8"
        );

        // Caso especial: Lote processado, mas talvez sem protocolo salvo
        if (status === "104" && matchProtocolo) {
          console.log("📄 Protocolo encontrado em lote processado.");
          fs.appendFileSync(logFilePath, `📄 Protocolo extraído:\n${matchProtocolo[0]}\n\n\n\n`, "utf-8");
        }
      } else {
        fs.appendFileSync(logFilePath, `❌ Retorno SEFAZ sem detalhes de erro.\n\n\n\n`, "utf-8");
      }
    }
    return { sucesso: true };
  } catch (e) {
    fs.appendFileSync(
      path.join(app.getPath("desktop"), "log.txt"),
      `ERRO: ${e.stack || e.message}\n\n\n\n`,
      "utf-8"
    );
    return { sucesso: false, erro: e.stack || e.message };
  }
};
