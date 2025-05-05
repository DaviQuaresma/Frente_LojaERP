/** @format */

const { createSale } = require("../src/services/salesService");
const fs = require("fs");
const path = require("path");

jest.mock("../src/db/connection", () => ({
	query: jest.fn(),
}));

const client = require("../src/db/connection");

// Para simular getAvailableProducts
jest.mock("../src/services/stockService", () => ({
	getAvailableProducts: jest.fn(() =>
		Promise.resolve([
			{ pro_codigo: 13, descricao: "Produto Teste", preco: 35, estoque: 10 },
		])
	),
}));

describe("Sales Service", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("deve criar uma venda válida sem erros", async () => {
		client.query
			.mockResolvedValueOnce({}) // BEGIN
			.mockResolvedValueOnce({ rows: [{ ven_cod_pedido: 1 }] }) // Insert venda
			.mockResolvedValueOnce({ rows: [{ estoque_auxiliar: 10 }] }) // Select estoque
			.mockResolvedValueOnce({ rows: [{ novo_codigo: 1000 }] }) // Nextval codigo item
			.mockResolvedValue({}) // Insert item
			.mockResolvedValue({}) // Update estoque
			.mockResolvedValue({}); // COMMIT

		await expect(createSale(40)).resolves.not.toThrow();
	});

	it("deve inserir venda e item corretamente", async () => {
		client.query
			.mockResolvedValueOnce({}) // BEGIN
			.mockResolvedValueOnce({ rows: [{ ven_cod_pedido: 2 }] }) // Insert venda
			.mockResolvedValueOnce({ rows: [{ estoque_auxiliar: 10 }] }) // Select estoque
			.mockResolvedValueOnce({ rows: [{ novo_codigo: 1001 }] }) // Nextval codigo item
			.mockResolvedValue({}) // Insert item
			.mockResolvedValue({}) // Update estoque
			.mockResolvedValue({}); // COMMIT

		await createSale(40);

		expect(client.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO vendas"),
			expect.any(Array)
		);
		expect(client.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO itens_venda"),
			expect.any(Array)
		);
	});

	it("deve realizar rollback se não for possível montar uma venda", async () => {
		// Mock forçar getAvailableProducts a retornar produtos sem estoque
		jest
			.spyOn(require("../src/services/stockService"), "getAvailableProducts")
			.mockResolvedValue([
				{
					pro_codigo: 1,
					descricao: "Produto Sem Estoque",
					preco: 50.0,
					estoque: 0,
				},
			]);

		const rollbackSpy = jest.spyOn(client, "query");

		await createSale(40.0);

		// Verifica se foi chamado o ROLLBACK
		const rollbackChamado = rollbackSpy.mock.calls.some(
			(call) => call[0] === "ROLLBACK"
		);
		expect(rollbackChamado).toBe(true);

		rollbackSpy.mockRestore();
	});
});
