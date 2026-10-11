import { Car, ClipboardList, Cog, Gauge, Package, Wrench } from 'lucide-react';

const flowSteps = [
  'Recebimento do veículo ou motor avulso',
  'Triagem técnica e abertura da O.S. de retífica',
  'Desmontagem e metrologia',
  'Orçamento técnico e aprovação',
  'Execução da retífica, montagem e testes',
  'Entrega técnica e faturamento',
];

const entryModes = [
  {
    title: 'Entrada com veículo',
    description: 'Ideal para retíficas que também operam como oficina. Permite diagnóstico do motor e abertura do fluxo especializado a partir do atendimento automotivo.',
    icon: Car,
  },
  {
    title: 'Motor avulso',
    description: 'Recebimento direto do motor vindo de oficina parceira, mecânico autonomo ou cliente final, sem necessidade de cadastro completo do veículo.',
    icon: Package,
  },
];

export function RetificaMotoresPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Modo especializado</p>
            <h1 className="mt-2 text-3xl font-bold text-surface-50">Retífica de Motores</h1>
            <p className="mt-3 max-w-3xl text-sm text-surface-300">
              Esta área concentra a operação híbrida de oficina + retífica. O tenant pode receber um veículo com diagnóstico de motor
              ou receber apenas o motor avulso, mantendo o mesmo trilho técnico de desmontagem, medição, aprovação e entrega.
            </p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-700">
            <Cog className="h-8 w-8" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {entryModes.map((mode) => (
          <div key={mode.title} className="rounded-lg border border-line bg-surface-900 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-surface-800 p-2 text-surface-200">
                <mode.icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-surface-50">{mode.title}</h2>
            </div>
            <p className="mt-3 text-sm text-surface-300">{mode.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-line bg-surface-900 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-surface-200" />
            <h2 className="text-lg font-bold text-surface-50">Fluxo operacional previsto</h2>
          </div>
          <div className="mt-4 space-y-3">
            {flowSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-xl border border-line bg-surface-950/40 p-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-900 text-xs font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm font-medium text-surface-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-line bg-surface-900 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-surface-200" />
              <h2 className="text-lg font-bold text-surface-50">Escopo da próxima etapa</h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-surface-300">
              <li>Cadastro técnico do motor e origem da entrada</li>
              <li>O.S. com tipo específico de retífica</li>
              <li>Checklist de metrologia e montagem</li>
              <li>Kanban técnico e laudo final</li>
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border border-line bg-surface-900 p-4 shadow-sm">
              <Wrench className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-bold text-surface-50">Desmontagem</p>
              <p className="mt-1 text-xs text-surface-400">Abertura técnica do motor e inventário interno.</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-900 p-4 shadow-sm">
              <Gauge className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-bold text-surface-50">Metrologia</p>
              <p className="mt-1 text-xs text-surface-400">Medições, tolerâncias e decisão técnica do reparo.</p>
            </div>
            <div className="rounded-lg border border-line bg-surface-900 p-4 shadow-sm">
              <Car className="h-5 w-5 text-amber-600" />
              <p className="mt-3 text-sm font-bold text-surface-50">Entrega</p>
              <p className="mt-1 text-xs text-surface-400">Retorno do motor ou do veículo com rastreabilidade.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}