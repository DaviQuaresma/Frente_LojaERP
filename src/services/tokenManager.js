const axios = require("axios");
require("dotenv").config();

const { getDatabaseConfig, setDatabaseConfig } = require("../config/dbControl");

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_DB_URL = "http://localhost:3001/api/database";

// 🔐 Busca o token salvo na API local com base no banco ativo
async function carregarTokenLocal() {
    const { ativo } = await getDatabaseConfig();
    if (!ativo) throw new Error("Banco ativo não definido");

    const { data: bancos } = await axios.get(API_DB_URL);
    const banco = bancos.find(b => b.database === ativo);
    if (!banco || !banco.token) throw new Error(`Token não encontrado para banco ativo: ${ativo}`);

    console.log("🔑 Banco ativo:", ativo);
    console.log("🔑 Token carregado:", banco.token.substring(0, 10) + "...");

    return banco.token;
}

// ✅ Valida se o token salvo na API está funcional
async function validateToken(token) {
    const response = await axios.get(`${API_URL}/api/validar-token`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return response.data.token;
}

// 🔄 Salva o token na API principal e valida
async function setToken() {
    try {
        const token = await carregarTokenLocal();

        console.log("[tokenManager] 🔑 Token carregado:", token.substring(0, 10) + "...");

        console.log("📨 Enviando token para API...");
        const res = await axios.post(`${API_URL}/api/config/token`, { token });

        if (res.status !== 200 || !res.data) {
            throw new Error(`Falha ao salvar token na API. Status: ${res.status}`);
        }

        const accessToken = await validateToken(token);

        const config = getDatabaseConfig();
        const ativo = config?.ativo;

        if (ativo) {
            setDatabaseConfig({
                salvos: {
                    ...config.salvos,
                    [ativo]: {
                        ...config.salvos[ativo],
                        token: accessToken,
                    },
                },
            });
        }

        console.log(`💾 Token validado e salvo localmente: ${accessToken.substring(0, 10)}...`);
        return accessToken;
    } catch (err) {
        const msg = err?.response?.data || err?.message || err.toString();
        console.error("❌ Erro no setToken:", msg);
        throw new Error(`setToken falhou: ${JSON.stringify(msg)}`);
    }
}

module.exports = { setToken };
