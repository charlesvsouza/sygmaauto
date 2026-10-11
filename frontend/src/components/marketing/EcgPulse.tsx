import { motion } from 'framer-motion';

type EcgPulseProps = {
  className?: string;
  lineColor?: string;
  baseColor?: string;
  pointColor?: string;
  waveDuration?: number;
  travelDuration?: number;
  pointProgress?: number;
};

const waveStates = [
  'M0 20 L58 20 L72 20 L80 7 L92 31 L103 3 L116 35 L130 20 L232 20 L246 20 L254 7 L266 31 L277 3 L290 35 L304 20 L406 20 L420 20 L428 7 L440 31 L451 3 L464 35 L478 20 L600 20',
  'M0 20 L64 20 L78 20 L86 9 L96 29 L108 4 L118 33 L132 20 L224 20 L240 20 L248 9 L258 29 L270 4 L280 33 L294 20 L398 20 L414 20 L422 9 L432 29 L444 4 L454 33 L468 20 L600 20',
  'M0 20 L54 20 L68 20 L76 6 L88 32 L99 2 L112 36 L126 20 L236 20 L250 20 L258 6 L270 32 L281 2 L294 36 L308 20 L410 20 L424 20 L432 6 L444 32 L455 2 L468 36 L482 20 L600 20',
];

export function EcgPulse({
  className,
  lineColor = '#0d7d6e',
  baseColor = 'rgba(13, 125, 110, 0.25)',
  pointColor = '#1f9d8f',
  waveDuration = 2.4,
  travelDuration = 3.4,
  pointProgress,
}: EcgPulseProps) {
  const clampedProgress =
    typeof pointProgress === 'number' ? Math.max(0, Math.min(1, pointProgress)) : undefined;

  return (
    <div className={className ?? 'h-6 w-[320px] rounded-full border border-accent/30 bg-panel overflow-hidden relative'}>
      <motion.svg
        viewBox="0 0 600 40"
        className="absolute inset-0 h-full w-[220%]"
        preserveAspectRatio="none"
        animate={{ x: [0, -300] }}
        transition={{ duration: travelDuration, repeat: Infinity, ease: 'linear' }}
      >
        <path d="M0 20 L600 20" stroke={baseColor} strokeWidth="1.2" fill="none" />
        <motion.path
          d={waveStates[0]}
          animate={{ d: waveStates }}
          transition={{ duration: waveDuration, repeat: Infinity, ease: 'easeInOut' }}
          stroke={lineColor}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>

      {typeof clampedProgress === 'number' ? (
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm"
          style={{
            left: `calc(${clampedProgress * 100}% - 5px)`,
            backgroundColor: pointColor,
          }}
        />
      ) : (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: pointColor }}
          animate={{ x: [-12, 360], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}
