
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { CoreStats } from '../types';

interface EvaluationMatrixProps {
  stats?: CoreStats; 
  compact?: boolean; // New prop for embedding
  maxDomain?: number; // Optional fixed scale
}

// Custom Tooltip for Radar
const RadarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = data.value;

    return (
      <div className="bg-black/95 border border-system-neon/50 backdrop-blur-xl p-4 rounded-lg shadow-[0_0_30px_rgba(0,210,255,0.2)] z-50 pointer-events-none min-w-[140px]">
        <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
            <p className="text-system-neon font-mono text-xs font-bold tracking-[0.2em] uppercase">{label}</p>
        </div>
        
        <div className="flex items-baseline gap-2">
            <span className="text-white font-mono text-3xl font-black leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
              {Math.floor(value)}
            </span>
            <span className="text-[10px] text-gray-600 font-mono font-bold">LVL</span>
        </div>
      </div>
    );
  }
  return null;
};

// Helper for Custom Radar
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

// Reusable Radar Chart Component with Sequential Animation
const CustomRadarChart = ({ data, domainMax, onHover, color1, color2, fillOpacity = 0.4, compact = false }: any) => {
    // Increased size and radius for prominence
    const size = 450; 
    const center = size / 2;
    // Radius adjusted: 200 points touches edge.
    // If compact, we use slightly smaller radius relative to viewbox to ensure labels fit if container is small
    const radius = compact ? 160 : 160; 
    
    if (!data || data.length === 0) return null;

    // Grid Levels (0, 50, 100, 150, 200)
    const gridLevels = 4; // 200 / 4 = 50 per step
    const gridPaths = [];
    for (let level = 1; level <= gridLevels; level++) {
        const levelRadius = (radius / gridLevels) * level;
        const pts = data.map((_: any, i: number) => {
            const angle = (360 / data.length) * i;
            const { x, y } = polarToCartesian(center, center, levelRadius, angle);
            return `${x},${y}`;
        });
        gridPaths.push(pts.join(' '));
    }

    // Axes Lines
    const axesLines = data.map((_: any, i: number) => {
        const angle = (360 / data.length) * i;
        const { x, y } = polarToCartesian(center, center, radius, angle);
        return { x1: center, y1: center, x2: x, y2: y };
    });

    // Data Points & Path
    const dataPoints = data.map((d: any, i: number) => {
        const angle = (360 / data.length) * i;
        // Clamp value to domainMax to avoid overflow, handle NaNs
        let safeValue = 0;
        if (typeof d.value === 'number' && !isNaN(d.value)) {
            safeValue = d.value;
        }
        
        const safeMax = (!domainMax || isNaN(domainMax) || domainMax === 0) ? 200 : domainMax;
        
        // Ensure point doesn't exceed visual radius even if value > 200
        const val = Math.min(safeValue, safeMax);
        const valRadius = (val / safeMax) * radius;
        const pt = polarToCartesian(center, center, valRadius, angle);
        
        // Fallback for NaN coords (rare but critical)
        if (isNaN(pt.x) || isNaN(pt.y)) {
            return { x: center, y: center };
        }
        return pt;
    });
    
    const pathD = dataPoints.map((p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ') + ' Z';

    const c1 = color1 || "#00d2ff";
    const c2 = color2 || "#8b5cf6";

    // Animation Timings
    const DOT_STAGGER = 0.15;
    const LINE_DELAY = data.length * DOT_STAGGER;
    const FILL_DELAY = LINE_DELAY + 0.8;

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible select-none">
            <defs>
                <linearGradient id={`radarStroke-${c1.replace('#','')}-${c2.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                </linearGradient>
                <linearGradient id={`radarFill-${c1.replace('#','')}-${c2.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c1} stopOpacity={fillOpacity}/>
                    <stop offset="100%" stopColor={c2} stopOpacity={0.05}/>
                </linearGradient>
            </defs>

            {/* Grid */}
            {gridPaths.map((pts, i) => {
                const isOuter = i === gridLevels - 1;
                return (
                    <polygon 
                        key={`grid-${i}`} 
                        points={pts} 
                        fill="none" 
                        stroke={compact ? "rgba(255,255,255,0.1)" : "#333"}
                        strokeWidth={isOuter ? 1.5 : 1}
                        strokeDasharray={isOuter ? "0" : "4 4"} 
                    />
                );
            })}
            
            {axesLines.map((line: any, i: number) => (
                <line key={`axis-${i}`} {...line} stroke={compact ? "rgba(255,255,255,0.1)" : "#333"} strokeWidth="1" strokeDasharray="4 4" />
            ))}

            {/* Labels */}
            {data.map((d: any, i: number) => {
                const angle = (360 / data.length) * i;
                // Push labels further out
                const { x, y } = polarToCartesian(center, center, radius + (compact ? 35 : 40), angle);
                return (
                    <text 
                        key={`label-${i}`} 
                        x={x} y={y} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fill={compact ? c1 : "#9ca3af"} 
                        fontSize={compact ? "14" : "12"} 
                        fontFamily="JetBrains Mono" 
                        fontWeight="bold"
                        className="drop-shadow-md uppercase tracking-tight"
                    >
                        {d.subject}
                    </text>
                );
            })}

            {/* 1. Dots Appear Sequentially with Interaction Feedback */}
            {dataPoints.map((p: any, i: number) => (
                <motion.g 
                    key={`dot-group-${i}`} 
                    onMouseEnter={(e) => onHover(e, data[i])} 
                    onMouseLeave={(e) => onHover(e, null)}
                    style={{ cursor: 'pointer' }}
                    whileHover="hover"
                    initial="initial"
                    animate="animate"
                >
                    {/* Interaction Target (Invisible but clickable) */}
                    <circle cx={p.x} cy={p.y} r={15} fill="transparent" />
                    
                    {/* Visible Dot */}
                    <motion.circle
                        r={5}
                        fill="#fff"
                        stroke={c1}
                        strokeWidth={1.5}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ 
                            scale: 1, 
                            opacity: 1,
                            cx: p.x, // Animated position
                            cy: p.y, // Animated position
                        }}
                        transition={{ 
                            default: { duration: 0.5, ease: "circOut" },
                            scale: { delay: i * DOT_STAGGER, type: "spring", stiffness: 300, damping: 20 }
                        }}
                        variants={{
                            hover: { scale: 1.8, strokeWidth: 2 }
                        }}
                    />
                </motion.g>
            ))}

            {/* 2. Line Draws and Morphs */}
            <motion.path
                fill="none"
                stroke={`url(#radarStroke-${c1.replace('#','')}-${c2.replace('#','')})`}
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                    pathLength: 1, 
                    opacity: 1,
                    d: pathD // Animated path
                }}
                transition={{ 
                    d: { duration: 0.5, ease: "easeInOut" },
                    default: { delay: LINE_DELAY, duration: 0.8, ease: "easeInOut" }
                }}
            />

            {/* 3. Fill Fades In and Morphs */}
            <motion.path
                fill={`url(#radarFill-${c1.replace('#','')}-${c2.replace('#','')})`}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ 
                    opacity: 1,
                    d: pathD // Animated path
                }}
                transition={{ 
                    d: { duration: 0.5, ease: "easeInOut" },
                    default: { delay: FILL_DELAY, duration: 0.5 }
                }}
            />
        </svg>
    );
};

const EvaluationMatrix: React.FC<EvaluationMatrixProps> = ({ stats, compact = false, maxDomain }) => {
  const [tooltipConfig, setTooltipConfig] = useState<{data: any, x: number, y: number} | null>(null);

  // Helper to format data for radar
  const getRadarData = (statObj: CoreStats | undefined, overrideMax?: number) => {
      // DEFENSIVE CODING: Fallback to defaults if stats is undefined/null
      const safeStats = statObj || { strength: 10, intelligence: 10, focus: 10, social: 10, willpower: 10, discipline: 0 };
      const values = Object.values(safeStats).map(v => typeof v === 'number' && !isNaN(v) ? v : 0);
      
      // FIXED SCALE: 200 points
      const domain = overrideMax || 200; 
      
      const average = values.reduce((a, b) => a + b, 0) / values.length;

      return {
          data: [
            { subject: 'STRENGTH', value: safeStats.strength || 0, fullMark: domain },
            { subject: 'INTEL', value: safeStats.intelligence || 0, fullMark: domain },
            { subject: 'FOCUS', value: (safeStats as any).focus || 0, fullMark: domain },
            { subject: 'SENSE', value: safeStats.social || 0, fullMark: domain },
            { subject: 'WILL', value: (safeStats as any).willpower || 0, fullMark: domain },
            { subject: 'SOCIAL', value: safeStats.social || 0, fullMark: domain },
          ],
          domain,
          average
      };
  };

  const radarData = useMemo(() => getRadarData(stats, maxDomain), [stats, maxDomain]);

  // Determine dynamic colors - FORCED TO CYAN AS REQUESTED
  const getThemeColors = () => {
      return { c1: '#00d2ff', c2: '#3b82f6' }; 
  };

  const theme = getThemeColors();

  const handleRadarHover = (e: React.MouseEvent, data: any) => {
      if (!data) {
          setTooltipConfig(null);
          return;
      }
      const rect = (e.target as Element).getBoundingClientRect();
      setTooltipConfig({
          data,
          x: rect.left + rect.width / 2, 
          y: rect.top
      });
  };

  return (
    <div className={`w-full h-full relative flex flex-col ${compact ? '' : ''}`}>
      {!compact && (
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
             <div className="p-2 bg-system-accent/10 rounded-lg border border-system-accent/20">
                <Activity size={16} className="text-system-accent animate-pulse" />
             </div>
             <div>
                <h3 className="text-sm text-white font-black font-mono tracking-widest uppercase">EVALUATION MATRIX</h3>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider">TOTAL SYSTEM ATTRIBUTES</p>
             </div>
          </div>
      )}

      <div className={`flex-1 relative min-h-[${compact ? '240px' : '400px'}] ${compact ? '' : 'bg-black/20 border border-white/5 rounded-lg overflow-hidden group'}`}>
        
        {!compact && (
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
        )}
        
        {!compact && (
            <motion.div 
                className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-system-neon/20 to-transparent shadow-[0_0_10px_rgba(0,210,255,0.2)] z-0 pointer-events-none"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            />
        )}

        {/* SINGLE VIEW: TOTAL STATS */}
        <motion.div 
          key="radar-main"
          initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            filter: "blur(0px)",
            transition: { duration: 0.4, ease: "easeOut" }
          }}
          className="absolute inset-0 w-full h-full p-4 flex items-center justify-center"
        >
          <CustomRadarChart 
            data={radarData.data} 
            domainMax={radarData.domain} 
            onHover={handleRadarHover}
            color1={theme.c1} 
            color2={theme.c2} 
            fillOpacity={compact ? 0.3 : 0.6}
            compact={compact}
          />
        </motion.div>
      </div>

      {tooltipConfig && (
          <div 
            style={{ 
                position: 'fixed', 
                left: tooltipConfig.x, 
                top: tooltipConfig.y, 
                transform: 'translate(-50%, -110%)', 
                zIndex: 100,
                pointerEvents: 'none'
            }}
          >
             <RadarTooltip active={true} label={tooltipConfig.data.subject} payload={[{ payload: tooltipConfig.data }]} />
          </div>
      )}
    </div>
  );
};

export default React.memo(EvaluationMatrix);
