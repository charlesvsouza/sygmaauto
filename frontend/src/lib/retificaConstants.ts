/** Constantes compartilhadas do módulo Retífica de Motores */

export const PHASE_SLA_HOURS: Record<string, { warn: number; danger: number }> = {
  ABERTA:                        { warn: 4,   danger: 8   },
  DESMONTAGEM:                   { warn: 8,   danger: 24  },
  METROLOGIA:                    { warn: 12,  danger: 48  },
  ORCAMENTO_RETIFICA:            { warn: 24,  danger: 72  },
  AGUARDANDO_APROVACAO_RETIFICA: { warn: 48,  danger: 120 },
  APROVADO:                      { warn: 2,   danger: 6   },
  EM_RETIFICA:                   { warn: 48,  danger: 120 },
  MONTAGEM:                      { warn: 12,  danger: 36  },
  TESTE_FINAL:                   { warn: 4,   danger: 12  },
  PRONTO_ENTREGA:                { warn: 24,  danger: 72  },
};
