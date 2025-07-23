const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	// Banco
	salvarConfigBanco: (cfg) => ipcRenderer.invoke("salvar-config-banco", cfg),
	getDatabaseConfig: () => ipcRenderer.invoke("getDatabaseConfig"),
	setDatabaseConfig: (cfg) => ipcRenderer.invoke("setDatabaseConfig", cfg),
	setBancoAtivo: (nome) => ipcRenderer.invoke("set-banco-ativo", nome),

	// Info
	getNomeBancoAtivo: () => ipcRenderer.invoke("get-nome-banco-ativo"),
	getEmpresa: () => ipcRenderer.invoke("get-empresa"),

	// Produtos
	buscarProduto: (codigo) => ipcRenderer.invoke("buscar-produto", codigo),
	syncProducts: () => ipcRenderer.invoke("sync-products"),
	cancelSync: () => ipcRenderer.send("cancel-sync"),

	// Vendas
	criarVenda: (valor) => ipcRenderer.invoke("criar-venda", valor),
	listarVendas: (filtros) => ipcRenderer.invoke("listar-vendas", filtros),

	// Token
	testarTokenParaBancoAtivo: (token) => ipcRenderer.invoke("testar-token-para-banco-ativo", token),
});
