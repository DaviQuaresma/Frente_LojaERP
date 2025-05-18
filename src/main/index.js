/** @format */

const path = require("path");
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const { Client } = require("pg");

const { getAmbienteAtual, setAmbiente } = require("../config/envControl");
const { getDatabaseConfig, setDatabaseConfig } = require("../config/dbControl");

const { createSale } = require("../services/salesService");
const { getNewClient } = require("../db/getNewClient");
const { getNomeBancoAtivo } = require("../db/getNewClient");

const iconPath = path.join(__dirname, "../../logo.png");

function createWindow() {
	const win = new BrowserWindow({
		width: 1000,
		height: 800,
		icon: iconPath,
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, "../renderer/preload.js"),
			sandbox: false,
		},
	});

	win.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

// 🌐 Ambiente
ipcMain.handle("getAmbienteAtual", () => getAmbienteAtual());
ipcMain.handle("setAmbiente", (_, valor) => setAmbiente(valor));

// 🔐 Certificado
ipcMain.handle("selecionar-certificado", async () => {
	const win = BrowserWindow.getFocusedWindow();

	const result = await dialog.showOpenDialog(win, {
		title: "Selecionar Certificado A1",
		filters: [{ name: "Certificados A1", extensions: ["p12"] }],
		properties: ["openFile"],
	});

	if (result.canceled || result.filePaths.length === 0) return null;

	return result.filePaths[0];
});

ipcMain.handle("definir-certificado", (_event, dados) => {
	global.certificadoAtivo = {
		caminho: dados.caminho,
		senha: dados.senha,
	};
	console.log("✅ Certificado definido:", global.certificadoAtivo);
	return { success: true };
});

// 🔌 Banco
ipcMain.handle("getDatabaseConfig", () => getDatabaseConfig());
ipcMain.handle("setDatabaseConfig", (_, novaCfg) => setDatabaseConfig(novaCfg));

ipcMain.handle("salvar-config-banco", async (_event, config) => {
	try {
		const connection = new Client(config);
		await connection.connect();
		await connection.end();
		console.log("✅ Conexão testada com sucesso:", config);
		return { success: true };
	} catch (err) {
		console.error("❌ Erro ao testar conexão:", err);
		return { success: false, error: err.message };
	}
});

ipcMain.handle("get-empresa", async () => {
	try {
		const client = await getNewClientFromDbSettings();
		const result = await client.query(
			"SELECT emp_nomefantasia FROM empresa LIMIT 1"
		);
		await client.end();

		if (result.rows.length > 0) {
			return {
				success: true,
				nome: result.rows[0].emp_nomefantasia,
			};
		} else {
			return { success: false, message: "Empresa não encontrada." };
		}
	} catch (err) {
		console.error("Erro ao buscar empresa:", err);
		return { success: false, message: err.message };
	}
});

ipcMain.handle("get-nome-banco-ativo", () => {
	return getNomeBancoAtivo();
});

// 🛒 Venda
ipcMain.handle("criar-venda", async (_event, valorAlvo) => {
	try {
		console.log("📅 Valor recebido no handler:", valorAlvo);
		await createSale(parseFloat(valorAlvo));
		console.log("✅ Finalizou createSale");
		return { success: true, message: "Venda criada com sucesso!" };
	} catch (err) {
		console.error("❌ Erro ao criar venda:", err);
		return { success: false, message: err.message || "Erro desconhecido" };
	}
});

// 📜 Histórico
ipcMain.handle(
	"listar-vendas",
	async (
		_event,
		{ orderBy = "data", direction = "desc", page = 1, limit = 10 } = {}
	) => {
		try {
			const client = await getNewClient();
			const offset = (page - 1) * limit;
			const orderColumns = ["total", "data"];
			const col = orderColumns.includes(orderBy) ? orderBy : "data";
			const dir = direction.toLowerCase() === "asc" ? "ASC" : "DESC";

			const vendas = await client.query(
				`
			SELECT id, ven_cod_pedido, total, data, jsonb_array_length(itens) as qtdItens
			FROM vendas_inserted
			ORDER BY ${col} ${dir}
			LIMIT $1 OFFSET $2
		`,
				[limit, offset]
			);

			const total = await client.query(`SELECT COUNT(*) FROM vendas_inserted`);
			await client.end();

			return {
				total: parseInt(total.rows[0].count, 10),
				vendas: vendas.rows.map((v) => ({
					id: v.ven_cod_pedido,
					total: parseFloat(v.total).toFixed(2),
					data: new Date(v.data).toLocaleString("pt-BR"),
					qtdItens: v.qtditens,
				})),
			};
		} catch (err) {
			console.error("Erro ao buscar histórico:", err);
			return { total: 0, vendas: [] };
		}
	}
);

// 🔎 Buscar produto
ipcMain.handle("buscar-produto", async (_, codigo) => {
	try {
		const client = await getNewClient();
		const result = await client.query(
			"SELECT pro_codigo, pro_descricao, estoque FROM produtos WHERE pro_codigo = $1",
			[codigo]
		);
		await client.end();
		return result;
	} catch (err) {
		console.error("Erro ao buscar produto:", err);
		return { rows: [], error: err.message };
	}
});
