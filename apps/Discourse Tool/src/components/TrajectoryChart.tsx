import React, { useState } from 'react';
import { AgentPersona, DebateRound } from '../types';

interface TrajectoryChartProps {
  agents: AgentPersona[];
  rounds: DebateRound[];
}

export default function TrajectoryChart({ agents, rounds }: TrajectoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    agentName: string;
    roundName: string;
    position: number;
    confidence: number;
    reason: string;
    x: number;
    y: number;
  } | null>(null);

  if (!agents || agents.length === 0) return null;

  const timepoints = ['Initial', ...rounds.map((r, i) => `Round 0${i + 1}`)];
  const numTimepoints = timepoints.length;

  const width = 640;
  const height = 220;
  const paddingX = 90;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const getX = (index: number) => {
    if (numTimepoints <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (numTimepoints - 1)) * chartWidth;
  };

  const getY = (pos: number) => {
    const normalized = (pos + 1) / 2;
    return height - paddingY - normalized * chartHeight;
  };

  const colors = [
    '#3B82F6', // Blue
    '#F97316', // Orange
    '#A855F7', // Purple
    '#10B981', // Emerald
    '#EC4899', // Pink
  ];

  const agentLines = agents.map((agent, agentIdx) => {
    const points: { x: number; y: number; val: number; conf: number; reason: string; label: string }[] = [];

    points.push({
      x: getX(0),
      y: getY(agent.initialPosition),
      val: agent.initialPosition,
      conf: agent.initialConfidence,
      reason: agent.stanceBrief,
      label: 'Initial Stance',
    });

    rounds.forEach((round, roundIdx) => {
      const stmt = round.statements.find((s) => s.agentId === agent.id);
      if (stmt) {
        points.push({
          x: getX(roundIdx + 1),
          y: getY(stmt.updatedPosition),
          val: stmt.updatedPosition,
          conf: stmt.updatedConfidence,
          reason: stmt.reasonForUpdate || 'Maintained previous position.',
          label: `Round 0${roundIdx + 1}`,
        });
      } else {
        const prev = points[points.length - 1];
        points.push({
          ...prev,
          x: getX(roundIdx + 1),
          label: `Round 0${roundIdx + 1}`,
        });
      }
    });

    return {
      agent,
      color: colors[agentIdx % colors.length],
      points,
    };
  });

  return (
    <div id="trajectory-chart-container" className="bg-[#0F0F12] border border-slate-800 rounded-lg p-4 relative">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Stance_Trajectory // Multi-Round Convergence
            </h4>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            Logitudinal mapping of stance updates (-1.0 Oppose to +1.0 Support)
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {agentLines.map((line) => (
            <div key={line.agent.id} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: line.color }} />
              <span>{line.agent.avatar} {line.agent.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-x-auto">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto select-none">
          {/* Subtle Grid Background */}
          <line x1={paddingX} y1={getY(1.0)} x2={width - paddingX} y2={getY(1.0)} stroke="#1E293B" strokeDasharray="3,3" />
          <line x1={paddingX} y1={getY(0.5)} x2={width - paddingX} y2={getY(0.5)} stroke="#161F30" strokeDasharray="2,2" />
          <line x1={paddingX} y1={getY(0.0)} x2={width - paddingX} y2={getY(0.0)} stroke="#334155" strokeWidth="1.5" />
          <line x1={paddingX} y1={getY(-0.5)} x2={width - paddingX} y2={getY(-0.5)} stroke="#161F30" strokeDasharray="2,2" />
          <line x1={paddingX} y1={getY(-1.0)} x2={width - paddingX} y2={getY(-1.0)} stroke="#1E293B" strokeDasharray="3,3" />

          {/* Grid Labels */}
          <text x={paddingX - 12} y={getY(1.0) + 4} textAnchor="end" className="text-[9px] font-mono fill-emerald-400 font-semibold">+1.0 SUP</text>
          <text x={paddingX - 12} y={getY(0.0) + 4} textAnchor="end" className="text-[9px] font-mono fill-slate-500 font-semibold">0.0 NEU</text>
          <text x={paddingX - 12} y={getY(-1.0) + 4} textAnchor="end" className="text-[9px] font-mono fill-rose-400 font-semibold">-1.0 OPP</text>

          {/* Timeline columns */}
          {timepoints.map((tp, idx) => (
            <g key={tp}>
              <line x1={getX(idx)} y1={paddingY} x2={getX(idx)} y2={height - paddingY} stroke="#1E293B" strokeWidth="1" />
              <text x={getX(idx)} y={height - paddingY + 16} textAnchor="middle" className="text-[9px] font-mono fill-slate-400">{tp}</text>
            </g>
          ))}

          {/* Agent Paths */}
          {agentLines.map((line) => {
            const pathData = line.points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

            return (
              <g key={line.agent.id}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={line.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 opacity-90"
                />

                {line.points.map((point, pIdx) => (
                  <circle
                    key={pIdx}
                    cx={point.x}
                    cy={point.y}
                    r={hoveredPoint?.agentName === line.agent.name && hoveredPoint?.roundName === point.label ? "6" : "3.5"}
                    fill="#0F0F12"
                    stroke={line.color}
                    strokeWidth="2.5"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => {
                      setHoveredPoint({
                        agentName: line.agent.name,
                        roundName: point.label,
                        position: point.val,
                        confidence: point.conf,
                        reason: point.reason,
                        x: point.x,
                        y: point.y,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 bg-[#16161D] border border-slate-700 shadow-2xl rounded-lg p-2.5 max-w-[260px] text-xs pointer-events-none transition-all duration-100"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${Math.max(10, hoveredPoint.y - 120)}px`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold text-white font-mono flex items-center justify-between">
              <span>{hoveredPoint.agentName}</span>
              <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{hoveredPoint.roundName}</span>
            </div>
            <div className="flex gap-2 my-1.5 font-mono text-[10px]">
              <span className={`px-1.5 py-0.5 rounded border ${hoveredPoint.position > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                Stance: {hoveredPoint.position > 0 ? '+' : ''}{hoveredPoint.position.toFixed(2)}
              </span>
              <span className="bg-blue-500/10 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                Conf: {hoveredPoint.confidence}%
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-300 border-t border-slate-800 pt-1 italic">
              "{hoveredPoint.reason}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
