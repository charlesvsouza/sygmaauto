# Evolution API — Guia de Integração

## Status atual (2026-05-03)

- **Código:** reescrito para Evolution API (commit `cef1c14`) — deploy feito no Railway.
- **Tela do WhatsApp:** apareceu uma vez mas foi fechada antes de escanear.
- **Próximo passo:** clicar em **Gerar QR Code** novamente em `sigmaauto.com.br/whatsapp`.

> Se o QR aparecer, escanear com o celular e pronto.
> Se não aparecer (erro ou timeout), seguir a **Seção 2 — Limpeza**.

---

## 1. Variáveis de ambiente obrigatórias (Railway → serviço backend)

| Variável | Descrição | Exemplo |
|---|---|---|
| `EVOLUTION_API_URL` | URL pública do servidor Evolution API | `https://evolution.seudominio.com` |
| `EVOLUTION_API_KEY` | Global API Key (configurada no servidor) | `B6D711FCDE4D4FD5936544120E713976` |
| `EVOLUTION_INSTANCE` | Nome da instância WhatsApp | `sygmaauto` |
| `BACKEND_PUBLIC_URL` | URL pública do backend (para webhook) | `https://sygmaauto-api-production.up.railway.app` |

---

## 2. Limpeza — faça se o QR não aparecer

### Passo 1 — Deletar instância via API

```bash
curl -X DELETE https://SEU_EVOLUTION_URL/instance/delete/sygmaauto \
  -H "apikey: SUA_GLOBAL_API_KEY"
```

### Passo 2 — Limpar arquivos de sessão no servidor

Acesse o shell do serviço Evolution API no Railway:

```bash
# Localizar pasta de sessão (tente os dois caminhos)
ls /evolution/instances/
ls /app/instances/

# Deletar pasta da instância
rm -rf /evolution/instances/sygmaauto
# ou
rm -rf /app/instances/sygmaauto
```

> Se não tiver acesso ao shell, faça **Restart** no serviço Evolution API no Railway.
> O restart limpa sessões em memória mas não necessariamente os arquivos em disco.

### Passo 3 — Reiniciar o serviço Evolution API

No Railway → serviço Evolution API → botão **Restart**.

### Passo 4 — Aguardar 5 minutos

Necessário para o WhatsApp liberar o IP após múltiplas tentativas anteriores.

---

## 3. Recriação — após a limpeza

### Passo 1 — Confirmar variáveis no Railway (backend)

Verifique se as 4 variáveis da seção 1 estão configuradas corretamente.

### Passo 2 — Verificar se o Evolution API responde sem instâncias

```bash
curl https://SEU_EVOLUTION_URL/instance/fetchInstances \
  -H "apikey: SUA_GLOBAL_API_KEY"
```

Resposta esperada: `[]` (array vazio, sem instâncias).

### Passo 3 — Gerar QR Code pelo sistema

Acesse `https://sigmaauto.com.br/whatsapp` e clique em **Gerar QR Code**.

O backend vai:
1. Deletar a instância antiga (se existir)
2. Criar instância `sygmaauto` com webhook configurado
3. Aguardar o QR Code chegar via webhook (até 40 segundos)
4. Exibir o QR Code na tela

### Passo 4 — Escanear o QR

Abra o WhatsApp no celular → **Dispositivos conectados** → **Conectar dispositivo** → escaneie o código.

---

## 4. Fluxo técnico (como o código funciona)

```
Usuário clica "Gerar QR Code"
        ↓
Backend: DELETE /instance/delete/sygmaauto   ← limpa instância antiga
        ↓
Backend: POST /instance/create               ← cria instância fresca
         payload: { instanceName, qrcode: true,
                    integration: WHATSAPP-BAILEYS,
                    webhook: { url: BACKEND_URL/whatsapp/qr-webhook,
                               byEvents: false, base64: true } }
        ↓
Evolution API inicia Baileys → conecta ao WhatsApp
        ↓
WhatsApp gera QR Code
        ↓
Evolution API dispara POST → BACKEND_URL/whatsapp/qr-webhook
        ↓
Backend armazena QR em memória
        ↓
Backend retorna QR para o frontend
        ↓
Usuário escaneia → WhatsApp conectado ✅
```

---

## 5. Verificação de saúde

### Testar se o webhook do backend está acessível

```bash
curl -X POST https://sygmaauto-api-production.up.railway.app/whatsapp/qr-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"QRCODE_UPDATED","instance":"sygmaauto","data":{"qrcode":{"base64":"data:image/png;base64,iVBORw0KGgo=","count":1}}}'
```

Resposta esperada: `{"received":true}`

### Verificar status da instância

```bash
curl https://SEU_EVOLUTION_URL/instance/fetchInstances \
  -H "apikey: SUA_GLOBAL_API_KEY"
```

### Verificar estado da conexão

```bash
curl https://SEU_EVOLUTION_URL/instance/connectionState/sygmaauto \
  -H "apikey: SUA_GLOBAL_API_KEY"
```

---

## 6. Arquivos relevantes no repositório

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/notifications/whatsapp-admin.service.ts` | Gerencia instância, armazena QR via webhook, expõe status/disconnect |
| `backend/src/notifications/whatsapp.service.ts` | Envia mensagens WhatsApp para clientes |
| `backend/src/whatsapp/whatsapp.controller.ts` | Endpoints autenticados: GET /status, GET /qrcode, POST /disconnect |
| `backend/src/whatsapp/whatsapp-webhook.controller.ts` | Endpoint público: POST /whatsapp/qr-webhook (recebe QR da Evolution API) |
| `backend/src/whatsapp/whatsapp.module.ts` | Registra controllers e providers do módulo |

---

## 7. Problemas conhecidos e soluções

| Sintoma | Causa | Solução |
|---|---|---|
| QR não aparece, timeout 40s | Baileys não gera QR — sessão corrompida ou IP bloqueado | Seção 2 completa + aguardar 30–60 min |
| `connectionStatus: close` permanente | Arquivos de sessão corrompidos em disco | Passo 2 da limpeza + restart |
| Webhook não chega | `BACKEND_PUBLIC_URL` errado | Verificar variável no Railway |
| `403 already in use` no create | Instância não foi deletada | DELETE antes do CREATE (código já faz isso) |
| Loop de connecting sem QR | WhatsApp bloqueou IP temporariamente | Aguardar 30–60 min antes de nova tentativa |
| `{"received":true}` mas QR não aparece na tela | Evento chegou mas não era `QRCODE_UPDATED` | Checar log do backend — deve mostrar "QR armazenado via webhook" |
