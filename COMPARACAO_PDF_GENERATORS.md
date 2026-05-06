# PDF Generator — Puppeteer vs ReportLab

## 📋 Visão Geral

Foram implementadas **duas soluções** para geração de PDF de Ordem de Serviço/Orçamento:

1. **Puppeteer (Node.js)** — Backend integrado ao NestJS
2. **ReportLab (Python)** — Script standalone para comparação

---

## 🔧 **Instalação & Configuração**

### **1. Puppeteer (Node.js)**

#### Instalação de dependências:
```bash
cd backend
npm install puppeteer
```

#### Arquivos criados:
- `backend/src/service-orders/pdf.service.ts` — Serviço de geração
- `backend/src/service-orders/templates/os-template.html` — Template HTML
- Endpoint: `GET /service-orders/:id/pdf/puppeteer` — Teste

#### Uso na API:
```bash
# Gerar PDF de uma OS com Puppeteer
curl -X GET http://localhost:3000/service-orders/{osId}/pdf/puppeteer \
  -H "Authorization: Bearer {token}" \
  --output os_puppeteer.pdf
```

**Tecnologia:** Headless Chromium renderizando HTML/CSS para PDF

---

### **2. ReportLab (Python)**

#### Instalação:
```bash
pip install reportlab
```

#### Arquivo criado:
- `backend/scripts/generate_os_reportlab.py` — Script standalone

#### Uso:
```bash
# Gerar PDF de exemplo
python backend/scripts/generate_os_reportlab.py --output os_example_reportlab.pdf

# Com dados customizados
python backend/scripts/generate_os_reportlab.py --output output.pdf
```

**Tecnologia:** Renderização programática (sem browser)

---

## 📊 **Comparação**

| Critério | Puppeteer | ReportLab |
|----------|-----------|-----------|
| **Integração** | ✅ Native NestJS | ⚠️ Script separado |
| **Linguagem** | Node.js | Python |
| **Performance** | ⚠️ ~3-5s (browser headless) | ✅ ~0.5-1s (direto) |
| **Memória** | ⚠️ Alto (browser) | ✅ Baixo |
| **Qualidade do PDF** | ✅ Perfeita (renderiza como web) | ✅ Excelente |
| **Customização HTML/CSS** | ✅ Completa | ⚠️ Limitada (código) |
| **Escalabilidade** | ⚠️ Pooling necessário | ✅ Sem estado |
| **Railway/Container** | ⚠️ Headless precisa flags extras | ✅ Leve |
| **Manutenção** | ✅ Stack único | ⚠️ Requer Python |
| **Custo Memória Railway** | ⚠️ +50-100MB | ✅ +10-20MB |

---

## 🚀 **Próximos Passos**

### **Para testar Puppeteer:**

1. Instalar dependências:
   ```bash
   cd backend && npm install
   ```

2. Build do backend:
   ```bash
   npm run build
   ```

3. Iniciar servidor:
   ```bash
   npm run start:dev
   ```

4. Testar com uma OS existente:
   ```bash
   curl http://localhost:3000/service-orders/{osId}/pdf/puppeteer \
     -H "Authorization: Bearer {seu_token_jwt}" \
     --output test.pdf
   ```

### **Para testar ReportLab:**

1. Instalar:
   ```bash
   pip install reportlab
   ```

2. Gerar PDF de teste:
   ```bash
   python backend/scripts/generate_os_reportlab.py --output test_reportlab.pdf
   ```

3. Verificar output nos arquivos gerados

---

## 💡 **Recomendação Final**

### **Escolher Puppeteer se:**
- ✅ Quer integração perfeita com NestJS
- ✅ Template HTML/CSS é prioridade
- ✅ Qualidade visual é crítica
- ✅ Está OK com +100MB de memória

### **Escolher ReportLab se:**
- ✅ Precisa de máxima performance
- ✅ Memória é crítica (Railway pequeno)
- ✅ Já tem scripts Python no projeto
- ✅ PDF programático é suficiente

---

## 📝 **Estrutura de Dados Esperada**

A OS deve ter:
```typescript
{
  id: string
  tenantId: string
  customer: {
    name: string
    document?: string
    phone?: string
    address?: string
  }
  vehicle: {
    brand?: string
    model?: string
    year?: number
    plate?: string
    vin?: string
    km?: number
  }
  items: [{
    type: 'service' | 'part'
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }]
  totalParts: number
  totalServices: number
  totalLabor: number
  totalDiscount: number
  status: string
  complaint?: string
  diagnosis?: string
  observations?: string
}
```

---

## 🐛 **Troubleshooting**

### Puppeteer não inicia no Railway:

Se receber erro `Protocol error`, adicionar args no `pdf.service.ts`:
```typescript
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
  ],
});
```

### ReportLab não encontra fonts:

Instalar fonts TrueType:
```bash
pip install reportlab-fonts
```

---

## 📦 **Deployment Railway**

### Puppeteer:
- Já instalado via npm
- Precisa 500MB+ disco para Chromium
- Considerar layer de cache

### ReportLab:
- Adicionar `requirements.txt`:
  ```
  reportlab==4.0.9
  ```
- Instalar na build:
  ```dockerfile
  RUN pip install -r requirements.txt
  ```

---

## ✅ **Checklist de Testes**

- [ ] Puppeteer: Gerar PDF com sucesso
- [ ] Puppeteer: Verificar layout visual
- [ ] ReportLab: Gerar PDF com sucesso
- [ ] ReportLab: Verificar performance
- [ ] Ambos: Validar dados da OS no PDF
- [ ] Ambos: Testar com dados reais do banco
- [ ] Ambos: Comparar tempo de geração
- [ ] Ambos: Validar em navegador
