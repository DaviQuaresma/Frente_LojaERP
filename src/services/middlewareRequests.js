require("dotenv").config();
const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");
const { sendVendaToMiddleware } = require("./sendVendaToMiddleware");
const { getDatabaseConfig } = require("../config/dbControl");

const API_URL = "http://localhost:5000";
const API_DB_URL = "http://localhost:5001/api/database";

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

// 🔐 Busca o token salvo na API local com base no banco ativo
async function carregarTokenLocal() {
  const { ativo } = await getDatabaseConfig();
  if (!ativo) throw new Error("Banco ativo não definido");

  const { data: bancos } = await axios.get(API_DB_URL);
  const banco = bancos.find(b => b.database === ativo);
  if (!banco || !banco.token) throw new Error(`Token não encontrado para banco ativo: ${ativo}`);

  // console.log("[carregarTokenLocal] bancos retornados:", bancos);
  console.log("[carregarTokenLocal] banco ativo:", ativo);
  console.log("[carregarTokenLocal] token encontrado:", banco?.token);

  return banco.token;
}

// 🔄 Salva o token na API e valida ele
async function setToken() {
  try {
    const token = await carregarTokenLocal();

    console.log("[middlewareRequests] 🔑 Token carregado:", token);

    console.log("📨 Enviando token para API...");
    const res = await axios.post(`${API_URL}/api/config/token`, { token });

    console.log("[middlewareRequests] resposta da api:", res.data);

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
