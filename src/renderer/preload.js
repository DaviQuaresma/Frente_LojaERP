const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	// 🔌 Banco
	getDatabaseConfig: () => ipcRenderer.invoke("getDatabaseConfig"),
	setDatabaseConfig: (cfg) => ipcRenderer.invoke("setDatabaseConfig", cfg),
	getNomeBancoAtivo: () => ipcRenderer.invoke("get-nome-banco-ativo"),

	// 🛒 Vendas
	criarVenda: (valor) => ipcRenderer.invoke("criar-venda", valor),
	listarVendas: (filtros) => ipcRenderer.invoke("listar-vendas", filtros),

	// 🔎 Produtos e Empresa
	buscarProduto: (codigo) => ipcRenderer.invoke("buscar-produto", codigo),
	getEmpresa: () => ipcRenderer.invoke("get-empresa"),
	syncProducts: () => ipcRenderer.invoke("sync-products"),

	// 🔐 Token junto ao banco ativo
	testarTokenParaBancoAtivo: (token) => ipcRenderer.invoke("testar-token-para-banco-ativo", token),
	salvarTokenParaBancoAtivo: (token) => ipcRenderer.invoke("salvar-token-para-banco-ativo", token),

	// 💾 Salvar nova conexão
	salvarNovaConexao: (conexao) => ipcRenderer.invoke("salvar-nova-conexao", conexao),

});
