/** @format */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	// 🔐 Certificado
	getP12: () => ipcRenderer.invoke("get-p12"),
	selecionarCertificado: () => ipcRenderer.invoke("selecionar-certificado"),
	definirCertificado: (dados) =>
		ipcRenderer.invoke("definir-certificado", dados),

	// 🌐 Ambiente
	getAmbienteAtual: () => ipcRenderer.invoke("getAmbienteAtual"),
	setAmbiente: (valor) => ipcRenderer.invoke("setAmbiente", valor),

	// 🔌 Banco
	salvarConfigBanco: (cfg) => ipcRenderer.invoke("salvar-config-banco", cfg),
	getDatabaseConfig: () => ipcRenderer.invoke("getDatabaseConfig"),
	setDatabaseConfig: (cfg) => ipcRenderer.invoke("setDatabaseConfig", cfg),
	getNomeBancoAtivo: () => ipcRenderer.invoke("get-nome-banco-ativo"),

	// 🛒 Vendas
	criarVenda: (valor) => ipcRenderer.invoke("criar-venda", valor),
	listarVendas: (filtros) => ipcRenderer.invoke("listar-vendas", filtros),

	// 🔎 Produtos e Empresa
	buscarProduto: (codigo) => ipcRenderer.invoke("buscar-produto", codigo),
	getEmpresa: () => ipcRenderer.invoke("get-empresa"),
});
