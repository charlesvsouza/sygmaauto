import {
  BarChart3,
  BookOpen,
  ClipboardList,
  DollarSign,
  Gauge,
  HeartHandshake,
  Lock,
  Mail,
  Newspaper,
  Package,
  Phone,
  Trophy,
  Users,
  Wrench,
  Clock,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Plan = {
  name: 'START' | 'PRO' | 'REDE';
  label: string;
  price: string;
  period: string;
  description: string;
  highlights: string[];
  featured?: boolean;
};

export type PlanCapability = {
  feature: string;
  start: string;
  pro: string;
  rede: string;
};

export type IconCard = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

export type NavLinkItem = {
  label: string;
  to: string;
};

export type NewsItem = {
  tag: string;
  date: string;
  title: string;
  excerpt: string;
};

export const plans: Plan[] = [
  {
    name: 'START',
    label: 'Start',
    price: 'R$ 149',
    period: '/mes',
    description: 'Para oficinas iniciando com o fluxo essencial do dia a dia.',
    highlights: ['Ate 50 O.S./mes', 'Financeiro, estoque inclusos', 'Clientes e Veiculos', 'Ate 3 usuarios'],
  },
  {
    name: 'PRO',
    label: 'Pro',
    price: 'R$ 299',
    period: '/mes',
    description: 'Aceleracao com operacao completa, visao gerencial e produtividade.',
    highlights: ['O.S. ilimitadas', 'Financeiro, estoque e checklist', 'WhatsApp automatico', 'Ate 15 usuarios'],
    featured: true,
  },
  {
    name: 'REDE',
    label: 'Rede',
    price: 'R$ 599',
    period: '/mes',
    description: 'Para grupos de oficinas com governanca, escala e padronizacao entre unidades.',
    highlights: ['Tudo do PRO', 'Multiunidade e consolidado', 'Usuarios ilimitados', 'Prioridade no suporte'],
  },
];

export const planCapabilities: PlanCapability[] = [
  { feature: 'Ordens de Servico por mes', start: '50', pro: 'Ilimitado', rede: 'Ilimitado' },
  { feature: 'Usuarios inclusos', start: '3', pro: '15', rede: 'Ilimitado' },
  { feature: 'Clientes e Veiculos', start: 'Sim', pro: 'Sim', rede: 'Sim' },
  { feature: 'Financeiro e Fluxo de Caixa', start: 'Sim', pro: 'Sim', rede: 'Sim' },
  { feature: 'Estoque e Reserva de Pecas', start: 'Sim', pro: 'Sim', rede: 'Sim' },
  { feature: 'Checklist Entrada/Saida', start: 'Nao', pro: 'Sim', rede: 'Sim' },
  { feature: 'Kanban Patio + Recepcao TV', start: 'Nao', pro: 'Nao', rede: 'Sim' },
  { feature: 'DRE, KPI e Relatorios', start: 'Nao', pro: 'Nao', rede: 'Sim' },
  { feature: 'Comissoes e Ranking tecnico', start: 'Nao', pro: 'Nao', rede: 'Sim' },
  { feature: 'Multiunidade', start: 'Nao', pro: 'Nao', rede: 'Sim' },
  { feature: 'WhatsApp automatico', start: 'Nao', pro: 'Sim', rede: 'Sim' },
];

export const features: IconCard[] = [
  { icon: Gauge, title: 'Dashboard em tempo real', desc: 'Metas, indicadores e performance da equipe num unico painel.' },
  { icon: Lock, title: 'Permissoes por papel', desc: 'Controle total de acesso: admin, produtor e financeiro.' },
  { icon: ClipboardList, title: 'O.S. digital completa', desc: 'Abertura, execucao, aprovacao e fechamento sem papel.' },
  { icon: Wrench, title: 'Estoque inteligente', desc: 'Alertas de reposicao e rastreio de pecas por ordem.' },
];

export const navLinks: NavLinkItem[] = [
  { label: 'Notícias', to: '/noticias' },
  { label: 'Soluções', to: '/solucoes' },
  { label: 'Quem Somos', to: '/quem-somos' },
  { label: 'Diferenciais', to: '/diferenciais' },
  { label: 'Contato', to: '/contato' },
  { label: 'Suporte', to: '/suporte' },
];

export const quickLinks = [
  {
    to: '/noticias',
    eyebrow: 'Notícias',
    title: 'Atualizações da plataforma',
    description: 'Lançamentos, melhorias e evoluções do produto em uma página própria.',
    icon: Newspaper,
  },
  {
    to: '/solucoes',
    eyebrow: 'Soluções',
    title: 'Módulos para a operação inteira',
    description: 'Veja em detalhes como OS, CRM, estoque e financeiro funcionam juntos.',
    icon: Wrench,
  },
  {
    to: '/quem-somos',
    eyebrow: 'Quem Somos',
    title: 'A visão por trás do SigmaAuto',
    description: 'Conheça a proposta, os valores e o foco no mercado automotivo brasileiro.',
    icon: HeartHandshake,
  },
  {
    to: '/diferenciais',
    eyebrow: 'Diferenciais',
    title: 'Por que escolher o SigmaAuto',
    description: 'Segurança, implantação rápida, suporte humano e evolução constante.',
    icon: Trophy,
  },
  {
    to: '/contato',
    eyebrow: 'Contato',
    title: 'Fale com comercial ou suporte',
    description: 'Canais diretos para tirar dúvidas, solicitar demonstração e receber atendimento.',
    icon: Mail,
  },
  {
    to: '/suporte',
    eyebrow: 'Suporte',
    title: 'Manual, FAQ e canais de ajuda',
    description: 'Central pública com documentação, perguntas frequentes e acesso ao manual.',
    icon: BookOpen,
  },
];

export const news: NewsItem[] = [
  {
    tag: 'Em producao',
    date: 'Em andamento',
    title: 'Painel de produtividade por tecnico',
    excerpt: 'Estamos evoluindo os indicadores operacionais para ajudar o gestor a acompanhar produtividade, tempo medio de execucao e gargalos da equipe com mais contexto.',
  },
  {
    tag: 'Em breve',
    date: 'Proximas entregas',
    title: 'Lembretes inteligentes de revisao e retorno',
    excerpt: 'Estamos preparando recursos para facilitar o relacionamento recorrente com o cliente, com comunicacoes de acompanhamento e lembretes de manutencao.',
  },
  {
    tag: 'Em breve',
    date: 'Planejamento continuo',
    title: 'Mais automacoes no fluxo de O.S.',
    excerpt: 'Estamos desenvolvendo melhorias para reduzir cliques no dia a dia, acelerar etapas da ordem de servico e tornar o fechamento mais previsivel.',
  },
];

export const solutions: IconCard[] = [
  { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Gerencie todo o ciclo da OS: abertura, diagnóstico, aprovação do cliente, execução, entrega e pagamento. Tudo digital, sem papel.' },
  { icon: Users, title: 'CRM de Clientes', desc: 'Histórico completo de cada cliente: veículos, OS anteriores, preferências e dados de contato. Relacionamento que fideliza.' },
  { icon: Package, title: 'Controle de Estoque', desc: 'Peças, insumos e materiais com alertas de reposição automáticos. Nunca mais perca uma venda por falta de peça.' },
  { icon: DollarSign, title: 'Financeiro Completo', desc: 'Receitas, despesas, fluxo de caixa e relatórios mensais. Saiba exatamente quanto sua oficina lucra.' },
  { icon: BarChart3, title: 'Relatórios e Indicadores', desc: 'Dashboard com KPIs em tempo real: faturamento, OS por período, tempo médio de execução e produtividade da equipe.' },
  { icon: Wrench, title: 'Catálogo de Serviços', desc: 'Monte seu catálogo de mão de obra com preços, tempo médio de operação e categoria. Padronize e profissionalize seu atendimento.' },
];

export const diferenciais: IconCard[] = [
  { icon: Trophy, title: 'Feito para oficinas', desc: 'Desenvolvido com dono de oficina, para dono de oficina. Cada funcionalidade resolve um problema real do dia a dia.' },
  { icon: Clock, title: 'Implementação em minutos', desc: 'Sem instalação, sem servidor próprio. Acesse do navegador, cadastre sua empresa e já comece a criar OS.' },
  { icon: Lock, title: 'Segurança multi-tenant', desc: 'Cada oficina tem seus dados completamente isolados. Nunca um cliente vê dados de outro. Criptografia em toda a comunicação.' },
  { icon: HeartHandshake, title: 'Suporte humano', desc: 'Nossas equipes de suporte respondem por e-mail e chat. Sem robôs, sem fila infinita. Pessoas reais ajudando de verdade.' },
  { icon: Star, title: 'Atualizações constantes', desc: 'O sistema evolui toda semana com novas funcionalidades sugeridas pelos próprios clientes. Você cresce junto com a plataforma.' },
  { icon: Gauge, title: 'Alta disponibilidade', desc: '99,95% de uptime garantido. Infraestrutura em nuvem com redundância automática para sua operação nunca parar.' },
];

export const supportFaq = [
  {
    question: 'Posso acessar pelo celular?',
    answer: 'Sim. O SigmaAuto é responsivo e funciona em qualquer navegador mobile.',
  },
  {
    question: 'Preciso instalar algum programa?',
    answer: 'Não. É 100% na nuvem, basta um navegador e conexão com a internet.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer: 'Sim. Cada oficina opera com dados isolados, criptografia e rotinas de backup automático.',
  },
  {
    question: 'Como adiciono outro mecânico?',
    answer: 'Acesse Usuários, envie um convite por e-mail e selecione o perfil Mecânico.',
  },
];

export const supportChannels = [
  {
    title: 'Manual do Usuário',
    description: 'Guia completo com passo a passo de ordens de serviço, clientes, financeiro, estoque e usuários.',
    href: '/manual',
    external: false,
    icon: BookOpen,
    accent: 'orange',
  },
  {
    title: 'E-mail de Suporte',
    description: 'Fale com a equipe pelo e-mail suporte@sigmaauto.com.br com retorno em até 24 horas úteis.',
    href: 'mailto:suporte@sigmaauto.com.br',
    external: true,
    icon: Mail,
    accent: 'neutral',
  },
  {
    title: 'WhatsApp',
    description: 'Atendimento comercial e operacional de segunda a sexta, das 9h às 18h.',
    href: 'https://wa.me/5511999999999',
    external: true,
    icon: Phone,
    accent: 'neutral',
  },
];
