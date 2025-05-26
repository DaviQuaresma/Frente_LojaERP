const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;
const https = require("https");
const axios = require("axios");

const { getSefazInfo } = require("../utils/sefazHelper");

const ufs = ["AM", "PB", "PI", "RN"];
const ambientes = ["production", "homologation"];
const desktopPath = require("electron").app.getPath("desktop");
const logFilePath = path.join(desktopPath, "log_dns_conexao.txt");

if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, "=== Teste DNS + Conexão SEFAZ ===\n\n", "utf-8");
}

module.exports = async function testarDns() {
    for (const uf of ufs) {
        for (const ambiente of ambientes) {
            try {
                const info = getSefazInfo(uf, ambiente);
                const envioHost = new URL(info.envio).hostname;
                const qrHost = new URL(info.qrCode).hostname;

                // 🧪 Teste DNS envio
                try {
                    const dnsEnvio = await dns.lookup(envioHost);
                    fs.appendFileSync(
                        logFilePath,
                        `✅ [${uf}][${ambiente}] DNS envio resolvido: ${envioHost} → ${dnsEnvio.address}\n`,
                        "utf-8"
                    );
                } catch (e) {
                    fs.appendFileSync(
                        logFilePath,
                        `❌ [${uf}][${ambiente}] DNS envio falhou: ${envioHost}\n`,
                        "utf-8"
                    );
                }

                // 🧪 Teste DNS QR Code
                try {
                    const dnsQr = await dns.lookup(qrHost);
                    fs.appendFileSync(
                        logFilePath,
                        `✅ [${uf}][${ambiente}] DNS QR resolvido: ${qrHost} → ${dnsQr.address}\n`,
                        "utf-8"
                    );
                } catch (e) {
                    fs.appendFileSync(
                        logFilePath,
                        `❌ [${uf}][${ambiente}] DNS QR falhou: ${qrHost}\n`,
                        "utf-8"
                    );
                }

                // 🧪 Teste conexão HTTP/HTTPS envio
                try {
                    const result = await axios.get(info.envio, {
                        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                        timeout: 3000,
                    });

                    fs.appendFileSync(
                        logFilePath,
                        `✅ [${uf}][${ambiente}] Conexão envio OK - Status: ${result.status}\n\n`,
                        "utf-8"
                    );
                } catch (err) {
                    fs.appendFileSync(
                        logFilePath,
                        `❌ [${uf}][${ambiente}] Conexão envio falhou (${info.envio}): ${err.code || err.message}\n\n`,
                        "utf-8"
                    );
                }
            } catch (e) {
                fs.appendFileSync(
                    logFilePath,
                    `❌ Erro geral para [${uf}][${ambiente}]: ${e.message}\n\n`,
                    "utf-8"
                );
            }
        }
    }

    console.log("🧪 Testes concluídos. Verifique o arquivo log_dns_conexao.txt na área de trabalho.");

}