import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TimeWindowHUD from '../TimeWindowHUD';
import { TimingConfig, AgentPersona } from '../../types';

describe('TimeWindowHUD Component Suite', () => {
  const mockTimingConfig: TimingConfig = {
    totalDebateBudgetMinutes: 10,
    turnTimeWindowSeconds: 45,
    roundTimeWindows: [180, 180, 240],
    pacingMode: 'live',
    enforceLengthByTime: true,
    autoAdvanceOnTimeout: false,
  };

  const mockAgent: AgentPersona = {
    id: 'agent-1',
    name: 'Dr. Marcus Vance',
    role: 'Surgical Oncologist',
    avatar: '👨‍⚕️',
    bio: 'Lead surgeon specialized in cytoreductive procedures.',
    stanceBrief: 'Aggressive debulking maximizes survival',
    initialPosition: 0.9,
    initialConfidence: 90,
    reasoningStyle: 'Clinical Trial Evidence',
    primaryLens: 'scientific',
    secondaryLens: 'moral',
    formalDiscipline: 'Surgical Oncology',
    conflictingObjective: 'Maximize complete resection rate',
    failureModeGuarded: 'Post-operative mortality risk',
  };

  it('renders budget and round time progress accurately', () => {
    render(
      <TimeWindowHUD
        timingConfig={mockTimingConfig}
        totalElapsedSeconds={120}
        activeRoundIndex={0}
        activeRoundName="Round 1"
        roundElapsedSeconds={60}
        activeAgent={null}
        isPaused={false}
        onTogglePause={vi.fn()}
        onExtendFloor={vi.fn()}
        onYieldFloor={vi.fn()}
        onOpenScheduleModal={vi.fn()}
        onChangePacingMode={vi.fn()}
      />
    );

    expect(screen.getByText('Debate Budget')).toBeTruthy();
    expect(screen.getByText('02:00 / 10:00')).toBeTruthy();
    expect(screen.getByText('Round 01 Window')).toBeTruthy();
    expect(screen.getByText('01:00 / 03:00')).toBeTruthy();
  });

  it('displays active speaker and countdown when an agent is on the floor', () => {
    render(
      <TimeWindowHUD
        timingConfig={mockTimingConfig}
        totalElapsedSeconds={120}
        activeRoundIndex={0}
        activeRoundName="Round 1"
        roundElapsedSeconds={60}
        activeAgent={mockAgent}
        activeTurnRemainingSeconds={25}
        activeTurnTotalSeconds={45}
        isPaused={false}
        onTogglePause={vi.fn()}
        onExtendFloor={vi.fn()}
        onYieldFloor={vi.fn()}
        onOpenScheduleModal={vi.fn()}
        onChangePacingMode={vi.fn()}
      />
    );

    expect(screen.getByText('Dr. Marcus Vance')).toBeTruthy();
    expect(screen.getByText('Surgical Oncologist')).toBeTruthy();
    expect(screen.getByText('25s')).toBeTruthy();
    expect(screen.getByText('/ 45s')).toBeTruthy();
  });

  it('triggers control callbacks on user button clicks', () => {
    const handleTogglePause = vi.fn();
    const handleExtendFloor = vi.fn();
    const handleYieldFloor = vi.fn();
    const handleOpenSchedule = vi.fn();
    const handleChangePacing = vi.fn();

    render(
      <TimeWindowHUD
        timingConfig={mockTimingConfig}
        totalElapsedSeconds={120}
        activeRoundIndex={0}
        activeRoundName="Round 1"
        roundElapsedSeconds={60}
        activeAgent={mockAgent}
        activeTurnRemainingSeconds={25}
        activeTurnTotalSeconds={45}
        isPaused={false}
        onTogglePause={handleTogglePause}
        onExtendFloor={handleExtendFloor}
        onYieldFloor={handleYieldFloor}
        onOpenScheduleModal={handleOpenSchedule}
        onChangePacingMode={handleChangePacing}
      />
    );

    // Click pause button
    const pauseBtn = screen.getByTitle('Pause Turn Timer');
    fireEvent.click(pauseBtn);
    expect(handleTogglePause).toHaveBeenCalledTimes(1);

    // Click extend floor button (+30s)
    const extendBtn = screen.getByTitle('Grant +30s Floor Extension');
    fireEvent.click(extendBtn);
    expect(handleExtendFloor).toHaveBeenCalledWith(30);

    // Click yield floor button
    const yieldBtn = screen.getByTitle('Yield Floor / Conclude Statement');
    fireEvent.click(yieldBtn);
    expect(handleYieldFloor).toHaveBeenCalledTimes(1);

    // Click pacing button (⚡ Turbo)
    const turboBtn = screen.getByText('⚡ Turbo');
    fireEvent.click(turboBtn);
    expect(handleChangePacing).toHaveBeenCalledWith('turbo');

    // Click timing schedule button
    const scheduleBtn = screen.getByText('TIMING_SCHEDULE');
    fireEvent.click(scheduleBtn);
    expect(handleOpenSchedule).toHaveBeenCalledTimes(1);
  });
});
