/** @format */

const fs = require("fs");
const { app } = require("electron");
const path = require("path");
const crypto = require("crypto");
const { create } = require("xmlbuilder2");
const extractFromPfx = require("./extractPfx");
const generateXml = require("./xmlGenerate");
const assinarXml = require("./xmlSignature");
const enviarXmlParaSefaz = require("./sefazSend");
const gerarChaveAcesso = require("../utils/gerarChaveAcesso");
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("../utils/sefazHelper");
const getDataHoraFormatoSefaz = require("../utils/getDataHoraSefaz");
const gerarNfeProc = require("../utils/gerarNfeProc");
const getCUF = require("../utils/getCUF");
const consultarRecibo = require("../utils/consultarRecibo");
const { getNewClient } = require("../db/getNewClient");
const { getEmpresaData, getVendaById, getItensVendaByPedido, createXmlTable, saveProtocol } = require("../utils/dbCommands");
const adicionarInfNFeSupl = require("../utils/addInfNFeSupl")

module.exports = async function fiscalMain(vendaID, certificadoManual) {
  const emp_codigo = 1;
  const desktopPath = app.getPath("desktop");
  const logFilePath = path.join(desktopPath, "log.txt");

  if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "=== Log de Vendas ===\n\n\n", "utf-8");
  }

  try {
    fs.appendFileSync(logFilePath, `VendaID: ${vendaID}\n\n\n`, "utf-8");
    fs.appendFileSync(logFilePath, `Certificado: ${JSON.stringify(certificadoManual)}\n\n\n`, "utf-8");

    const connection = await getNewClient();
    const empresa = await getEmpresaData(connection, emp_codigo);
    const venda = await getVendaById(connection, vendaID);
    const itens = await getItensVendaByPedido(connection, vendaID);

    const { caminho, senha } = certificadoManual;
    const pfxBuffer = fs.readFileSync(caminho);
    const ambiente = getAmbienteAtual();

    const { privateKeyPem, certificatePem, subject, cnpj } = extractFromPfx(pfxBuffer, senha.trim());

    const cnpjCertBase = cnpj?.substring(0, 8);
    const cnpjEmitente = String(empresa.CNPJ).replace(/\D/g, "");
    const cnpjEmitenteBase = cnpjEmitente.substring(0, 8);

    if (!cnpjCertBase || cnpjCertBase !== cnpjEmitenteBase) {
      fs.appendFileSync(
        logFilePath,
        `⚠️ [TESTE] CNPJ do certificado (${cnpjCertBase || "inválido"}) difere do emitente (${cnpjEmitenteBase}) — ignorado para testes.\n\n\n`,
        "utf-8"
      );

      console.log(
        `⚠️ [TESTE] CNPJ do certificado (${cnpjCertBase || "inválido"}) difere do emitente (${cnpjEmitenteBase}) — ignorado para testes.\n\n\n`,
        "utf-8"
      );
    } else {
      fs.appendFileSync(
        logFilePath,
        `✅ CNPJ do certificado validado com sucesso (${cnpjCertBase})\n\n\n`,
        "utf-8"
      );
    }

    const sefazInfo = getSefazInfo(empresa.UF, ambiente);

    const tpAmb = ambiente === "production" ? "1" : "2";
    const tpEmis = "1";

    fs.appendFileSync(logFilePath, `Ambiente: ${ambiente}\n\n\n`, "utf-8");
    fs.appendFileSync(logFilePath, `tpAmb (SEFAZ): ${tpAmb}\n\n\n`, "utf-8");
    fs.appendFileSync(logFilePath, `tpEmis (tipo de emissão): ${tpEmis}\n\n\n`, "utf-8");

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
      tpEmis,
      tpAmb,
      finNFe: "1",
      indFinal: "1",
      indPres: "1",
      procEmi: "0",
      verProc: "3.0.928.8245"
    };

    const dataEmissao = new Date(ide.dhEmi);
    const AAMM = `${String(dataEmissao.getFullYear()).slice(2)}${String(dataEmissao.getMonth() + 1).padStart(2, "0")}`;

    const chave = gerarChaveAcesso({
      cUF: ide.cUF,
      AAMM,
      CNPJ: empresa.CNPJ,
      mod: ide.mod,
      serie: ide.serie,
      nNF: ide.nNF,
      tpEmis: ide.tpEmis,
      cNF: ide.cNF,
    });

    ide.cDV = chave.slice(-1);

    const baseUrl = sefazInfo.qrCode;
    const versaoQrCode = "2";
    const idCSC = empresa.cscId;
    const cscToken = empresa.cscToken.replace(/[^A-Za-z0-9]/g, ""); // Limpa token

    const stringParaAssinar = `${chave}|${versaoQrCode}|${tpAmb}|${idCSC}|${cscToken}`;
    const cHashQRCode = crypto
      .createHmac("sha1", cscToken)
      .update(stringParaAssinar)
      .digest("hex")
      .toUpperCase();

    const qrCodeFinal = `${baseUrl}?p=${chave}|${versaoQrCode}|${tpAmb}|${idCSC}|${cHashQRCode}`;

    const urlChave = baseUrl
      .replace(/^https?:\/\//, "")
      .replace(/\?.*$/, "")
      .replace("/qrcode", "/consulta");

    // Logs para debug
    fs.appendFileSync(logFilePath, `CSC ID: ${idCSC} | CSC Token: ${empresa.cscToken}\n`, "utf-8");
    fs.appendFileSync(logFilePath, `cHashQRCode: ${cHashQRCode}\n`, "utf-8");
    fs.appendFileSync(logFilePath, `🔗 QR Code Final: ${qrCodeFinal}\n`, "utf-8");
    fs.appendFileSync(logFilePath, `🔗 urlChave: ${urlChave}\n`, "utf-8");

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
        xProd: item.ite_descricao || item.pro_nome || "PRODUTO",
        NCM: item.pro_codigo_fiscal || item.pro_ncm || "00000000",
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
        vTotTrib: (icms + ipi + st).toFixed(2),
      });

      vProd += parseFloat(item.ite_total || 0);
      vBC += bc;
      vICMS += icms;
      vIPI += ipi;
      vST += st;
      vTotTrib += icms + ipi + st;
    }

    const telefoneRaw = empresa.emp_telefone || empresa.emp_rp_fone || empresa.emp_cont_telefone || empresa.emp_telefone1_rep || empresa.emp_telefone2_rep || "99 9999 9999";
    const telefoneFormatado = telefoneRaw.replace(/\D/g, "");
    const fone = telefoneFormatado.length >= 10 && telefoneFormatado.length <= 11 ? telefoneFormatado : undefined;

    const dados = {
      chave,
      ide,
      emit: {
        CNPJ: empresa.CNPJ,
        xNome: empresa.xNome,
        xFant: empresa.xFant,
        enderEmit: {
          xLgr: empresa.xLgr,
          nro: empresa.nro,
          xBairro: empresa.xBairro,
          cMun: empresa.cMunFG,
          xMun: empresa.xMun,
          UF: empresa.UF,
          CEP: String(empresa.CEP || "").replace(/\D/g, "").padStart(8, "0"),
          cPais: "1058",
          xPais: "BRASIL",
          ...(fone ? { fone } : {}),
        },
        IE: empresa.IE && empresa.IE.trim() !== "" ? empresa.IE.trim() : "ISENTO",
        CRT: "1",
      },
      prod: produtosXml[0],
      imposto: {
        vTotTrib: vTotTrib.toFixed(2),
        ICMS: {
          orig: "0",
          CSOSN: "102"
        },
        PIS: {
          CST: "99",
          vBC: "0.00",
          pPIS: "0.0000",
          vPIS: "0.00"
        },
        COFINS: {
          CST: "99",
          vBC: "0.00",
          pCOFINS: "0.0000",
          vCOFINS: "0.00"
        }
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
        vFrete: "0.00",
        vSeg: "0.00",
        vDesc: "0.00",
        vII: "0.00",
        vIPI: vIPI.toFixed(2),
        vIPIDevol: "0.00",
        vPIS: "0.00",
        vCOFINS: "0.00",
        vOutro: "0.00",
        vNF: vProd.toFixed(2),
        vTotTrib: vTotTrib.toFixed(2),
      },
      transp: {
        modFrete: "9",
      },
      pag: {
        tPag: "01",
        vPag: parseFloat(venda.ven_total || 0).toFixed(2),
      },
      ...(venda.ven_obs?.trim()
        ? {
          infAdic: {
            infCpl: venda.ven_obs.trim(),
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

    // 1. Gera XML base da NFe
    const xmlBase = generateXml(dados).trim();
    console.log("xmlBase:", xmlBase);

    // 2. Assina o XML
    const assinado = assinarXml(xmlBase, privateKeyPem, certificatePem, dados.chave).trim();
    console.log("assinado:", assinado);

    // 3. Envia para a SEFAZ sem o infNFeSupl
    const resposta = await enviarXmlParaSefaz(assinado, certificatePem, privateKeyPem, empresa.UF);
    console.log("resposta:", resposta);
    fs.appendFileSync(logFilePath, `📨 Resposta da SEFAZ:\n${resposta}\n\n`, "utf-8");

    // 4. Extrai dados da resposta
    const matchRecibo = resposta.match(/<nRec>(.*?)<\/nRec>/) || resposta.match(/<infRec>[\s\S]*?<nRec>(.*?)<\/nRec>/);
    const matchMotivo = resposta.match(/<xMotivo>(.*?)<\/xMotivo>/);
    const matchStatus = resposta.match(/<cStat>(.*?)<\/cStat>/);
    let matchProtocolo = resposta.match(/<protNFe[\s\S]*?<\/protNFe>/);
    let protocolo = matchProtocolo?.[0];

    console.log("🧩 Matchs iniciais:");
    console.log("➡️ matchRecibo:", !!matchRecibo);
    console.log("➡️ matchProtocolo:", !!matchProtocolo);
    fs.appendFileSync(logFilePath, `matchRecibo: ${!!matchRecibo}\n`, "utf-8");
    fs.appendFileSync(logFilePath, `matchProtocolo: ${!!matchProtocolo}\n\n`, "utf-8");

    // 5. Tenta obter protocolo via fallback (caso status seja 104 mas sem protocolo)
    if (!matchProtocolo && matchStatus?.[1] === '104') {
      console.log("⚠️ Status 104 mas sem protocolo. Tentando fallback...");

      const reciboFallback = matchRecibo?.[1];
      if (reciboFallback) {
        const consulta = await consultarRecibo(reciboFallback, certificatePem, privateKeyPem, empresa.UF);
        if (consulta.sucesso && consulta.protocolo) {
          protocolo = consulta.protocolo;
          matchProtocolo = [consulta.protocolo];
          fs.appendFileSync(logFilePath, `✅ Protocolo via fallback: ${protocolo}\n\n`, "utf-8");
        } else {
          fs.appendFileSync(logFilePath, `❌ Fallback falhou\n\n`, "utf-8");
        }
      }
    }

    // 6. Gera XML final com infNFeSupl e protocolo
    if (matchProtocolo) {
      await saveProtocol(connection, dados.chave, protocolo);

      const xmlComSupl = adicionarInfNFeSupl(assinado, qrCodeFinal, urlChave);
      const xmlFinal = gerarNfeProc(xmlComSupl, matchProtocolo[0]);

      const timestamp = Date.now();
      const nomeFinal = `xml-final-${vendaID}-${timestamp}.xml`;

      await connection.query(
        `INSERT INTO xmls_gerados (nome, tamanho, conteudo) VALUES ($1, $2, $3)`,
        [nomeFinal, Buffer.byteLength(xmlFinal, "utf-8"), xmlFinal]
      );

      if (matchRecibo) {
        fs.appendFileSync(logFilePath, `📦 Recibo retornado: ${matchRecibo[1]}\n`, "utf-8");
      }

      return { sucesso: true };
    }

    // 7. Se não houver protocolo válido
    const motivo = matchMotivo?.[1] || "Protocolo não encontrado";
    fs.appendFileSync(logFilePath, `❌ Erro final: ${motivo}\n\n`, "utf-8");
    return { sucesso: false, erro: `Erro: ${motivo}` };

  } catch (e) {
    fs.appendFileSync(logFilePath, `ERRO: ${e.stack || e.message}\n\n\n\n`, "utf-8");
    return { sucesso: false, erro: e.stack || e.message };
  }
};
