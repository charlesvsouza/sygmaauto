// Rótulos da vistoria (mesmas chaves do frontend: components/ChecklistModal.tsx).

export const CHECKLIST_AREA_LABEL: Record<string, string> = {
  PARA_CHOQUE_DIANT: 'Para-choque dianteiro',
  CAPO: 'Capô',
  PARABRISA: 'Para-brisa',
  PORTA_LE_DIANT: 'Porta esq. dianteira',
  PORTA_LD_DIANT: 'Porta dir. dianteira',
  PORTA_LE_TRAS: 'Porta esq. traseira',
  PORTA_LD_TRAS: 'Porta dir. traseira',
  LATERAL_LE: 'Lateral esquerda',
  LATERAL_LD: 'Lateral direita',
  TETO: 'Teto',
  VIDRO_TRASEIRO: 'Vidro traseiro',
  PARA_CHOQUE_TRAS: 'Para-choque traseiro',
  INTERIOR: 'Interior / bancos',
  PNEUS: 'Pneus',
  EQUIPAMENTOS: 'Equipamentos',
};

// Acessórios: lista fixa, condição OK = presente, AUSENTE = ausente.
export const CHECKLIST_ACCESSORIES: Array<{ key: string; label: string }> = [
  { key: 'ESTEPE', label: 'Estepe' },
  { key: 'MACACO', label: 'Macaco' },
  { key: 'CHAVE_RODA', label: 'Chave de roda' },
  { key: 'TRIANGULO', label: 'Triângulo' },
  { key: 'RADIO', label: 'Rádio / multimídia' },
  { key: 'TAPETES', label: 'Tapetes' },
  { key: 'DOCUMENTO', label: 'Documento do veículo (CRLV)' },
  { key: 'OBJETOS_PESSOAIS', label: 'Objetos pessoais' },
];

export const CHECKLIST_CONDITION_LABEL: Record<string, string> = {
  OK: 'OK',
  RISCO: 'Risco',
  AMASSADO: 'Amassado',
  QUEBRADO: 'Quebrado',
  AUSENTE: 'Ausente',
};

export const FUEL_LEVEL_LABEL = ['Vazio', '1/8', '2/8', '3/8', '1/2', '5/8', '6/8', '7/8', 'Cheio'];
