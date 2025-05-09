/** @format */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	getConfig: () => ipcRenderer.invoke("get-config"),
	salvarConfig: (cfg) => ipcRenderer.invoke("save-config", cfg),
	salvarConfigBanco: (cfg) => ipcRenderer.invoke("salvar-config-banco", cfg),
	// listSavedDatabases: () => ipcRenderer.invoke("listar-bancos-salvos"),
	setActiveDatabase: (databaseName) =>
		ipcRenderer.invoke("ativar-banco", databaseName),

	criarVenda: (valor) => ipcRenderer.invoke("criar-venda", valor),
	listarVendas: (filtros) => ipcRenderer.invoke("listar-vendas", filtros),
	buscarProduto: (codigo) => ipcRenderer.invoke("buscar-produto", codigo),
	getEmpresa: () => ipcRenderer.invoke("get-empresa"),
});
