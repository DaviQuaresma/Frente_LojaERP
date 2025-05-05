<!-- @format -->

# 📄 Padronização de Triggers com Proteção contra NULL

## 🧠 Contexto

Ao criar triggers que preenchem automaticamente campos derivados (ex:
`itens_venda`), é comum que erros ocorram quando os campos não aceitam `NULL`,
especialmente em cálculos que dependem de outros valores.

**Erro típico:**

```
ERROR: o valor nulo na coluna "campo_x" da relação "tabela_y" viola a restrição de não-nulo
```

---

## ✅ Boas práticas para evitar erros de NULL

### Use sempre:

```sql
COALESCE(campo, valor_padrao)
```

### Em divisões:

```sql
valor / NULLIF(denominador, 0.001)
```

---

## 🔁 Etapas para blindar qualquer função trigger

1. **Revisar todos os cálculos**.
2. **Envolver todos os campos numéricos com `COALESCE(x, 0)`**.
3. **Proteger divisões com `NULLIF` para evitar divisão por zero**:
   ```sql
   valor / NULLIF(COALESCE(denominador, 0), 0.001)
   ```
4. **Recriar a função com `CREATE OR REPLACE FUNCTION`**.

---

## 💡 Exemplo aplicado

### Evite:

```sql
NEW.ITE_CMV_COM_ICMS := NEW.ITE_VALOR_CUSTO * NEW.ITE_QTD + NEW.ITE_VLR_ICMS;
```

### Use:

```sql
NEW.ITE_CMV_COM_ICMS := (
  COALESCE(NEW.ITE_VALOR_CUSTO, 0) * COALESCE(NEW.ITE_QTD, 0)
  + COALESCE(NEW.ITE_VLR_ICMS, 0)
);
```

### Divisão segura:

```sql
NEW.CAMPO := COALESCE(campo_1, 0) / NULLIF(COALESCE(campo_2, 0), 0.001);
```

---

## 🧩 Tratamento de strings vazias

Para converter string vazia em `NULL`, use:

```sql
NEW.campo_texto := IIF(TRIM(COALESCE(NEW.campo_texto, '')) = '', NULL, NEW.campo_texto);
```

---

## 🛡️ Checklist para blindagem de triggers

| Verificação                           | Status |
| ------------------------------------- | ------ |
| Todos os campos usam `COALESCE(...)`  | ✅     |
| Nenhuma divisão sem `NULLIF(...)`     | ✅     |
| Campos `TEXT` tratados com `TRIM`     | ✅     |
| Função recriada com `OR REPLACE`      | ✅     |
| Trigger recriada com `CREATE TRIGGER` | ✅     |

---

## 📌 Observação

Este padrão deve ser seguido **em todas as novas triggers** que atualizam campos
computados e/ou obrigatórios (`NOT NULL`) para garantir estabilidade e evitar
falhas em produção.
