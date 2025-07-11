require("dotenv").config();

const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");
const { sendVendaToMiddleware } = require("./sendVendaToMiddleware");
const { getDatabaseConfig } = require("../config/dbControl");

const API_URL = process.env.API_URL;

// 📦 Envia venda + itens para o middleware
async function VendaMiddleware(connection, vendaId) {
  const venda = await getVendaById(connection, vendaId);
  const itens = await getItensVendaByPedido(connection, vendaId);

  return await sendVendaToMiddleware(venda, itens);
}

// ✅ Valida se o token salvo na API está funcional
async function validateToken(token) {
  try {
    const response = await axios.get(`${API_URL}/api/validar-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("✅ Token válido:", response.data.token);
    return response.data.token;
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error("❌ Erro ao validar token:", msg);
    throw new Error(`Falha ao validar token: ${JSON.stringify(msg)}`);
  }
}

// 🔐 Carrega o token salvo no config ativo
async function carregarTokenLocal() {
  const config = await getDatabaseConfig();
  const ativo = config?.ativo;
  const token = config?.salvos?.[ativo]?.token;

  if (!token) {
    throw new Error("Token não encontrado na configuração do banco ativo");
  }

  return token;
}

// 🔄 Salva o token na API e valida ele
async function setToken() {
  try {
    const token = await carregarTokenLocal();

    console.log("📨 Enviando token para API...");
    const res = await axios.post(`${API_URL}/api/config/token`, { token });

    if (res.status !== 200) {
      throw new Error(`Falha ao salvar token na API. Status: ${res.status}`);
    }

    console.log("💾 Token salvo na API com sucesso!");

    const accessToken = await validateToken(token);
    return accessToken;
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error("❌ Erro no setToken:", msg);
    throw new Error(`setToken falhou: ${JSON.stringify(msg)}`);
  }
}

module.exports = {
  VendaMiddleware,
  validateToken,
  setToken,
};
