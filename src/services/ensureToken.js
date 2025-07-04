const fs = require("fs");
const path = require("path");
const { validateToken, setToken } = require("./middlewwareRequests");

async function ensureToken() {
    try {
        const token = await validateToken();
        return token;
    } catch (err) {
        console.warn("[Token] Token expirado. Renovando...");

        try {
            const configPath = path.resolve(__dirname, "../config/config.json");
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            const baseToken = config.egestorToken;

            if (!baseToken) throw new Error("Token base não encontrado em config.json");

            const tokenRenovado = await setToken(baseToken);
            console.log("[Token] Novo token válido:", tokenRenovado);

            return tokenRenovado;
        } catch (renovacaoErro) {
            console.error("[Token] Falha ao renovar token:", renovacaoErro.message);
            throw renovacaoErro;
        }
    }
}

module.exports = { ensureToken };
