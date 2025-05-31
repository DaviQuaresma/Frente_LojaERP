const crypto = require("crypto");

/**
 * Gera a URL do QR Code da NFC-e conforme a versão 2.00 (NT 2016.002 v1.50)
 * @param {Object} params
 * @param {string} params.chave - Chave de acesso da NFe (44 dígitos)
 * @param {string} params.cscId - ID do CSC (cIdToken, ex: 000001)
 * @param {string} params.cscToken - Valor do CSC (chave secreta)
 * @param {string} params.sefazUrlBase - Base da URL da SEFAZ (ex: http://www.sefaz.uf.gov.br/nfce/qrcode)
 * @param {string} params.tpAmb - Tipo de ambiente (1 = produção / 2 = homologação)
 * @param {string} params.dhEmi - Data de emissão (formato ISO, ex: 2025-05-30T13:01:12-03:00)
 * @param {string} params.vNF - Valor total da nota (ex: 40.00)
 * @param {string} params.vICMS - Valor total do ICMS (ex: 0.00)
 * @param {string} params.digVal - Digest value do XML (hash SHA1 codificado em Base64 ou HEX)
 * @returns {string} URL do QR Code pronta para injetar no XML
 */
function gerarQrCodeV2({ chave, cscId, cscToken, sefazUrlBase, tpAmb, dhEmi, vNF, vICMS, digVal }) {
    const baseUrl = sefazUrlBase.trim().replace(/\/+$/, "");
    const nVersao = "100"; // versão 1.00 do QR Code (fixo)

    // Formata a data em base16 (sem separadores)
    const dhEmiBase16 = Buffer.from(dhEmi).toString("hex").toUpperCase();

    // Monta a URL base sem hash
    const urlSemHash =
        `${baseUrl}?chNFe=${chave}` +
        `&nVersao=${nVersao}` +
        `&tpAmb=${tpAmb}` +
        `&dhEmi=${dhEmiBase16}` +
        `&vNF=${vNF}` +
        `&vICMS=${vICMS}` +
        `&digVal=${digVal}` +
        `&cIdToken=${cscId}`;

    // Gera o hash SHA1 com o CSC Token
    const cHashQRCode = crypto
        .createHmac("sha1", cscToken)
        .update(urlSemHash)
        .digest("hex")
        .toUpperCase();

    // Monta a URL final com hash
    const urlFinal = `${urlSemHash}&cHashQRCode=${cHashQRCode}`;

    return urlFinal;
}

module.exports = gerarQrCodeV2;
