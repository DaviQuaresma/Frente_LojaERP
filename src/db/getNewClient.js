/** @format */

const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 📂 Caminho correto para config persistente
const appDataDir = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "frentelojaerp",
  "config"
);
const settingsPath = path.join(appDataDir, "db_settings.json");

// 🔁 Lê a configuração do disco sempre que necessário
function readDbSettings() {
  try {
    if (!fs.existsSync(settingsPath)) {
      throw new Error("Arquivo de configuração de banco não encontrado.");
    }
    const raw = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("❌ Erro ao ler db_settings.json:", err.message);
    return null;
  }
}

// 🔍 Pega os dados do banco ativo
function carregarBancoAtivo() {
  const settings = readDbSettings();

  if (!settings?.ativo || !settings.salvos?.[settings.ativo]) {
    throw new Error("❌ Banco de dados ativo não está definido corretamente.");
  }

  return settings.salvos[settings.ativo];
}

// 🔌 Conecta no banco atual
async function getNewClient() {
  const config = carregarBancoAtivo();
  const client = new Client(config);
  await client.connect();
  return client;
}

// 🔤 Retorna apenas o nome do banco ativo (opcional para exibição)
function getNomeBancoAtivo() {
  const settings = readDbSettings();
  return settings?.ativo || null;
}

module.exports = {
  getNewClient,
  getNomeBancoAtivo,
};
