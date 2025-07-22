/** @format */

const botao = document.getElementById("botaoCriar");
const inputValor = document.getElementById("valor");
const resultado = document.getElementById("resultado");
const erroEstoqueLista = document.getElementById("errosEstoque");
const bancoSelect = document.getElementById("selectBancoSalvo");
const btnAtivarBanco = document.getElementById("btnAtivarBanco");

let paginaAtual = 1;
const limitePorPagina = 10;
let produtosSemEstoque = [];
let conexaoEditando = null;
let modal = null;

// Atualiza nome da empresa no topo
async function atualizarTituloEmpresa() {
	try {
		const config = await window.electronAPI.getDatabaseConfig();
		const nomeBanco = config?.ativo || "Painel ERP";
		document.getElementById("tituloEmpresa").textContent = nomeBanco;
	} catch (e) {
		console.warn("⚠️ Erro ao atualizar nome do banco:", e);
	}
}

// Busca dados de um produto no banco
async function buscarProduto(pro_codigo) {
	try {
		const resultado = await window.electronAPI.buscarProduto(pro_codigo);
		if (resultado?.rows?.length) {
			return resultado.rows[0];
		}
	} catch (e) {
		console.warn("⚠️ Erro ao buscar produto:", e);
	}
	return null;
}

// Processar vendas
botao.addEventListener("click", async () => {
	const valoresStr = inputValor.value;
	resultado.classList.remove("text-danger", "text-success", "text-warning");
	resultado.innerHTML = "";
	erroEstoqueLista.innerHTML = "";
	produtosSemEstoque = [];

	if (!valoresStr.trim()) {
		resultado.innerHTML = "❌ Informe ao menos um valor válido.";
		resultado.classList.add("text-danger");
		return;
	}

	const valores = valoresStr
		.split(",")
		.map((v) => parseFloat(v.trim()))
		.filter((v) => !isNaN(v) && v > 0);

	if (!valores.length) {
		resultado.innerHTML = "❌ Nenhum valor válido detectado.";
		resultado.classList.add("text-danger");
		return;
	}

	botao.disabled = true;
	resultado.innerHTML = "<ul class='list-unstyled'>";

	for (const valor of valores) {
		try {
			const resposta = await window.electronAPI.criarVenda(valor);

			if (resposta?.success === true) {
				resultado.innerHTML += `<li class="text-success">✅ <strong>Venda de R$ ${valor.toFixed(
					2
				)}</strong> criada com sucesso!</li>`;
			} else if (resposta?.semEstoque?.length) {
				produtosSemEstoque.push(...resposta.semEstoque);
				resultado.innerHTML += `<li class="text-warning">⚠️ <strong>Sem estoque</strong> para R$ ${valor.toFixed(
					2
				)}: ${resposta?.message || "Produto(s) insuficientes"}</li>`;

				await window.electronAPI.registrarHistoricoFalha({
					total: valor,
					itens: 0,
					tipo: "falha",
					produtos: resposta.semEstoque?.map((p) => p.descricao) || [],
					data: new Date().toISOString(),
				});
			} else {
				resultado.innerHTML += `<li class="text-danger">❌ <strong>Erro</strong> ao criar R$ ${valor.toFixed(
					2
				)}: ${resposta?.message || "Erro desconhecido"}</li>`;
			}
		} catch (err) {
			resultado.innerHTML += `<li class="text-danger">❌ <strong>Erro inesperado</strong> ao gerar R$ ${valor.toFixed(
				2
			)}: ${err.message || err}</li>`;
		}
	}

	resultado.innerHTML += `</ul><div class="alert alert-success mt-3">✅ <strong>Processamento finalizado.</strong></div>`;
	botao.disabled = false;

	if (produtosSemEstoque.length) {
		const codigosUnicos = [
			...new Set(produtosSemEstoque.map((p) => p.pro_codigo)),
		];

		erroEstoqueLista.innerHTML = `
			<div class="alert alert-warning mt-4">
				<h5 class="mb-3">⚠️ Produtos sem estoque suficiente:</h5>
				<div class="table-responsive">
					<table class="table table-sm table-bordered">
						<thead class="table-light">
							<tr>
								<th>Código</th>
								<th>Descrição</th>
								<th>Estoque atual</th>
							</tr>
						</thead>
						<tbody id="tabelaSemEstoque"></tbody>
					</table>
				</div>
			</div>`;

		const tbody = document.getElementById("tabelaSemEstoque");
		for (const codigo of codigosUnicos) {
			const produto = await buscarProduto(codigo);
			if (produto) {
				tbody.innerHTML += `<tr>
					<td>${produto.pro_codigo}</td>
					<td>${produto.pro_descricao}</td>
					<td>${produto.estoque}</td>
				</tr>`;
			} else {
				tbody.innerHTML += `<tr>
					<td>${codigo}</td>
					<td colspan="2">Produto não encontrado</td>
				</tr>`;
			}
		}
	}

	await carregarHistorico();
});

// Atualiza histórico exibindo também falhas
async function carregarHistorico() {
	const tabela = document.getElementById("tabelaVendas");
	const orderBy = document.getElementById("filtroOrderBy")?.value || "data";
	const direction = document.getElementById("filtroDirection")?.value || "desc";

	tabela.innerHTML = `<tr><td colspan="4" class="text-center">Carregando...</td></tr>`;

	try {
		const { total, vendas } = await window.electronAPI.listarVendas({
			orderBy,
			direction,
			page: paginaAtual,
			limit: limitePorPagina,
		});

		if (!vendas.length) {
			tabela.innerHTML = `<tr><td colspan="4" class="text-center">Nenhuma venda encontrada.</td></tr>`;
			return;
		}

		tabela.innerHTML = vendas
			.map((v) => {
				if (v.tipo === "falha") {
					return `
					<tr class="table-warning">
						<td>⚠️</td>
						<td>R$ ${v.total.toFixed(2)}</td>
						<td colspan="2">Falha: sem estoque para ${v.produtos?.join(", ")}</td>
					</tr>`;
				} else {
					return `
					<tr>
						<td>${v.id}</td>
						<td>R$ ${v.total}</td>
						<td>${v.qtdItens}</td>
						<td>${v.data}</td>
					</tr>`;
				}
			})
			.join("");

		renderizarPaginacao(total);
	} catch (err) {
		console.error(err);
		tabela.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Erro ao carregar histórico.</td></tr>`;
	}
}

// 🔢 Paginação
function renderizarPaginacao(total) {
	const container = document.getElementById("paginacaoContainer");
	const totalPaginas = Math.ceil(total / limitePorPagina);

	let html = "";

	if (paginaAtual > 1) {
		html += `<button class="btn btn-sm btn-outline-primary me-2" onclick="mudarPagina(${paginaAtual - 1
			})">Anterior</button>`;
	}

	for (let i = 1; i <= totalPaginas; i++) {
		html += `<button class="btn btn-sm ${i === paginaAtual ? "btn-primary" : "btn-outline-secondary"
			} mx-1" onclick="mudarPagina(${i})">${i}</button>`;
	}

	if (paginaAtual < totalPaginas) {
		html += `<button class="btn btn-sm btn-outline-primary ms-2" onclick="mudarPagina(${paginaAtual + 1
			})">Próxima</button>`;
	}

	container.innerHTML = html;
}

window.mudarPagina = function (novaPagina) {
	paginaAtual = novaPagina;
	carregarHistorico();
};

// 🧭 Inicializa
carregarHistorico();
atualizarTituloEmpresa();

document.getElementById('btnSyncProducts').addEventListener('click', async () => {
	const btn = document.getElementById('btnSyncProducts');
	const status = document.getElementById('syncStatus');

	btn.disabled = true;
	status.textContent = '🔄 Sincronizando produtos...';

	try {
		const result = await window.electronAPI.syncProducts();
		if (result.ok) {
			status.textContent = '✅ Produtos sincronizados com sucesso!';
			status.classList.remove('text-danger');
			status.classList.add('text-success');
		} else {
			status.textContent = `❌ Erro: ${result.error || 'Falha desconhecida'}`;
			status.classList.remove('text-success');
			status.classList.add('text-danger');
		}
	} catch (err) {
		status.textContent = `❌ Erro inesperado: ${err.message}`;
		status.classList.add('text-danger');
	} finally {
		btn.disabled = false;
	}
});

document.addEventListener("DOMContentLoaded", () => {
	const btnNovaConexao = document.getElementById("btnNovaConexao");
	const modalConexao = document.getElementById("modalConexao");

	if (btnNovaConexao && modalConexao) {
		modalInstance = new bootstrap.Modal(modalConexao);
		btnNovaConexao.addEventListener("click", () => {
			console.log("🟢 Abrindo modal...");
			modalInstance.show();
		});
	}
});

document.addEventListener("DOMContentLoaded", () => {
	const btnNovaConexao = document.getElementById("btnNovaConexao");
	const modalEl = document.getElementById("modalConexao");
	const btnSalvar = document.getElementById("btnSalvarConexao");
	const listaBancosDiv = document.getElementById("listaBancos");

	modal = bootstrap.Modal.getOrCreateInstance(modalEl);

	function resetarFormularioConexao() {
		[
			"input-name",
			"input-host",
			"input-port",
			"input-user",
			"input-password",
			"input-database",
			"input-token",
		].forEach((id) => (document.getElementById(id).value = ""));
	}

	btnNovaConexao.addEventListener("click", () => {
		resetarFormularioConexao();
		modal.show();
	});

	modalEl.addEventListener("hidden.bs.modal", () => {
		resetarFormularioConexao();
	});

	btnSalvar.addEventListener("click", async () => {
		const novaConexao = {
			name: document.getElementById("input-name").value.trim(),
			host: document.getElementById("input-host").value.trim(),
			port: Number(document.getElementById("input-port").value),
			user: document.getElementById("input-user").value.trim(),
			password: document.getElementById("input-password").value.trim(),
			database: document.getElementById("input-database").value.trim(),
			token: document.getElementById("input-token").value.trim(),
		};

		try {
			let res;
			if (conexaoEditando) {
				// Modo edição
				res = await fetch(`http://localhost:3001/api/database/${conexaoEditando.id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(novaConexao),
				});
			} else {
				// Modo criação
				res = await fetch("http://localhost:3001/api/database", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(novaConexao),
				});
			}

			const data = await res.json();

			if (res.ok) {
				modal.hide();
				await carregarListaDeConexoes();
				conexaoEditando = null; // reset
			} else {
				alert("Erro: " + (data.message || data.error));
			}
		} catch (err) {
			alert("Erro ao salvar conexão.");
			console.error(err);
		}
	});

	async function carregarListaDeConexoes() {
		try {
			const res = await fetch("http://localhost:3001/api/database");
			const lista = await res.json();
			listaBancosDiv.innerHTML = "";

			if (!Array.isArray(lista) || lista.length === 0) {
				listaBancosDiv.innerHTML = `<p class="text-muted text-center">Nenhuma conexão salva.</p>`;
				return;
			}

			lista.forEach((conexao, i) => {
				const div = document.createElement("div");
				div.className = "border rounded p-2 mb-2 d-flex justify-content-between align-items-center";
				div.innerHTML = `
					<div>
						<strong>${conexao.name}</strong><br>
						<small>${conexao.host}:${conexao.port}</small>
					</div>
					<div class="d-flex gap-2">
						<button class="btn btn-sm btn-outline-secondary" onclick="editarConexao(${i})">✏️</button>
						<button class="btn btn-sm btn-outline-danger" onclick="deletarConexao('${conexao.id}')">🗑️</button>
					</div>
				`;
				listaBancosDiv.appendChild(div);
			});
		} catch (err) {
			listaBancosDiv.innerHTML = `<p class="text-danger">Erro ao carregar conexões</p>`;
			console.error(err);
		}
	}

	carregarListaDeConexoes();
});

// Globais
async function deletarConexao(id) {
	if (!confirm("Tem certeza que deseja excluir esta conexão?")) return;
	try {
		await fetch(`http://localhost:3001/api/database/${id}`, { method: "DELETE" });
		location.reload();
	} catch (err) {
		alert("Erro ao deletar conexão.");
	}
}

function editarConexao(index) {
	fetch("http://localhost:3001/api/database")
		.then(res => res.json())
		.then(lista => {
			const conexao = lista[index];
			if (!conexao) return alert("Conexão não encontrada.");

			// Preencher campos
			document.getElementById("input-name").value = conexao.name || "";
			document.getElementById("input-host").value = conexao.host || "";
			document.getElementById("input-port").value = conexao.port || "";
			document.getElementById("input-user").value = conexao.user || "";
			document.getElementById("input-password").value = conexao.password || "";
			document.getElementById("input-database").value = conexao.database || "";
			document.getElementById("input-token").value = conexao.token || "";

			// Marcar que estamos editando
			conexaoEditando = conexao;

			if (!modal) {
				alert("Modal ainda não está pronto. Tente novamente.");
				return;
			}

			// Abrir modal
			modal.show();
		})
		.catch(err => {
			console.error("Erro ao buscar conexão:", err);
			alert("Erro ao carregar dados da conexão.");
		});
}
