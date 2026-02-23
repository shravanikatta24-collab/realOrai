import { motion } from 'framer-motion';

export default function TimerRing({ timeLeft, duration }) {
  const size = 100;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, timeLeft / duration);
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (timeLeft > 10) return '#00f5ff';
    if (timeLeft > 5) return '#ffff00';
    return '#ff006e';
  };

  const color = getColor();
  const seconds = Math.ceil(timeLeft);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="timer-ring -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          transition={{ duration: 0.1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          key={seconds}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="font-display font-black text-2xl"
          style={{ color, textShadow: `0 0 10px ${color}` }}
        >
          {seconds}
        </motion.span>
      </div>
    </div>
  );
}
