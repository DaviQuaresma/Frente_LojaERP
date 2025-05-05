/** @format */

const path = require("path");
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const fs = require("fs");
const { Client } = require("pg");

const {
	salvarConfigBanco,
	listarBancosSalvos,
	setBancoAtivo,
} = require("../db/configService");
const { createSale } = require(path.join(
	__dirname,
	"../services/salesService"
));
const { getNewClient } = require("../db/getNewClient");

const userDataPath = app.getPath("userData");
const configPath = path.join(userDataPath, "config.json");
const iconPath = path.join(__dirname, "../../logo.png");

if (!fs.existsSync(configPath)) {
	fs.writeFileSync(
		configPath,
		JSON.stringify({ active: "demonstracao" }, null, 2)
	);
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1000,
		height: 800,
		icon: iconPath, // ← aqui define o ícone da janela
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, "../renderer/preload.js"),
			sandbox: false, // opcionalmente true
		},
	});

	win.loadFile(path.join(__dirname, "../renderer/index.html"));
	// win.webContents.openDevTools();
}

ipcMain.handle("salvar-config-banco", async (_event, config) => {
	try {
		const connection = new Client(config);
		await connection.connect();
		await connection.end();

		salvarConfigBanco(config);
		console.log("🧩 Configuração salva:", config);
		return { success: true };
	} catch (err) {
		console.error("Erro ao salvar conexão:", err);
		return { success: false, error: err.message };
	}
});

ipcMain.handle("listar-bancos-salvos", () => {
	try {
		return listarBancosSalvos();
	} catch (err) {
		console.error("Erro ao listar bancos salvos:", err);
		return [];
	}
});

ipcMain.handle("ativar-banco", (_event, nome) => {
	try {
		setBancoAtivo(nome);
		return { success: true };
	} catch (err) {
		console.error("Erro ao ativar banco:", err);
		return { success: false, message: err.message };
	}
});

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("criar-venda", async (_event, valorAlvo) => {
	try {
		console.log("📅 Valor recebido no handler:", valorAlvo);
		await createSale(parseFloat(valorAlvo));
		console.log("✅ Finalizou createSale");
		return { success: true, message: "Venda criada com sucesso!" };
	} catch (err) {
		const errorMessage = `Erro ao criar venda: ${err?.message || err}`;
		console.error("❌", errorMessage);
		return { success: false, message: errorMessage };
	}
});

ipcMain.handle(
	"listar-vendas",
	async (
		_event,
		{ orderBy = "data", direction = "desc", page = 1, limit = 10 } = {}
	) => {
		try {
			const connection = await getNewClient();

			// Sanitização básica
			const orderColumns = ["total", "data"];
			const orderCol = orderColumns.includes(orderBy) ? orderBy : "data";
			const dir = direction.toLowerCase() === "asc" ? "ASC" : "DESC";

			const offset = (page - 1) * limit;

			const result = await connection.query(
				`
				SELECT id, ven_cod_pedido, total, data, jsonb_array_length(itens) as qtdItens
				FROM vendas_inserted
				ORDER BY ${orderCol} ${dir}
				LIMIT $1 OFFSET $2
			`,
				[limit, offset]
			);

			const totalResult = await connection.query(
				`SELECT COUNT(*) FROM vendas_inserted`
			);
			const total = parseInt(totalResult.rows[0].count, 10);

			await connection.end();

			return {
				total,
				vendas: result.rows.map((v) => ({
					id: v.ven_cod_pedido,
					total: parseFloat(v.total).toFixed(2),
					data: new Date(v.data).toLocaleString("pt-BR"),
					qtdItens: v.qtditens,
				})),
			};
		} catch (err) {
			console.error("Erro ao buscar histórico no banco:", err);
			return { total: 0, vendas: [] };
		}
	}
);

ipcMain.handle("get-config", () => {
	try {
		if (!fs.existsSync(configPath)) return {};
		const content = fs.readFileSync(configPath, "utf-8");
		return JSON.parse(content);
	} catch (err) {
		console.error("Erro ao ler config.json:", err);
		return {};
	}
});

ipcMain.handle("save-config", (_e, cfg) => {
	try {
		fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
		return { success: true };
	} catch (err) {
		console.error("Erro ao salvar config.json:", err);
		return { success: false, message: err.message };
	}
});

ipcMain.handle("selecionar-pasta-exportacao", async () => {
	try {
		const result = await dialog.showOpenDialog({
			properties: ["openDirectory"],
		});
		if (result.canceled || !result.filePaths.length) return null;
		return result.filePaths[0];
	} catch (err) {
		console.error("❌ Erro ao selecionar pasta:", err);
		return null;
	}
});

ipcMain.handle("get-empresa", async () => {
	try {
		const client = await getNewClient();
		const result = await client.query(
			"SELECT emp_nomefantasia FROM empresa LIMIT 1"
		);
		await client.end();

		if (result.rows.length > 0) {
			return { success: true, nome: result.rows[0].emp_nomefantasia };
		} else {
			return { success: false, message: "Empresa não encontrada." };
		}
	} catch (err) {
		console.error("Erro ao buscar empresa:", err);
		return { success: false, message: err.message || "Erro desconhecido" };
	}
});

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
