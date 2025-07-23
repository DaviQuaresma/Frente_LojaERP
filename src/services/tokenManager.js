const axios = require("axios");
require("dotenv").config();

const { getDatabaseConfig, setDatabaseConfig } = require("../config/dbControl");

const API_URL = process.env.API_URL || "http://localhost:3000";
const API_BANCOS = "http://localhost:3001/api/database";

// Busca o token do banco ativo via API 1
async function carregarTokenRemoto() {
    const config = getDatabaseConfig();
    const ativo = config?.ativo;
    if (!ativo) throw new Error("Nenhum banco ativo está selecionado.");

    const { data: bancos } = await axios.get(API_BANCOS);
    const banco = bancos.find(b => b.nome === ativo || b.database === ativo);

    if (!banco?.token) {
        throw new Error(`Token não encontrado para banco "${ativo}"`);
    }

    console.log(`🔑 Banco ativo: ${ativo}`);
    console.log(`🔑 Token carregado: ${banco.token.substring(0, 10)}...`);

    return banco.token;
}

async function validateToken(token) {
    const response = await axios.get(`${API_URL}/api/validar-token`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.token;
}

async function setToken() {
    try {
        const token = await carregarTokenRemoto();

        console.log("📨 Enviando token para API 2...");
        const res = await axios.post(`${API_URL}/api/config/token`, { token });

        if (res.status !== 200) {
            throw new Error(`Falha ao salvar token na API 2. Status: ${res.status}`);
        }

        const accessToken = await validateToken(token);

        // Salva o novo token validado localmente (opcional)
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
