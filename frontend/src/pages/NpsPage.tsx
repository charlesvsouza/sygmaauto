import { useEffect, useState } from 'react';
import { npsApi } from '../api/client';
import { Loader2, MessageCircle, Star, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

function classifyScore(score: number) {
  if (score >= 9) return { label: 'Promotor', color: 'text-emerald-700', bg: 'bg-emerald-500/15' };
  if (score >= 7) return { label: 'Neutro', color: 'text-amber-700', bg: 'bg-amber-500/15' };
  return { label: 'Detrator', color: 'text-red-700', bg: 'bg-red-500/15' };
}

function ScoreButton({ value, active }: { value: number; active: boolean }) {
  const color =
    value >= 9 ? 'bg-emerald-500 text-white' :
    value >= 7 ? 'bg-amber-400 text-white' :
    'bg-red-500 text-white';
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
        ${active ? color : 'bg-surface-800 text-surface-500'}`}
    >
      {value}
    </div>
  );
}

export function NpsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    npsApi.getDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Erro ao carregar dashboard NPS.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );

  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  const score: number | null = data?.npsScore ?? null;
  const scoreColor =
    score === null ? 'text-surface-500' :
    score >= 50 ? 'text-emerald-600' :
    score >= 0 ? 'text-amber-500' :
    'text-red-600';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-50">NPS — Satisfação do Cliente</h1>
        <p className="text-sm text-surface-400 mt-0.5">
          Pesquisa enviada automaticamente 24h após a entrega do veículo.
        </p>
      </div>

      {/* Score principal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface-900 rounded-lg shadow-sm border p-6 text-center col-span-2 lg:col-span-1"
        >
          <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">
            Score NPS
          </p>
          <p className={`text-5xl font-bold ${scoreColor}`}>
            {score !== null ? score : '—'}
          </p>
          <p className="text-xs text-surface-500 mt-1">
            {score === null ? 'Sem respostas ainda' :
             score >= 75 ? 'Excelente 🏆' :
             score >= 50 ? 'Muito bom 👍' :
             score >= 0 ? 'Precisa melhorar' : 'Zona de alerta ⚠️'}
          </p>
        </motion.div>

        {[
          { label: 'Promotores (9–10)', value: data?.promoters ?? 0, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Neutros (7–8)', value: data?.passives ?? 0, icon: Users, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Detratores (0–6)', value: data?.detractors ?? 0, icon: MessageCircle, color: 'text-red-600', bg: 'bg-red-500/10' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (i + 1) * 0.1 }}
            className={`${card.bg} rounded-lg border p-5`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-surface-400">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Métricas secundárias */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-900 border rounded-xl p-4">
          <p className="text-xs text-surface-400 mb-1">Total de respostas</p>
          <p className="text-2xl font-bold text-surface-50">{data?.total ?? 0}</p>
        </div>
        <div className="bg-surface-900 border rounded-xl p-4">
          <p className="text-xs text-surface-400 mb-1">Aguardando resposta</p>
          <p className="text-2xl font-bold text-surface-200">{data?.pending ?? 0}</p>
        </div>
      </div>

      {/* Lista de comentários recentes */}
      {(data?.recent?.length ?? 0) > 0 && (
        <div className="bg-surface-900 border rounded-lg overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-surface-100">Avaliações recentes</h2>
          </div>
          <div className="divide-y">
            {data.recent.map((r: any) => {
              const cls = classifyScore(r.score);
              return (
                <div key={r.id} className="px-5 py-4 flex gap-4 items-start">
                  <div className="shrink-0">
                    <ScoreButton value={r.score} active />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-surface-50 text-sm truncate">
                        {r.customer?.name ?? 'Cliente'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls.bg} ${cls.color}`}>
                        {cls.label}
                      </span>
                      <span className="ml-auto text-xs text-surface-500 shrink-0">
                        {new Date(r.answeredAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-sm text-surface-300 italic">"{r.comment}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(data?.total ?? 0) === 0 && (
        <div className="text-center py-16">
          <Star className="w-14 h-14 text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 font-medium">Nenhuma avaliação recebida ainda</p>
          <p className="text-surface-500 text-sm mt-1">
            As pesquisas são enviadas automaticamente 24h após a entrega do veículo.
          </p>
        </div>
      )}
    </div>
  );
}
