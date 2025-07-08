require("dotenv").config();

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getVendaById, getItensVendaByPedido } = require("../utils/dbCommands");
const { sendVendaToMiddleware } = require("./sendVendaToMiddleware");

const API_URL = process.env.API_URL;

// 📦 Envia venda + itens para o middleware
async function VendaMiddleware(connection, vendaId) {
  const venda = await getVendaById(connection, vendaId);
  const itens = await getItensVendaByPedido(connection, vendaId);

  return await sendVendaToMiddleware(venda, itens);
}

// ✅ Valida se o token salvo na API está funcional
async function validateToken() {
  try {
    const response = await axios.get(`${API_URL}/api/validar-token`);
    console.log("✅ Token válido:", response.data.token);
    return response.data.token;
  } catch (error) {
    const msg = error?.response?.data || error.message;
    console.error("❌ Erro ao validar token:", msg);
    throw new Error(`Falha ao validar token: ${JSON.stringify(msg)}`);
  }
}

// 🔐 Carrega o token local salvo no Electron
function carregarTokenLocal() {
  const tokenPath = path.resolve(__dirname, "../main/config/token.json");

  if (!fs.existsSync(tokenPath)) {
    throw new Error("Arquivo token.json não encontrado");
  }

  const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

  if (!tokenData.token) {
    throw new Error("Token não encontrado no arquivo token.json");
  }

  return tokenData.token;
}

// 🔄 Salva o token na API e valida ele
async function setToken() {
  try {
    const token = carregarTokenLocal();

    console.log("📨 Enviando token para API...");
    const res = await axios.post(`http://localhost:3000/api/config/token`, { token: token });

    if (res.status !== 200) {
      throw new Error(`Falha ao salvar token na API. Status: ${res.status}`);
    }

    console.log("💾 Token salvo na API com sucesso!");

    const accessToken = await validateToken();
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
  setToken
};
