/** @format */

const axios = require("axios");
const https = require("https");
const { getAmbienteAtual } = require("../config/envControl");
const { getSefazInfo } = require("./sefazHelper");

async function consultarRecibo(nRec, certificadoPem, chavePrivada, ufEmpresa) {
    const ambiente = getAmbienteAtual();
    const sefaz = getSefazInfo(ufEmpresa, ambiente);
    const url = sefaz.consultaRecibo;

    const envelope = `<?xml version="1.0" encoding="utf-8"?>
  <soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
    <soap12:Body>
      <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">
        <consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
          <tpAmb>${ambiente === "production" ? "1" : "2"}</tpAmb>
          <nRec>${nRec}</nRec>
        </consReciNFe>
      </nfeDadosMsg>
    </soap12:Body>
  </soap12:Envelope>`.trim();

    const agent = new https.Agent({
        cert: certificadoPem,
        key: chavePrivada,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2',
    });

    const headers = {
        "Content-Type": "application/soap+xml; charset=utf-8",
    };

    const maxTentativas = 5;
    const intervaloMs = 3000;

    for (let i = 1; i <= maxTentativas; i++) {
        try {
            const { data } = await axios.post(url, envelope, { httpsAgent: agent, headers });
            const matchProtocolo = data.match(/<protNFe[\s\S]*?<\/protNFe>/);
            const matchStatus = data.match(/<cStat>(.*?)<\/cStat>/);
            const matchMotivo = data.match(/<xMotivo>(.*?)<\/xMotivo>/);

            if (matchProtocolo) {
                return { sucesso: true, protocolo: matchProtocolo[0] };
            }

            const status = matchStatus?.[1];
            const motivo = matchMotivo?.[1];

            console.log(`🕒 Tentativa ${i}: status ${status} — ${motivo}`);
            if (status && status !== "105") break; // 105 = Lote ainda em processamento
        } catch (err) {
            console.error(`⚠️ Erro ao consultar recibo (tentativa ${i}):`, err.message);
        }

        if (i < maxTentativas) await new Promise(r => setTimeout(r, intervaloMs));
    }

    return { sucesso: false, erro: "Não foi possível obter protocolo após múltiplas tentativas" };
}

module.exports = consultarRecibo;
