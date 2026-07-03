# WhatsApp — Registro Histórico (Evolution) e Padrão Atual (Meta Cloud)

## Status atual (07/05/2026)

- Evolution foi descontinuado no sistema por risco operacional de bloqueio/banimento.
- O backend opera exclusivamente com API oficial da Meta (`WHATSAPP_PROVIDER=META_CLOUD`).
- Não existe mais fluxo de pareamento por QR no produto.

---

## Documento histórico

Este arquivo foi mantido apenas como registro técnico de incidentes passados com Evolution.
As instruções operacionais aqui antigas não devem ser usadas para produção.

---

## Padrão vigente (produção)

### Variáveis obrigatórias (backend/Railway)

| Variável | Obrigatória | Observação |
|---|---|---|
| `WHATSAPP_PROVIDER` | Sim | `META_CLOUD` |
| `META_WHATSAPP_TOKEN` | Sim | Token permanente da Meta Cloud API |
| `META_WHATSAPP_PHONE_NUMBER_ID` | Sim | Fallback global do backend |
| `META_WHATSAPP_VERIFY_TOKEN` | Sim | Verificação inicial do webhook (`hub.challenge`) |
| `META_WHATSAPP_APP_SECRET` | Sim | Assinatura `X-Hub-Signature-256` |
| `META_WHATSAPP_API_VERSION` | Não | Default: `v22.0` |

### Configuração por oficina (tenant)

- Cada oficina define seu `Phone Number ID` na aba Configurações.
- O envio usa o valor por tenant; se ausente, usa fallback global (`META_WHATSAPP_PHONE_NUMBER_ID`).

---

## Controles anti-ruído / anti-colapso de dados

1. Webhook oficial com assinatura HMAC SHA-256 validada.
2. Idempotência durável de eventos em banco com chave única `(provider, eventKey)`.
3. Controle de duplicidade por `processCount` e `lastReceivedAt` para rastreabilidade.
4. Isolamento multi-tenant para impedir mistura de dados entre oficinas.

Referências técnicas:
- `backend/src/whatsapp/whatsapp-webhook.controller.ts`
- `backend/src/whatsapp/whatsapp-meta-webhook.service.ts`
- `backend/src/notifications/whatsapp.service.ts`
