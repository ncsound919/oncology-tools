import React, { useState, useEffect, useRef } from 'react';
import {
  AgentPersona,
  DebateFormat,
  ToneStyle,
  ModelEngine,
  DebateRound,
  DebateSession,
  JudgeSynthesis,
  SavedDebateSummary,
  StanceCard,
  EpistemicLens,
  TumorResearchQuestion,
  CancerControversy,
  ResearchBrief,
  TimingConfig,
} from './types';
import { DEBATE_PRESETS, DebatePreset, TUMOR_RESEARCH_QUESTIONS_8, CANCER_RESEARCH_CONTROVERSIES } from './data/presets';
import DebateForumPost from './components/DebateForumPost';
import DebateTopicModal from './components/DebateTopicModal';
import DebateSettingsModal from './components/DebateSettingsModal';
import TrajectoryChart from './components/TrajectoryChart';
import JudgePanel from './components/JudgePanel';
import StanceManager from './components/StanceManager';
import DebateHistory from './components/DebateHistory';
import EvidenceExplorerModal from './components/EvidenceExplorerModal';
import { CancerControversiesModal } from './components/CancerControversiesModal';
import ResearchBriefModal, { DEFAULT_RESEARCH_BRIEF } from './components/ResearchBriefModal';
import TimingScheduleModal, { DEFAULT_TIMING_CONFIG, formatDuration } from './components/TimingScheduleModal';
import TranscriptReportModal from './components/TranscriptReportModal';
import DebateSummaryTakeawaysCard from './components/DebateSummaryTakeawaysCard';
import Debater3DVisualizer from './components/Debater3DVisualizer';
import { generateTranscriptMarkdown, downloadFileBlob } from './utils/transcriptExport';
import {
  Sparkles,
  Play,
  RotateCcw,
  FastForward,
  Scale,
  Send,
  Sliders,
  CheckCircle2,
  BookOpen,
  Layers,
  Dna,
  Calculator,
  Compass,
  Flame,
  ArrowRight,
  Lock,
  Microscope,
  Clock,
  Pause,
  ChevronRight,
  TrendingUp,
  Users,
  MessageSquare,
  History,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function App() {
  // Preset Selection - default to 5 Live Cancer Research Controversies preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cancer-research-live-controversies');
  const currentPreset =
    DEBATE_PRESETS.find((p) => p.id === selectedPresetId) || DEBATE_PRESETS[0];

  // Session Configuration State
  const [topic, setTopic] = useState(currentPreset.topic);
  const [format, setFormat] = useState<DebateFormat>('roundtable');
  const [toneStyle, setToneStyle] = useState<ToneStyle>('intellectual');
  const [modelEngine, setModelEngine] = useState<ModelEngine>('gemini');
  const [llamaInfo, setLlamaInfo] = useState<{ status: string; engine: string; model: string } | null>(null);

  useEffect(() => {
    if (modelEngine === 'llama') {
      fetch('/api/llama/status')
        .then((res) => res.json())
        .then((data) => setLlamaInfo(data))
        .catch(() => setLlamaInfo({ status: 'cloud_emulated', engine: 'Llama 3.2 Emulated', model: 'llama3.2-gemini-fallback' }));
    }
  }, [modelEngine]);
  const [numAgents, setNumAgents] = useState(4);
  const [numRounds, setNumRounds] = useState(3);
  const [materials, setMaterials] = useState(currentPreset.materials);
  const [stanceCards, setStanceCards] = useState<StanceCard[]>(currentPreset.stanceCards);
  const [researchBrief, setResearchBrief] = useState<ResearchBrief>(DEFAULT_RESEARCH_BRIEF);

  // Time Windows & Scheduling State
  const [timingConfig, setTimingConfig] = useState<TimingConfig>(DEFAULT_TIMING_CONFIG);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState<number>(0);
  const [roundElapsedSeconds, setRoundElapsedSeconds] = useState<number>(0);
  const [activeTurnRemainingSeconds, setActiveTurnRemainingSeconds] = useState<number | undefined>(undefined);
  const [activeTurnTotalSeconds, setActiveTurnTotalSeconds] = useState<number | undefined>(undefined);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const yieldFloorRef = useRef<boolean>(false);

  // Active Session State
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [status, setStatus] = useState<
    'configuring' | 'spawning' | 'active' | 'judging' | 'completed'
  >('configuring');
  const [agents, setAgents] = useState<AgentPersona[]>([]);
  const [rounds, setRounds] = useState<DebateRound[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [activeViewingRoundIndex, setActiveViewingRoundIndex] = useState(0);
  const [judgeResult, setJudgeResult] = useState<JudgeSynthesis | undefined>(undefined);

  // Interaction State
  const [activeSpeakingAgentId, setActiveSpeakingAgentId] = useState<string | null>(null);
  const [userInterjectionInput, setUserInterjectionInput] = useState('');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLensFilter, setSelectedLensFilter] = useState<'all' | EpistemicLens>('all');
  const [activeDilemmaId, setActiveDilemmaId] = useState<number | null>(null);
  const [activeControversyId, setActiveControversyId] = useState<number | null>(2); // Default to C2: Liquid Biopsies

  // Modals & Panels State
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isControversiesModalOpen, setIsControversiesModalOpen] = useState(false);
  const [isBriefModalOpen, setIsBriefModalOpen] = useState(false);
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'verdict' | 'roster' | 'stances'>('roster');

  // Memory / History State
  const [savedDebates, setSavedDebates] = useState<SavedDebateSummary[]>([]);

  // Switch preset handler
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    setActiveDilemmaId(null);
    setActiveControversyId(null);
    const targetPreset = DEBATE_PRESETS.find((p) => p.id === presetId);
    if (targetPreset) {
      setTopic(targetPreset.topic);
      setMaterials(targetPreset.materials);
      setStanceCards(targetPreset.stanceCards);

      setResearchBrief({
        ...DEFAULT_RESEARCH_BRIEF,
        question: targetPreset.topic,
        population_or_system: 'Human clinical cancer cohorts, single-cell multi-omics datasets, and patient-derived xenograft (PDX) systems',
        primary_outcome: 'Progression-free survival (PFS), overall survival (OS), and mechanistic target inhibition',
      });

      handleReset();
    }
  };

  // Launch debate directly on one of the 5 Live Cancer Research Controversies
  const handleSelectControversy = (c: CancerControversy) => {
    setActiveControversyId(c.number);
    setActiveDilemmaId(null);
    setSelectedPresetId('cancer-research-live-controversies');
    const newTopic = `Motion: ${c.title} — ${c.centralDebate}`;
    const customStances: StanceCard[] = [
      {
        id: `sc-controv-${c.number}-posA`,
        title: `Affirmative: ${c.proponentPosition.title}`,
        claim: c.proponentPosition.claim,
        reasoning: c.proponentPosition.keyArguments[0] || 'Supported by trial detection yield and surrogate endpoints',
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: `sc-controv-${c.number}-posB`,
        title: `Opposition: ${c.skepticPosition.title}`,
        claim: c.skepticPosition.claim,
        reasoning: c.skepticPosition.keyArguments[0] || 'Evidence standards require hard all-cause mortality reduction',
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: `sc-controv-${c.number}-method`,
        title: `Methodological & Bioethical Standard`,
        claim: `${c.methodologicalChallenge.title}: ${c.methodologicalChallenge.keyNuance}`,
        reasoning: `${c.epistemicLenses.philosophical} — ${c.epistemicLenses.moral}`,
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ];

    setTopic(newTopic);
    setStanceCards(customStances);
    if (c.researchBriefTemplate) {
      setResearchBrief(c.researchBriefTemplate);
    }
    setMaterials(`CANCER RESEARCH CONTROVERSY #${c.number}: ${c.title}
Central Debate: ${c.centralDebate}
Key Dilemma: ${c.keyDilemma}

PROPONENT POSITION: ${c.proponentPosition.title}
Claim: ${c.proponentPosition.claim}
Arguments:
${c.proponentPosition.keyArguments.map((a) => `- ${a}`).join('\n')}
Evidence Standard: ${c.proponentPosition.evidenceStandards}

SKEPTIC POSITION: ${c.skepticPosition.title}
Claim: ${c.skepticPosition.claim}
Arguments:
${c.skepticPosition.keyArguments.map((a) => `- ${a}`).join('\n')}
Evidence Standard: ${c.skepticPosition.evidenceStandards}

METHODOLOGICAL CHALLENGE: ${c.methodologicalChallenge.title}
${c.methodologicalChallenge.description}
Nuance: ${c.methodologicalChallenge.keyNuance}

EPISTEMIC QUAD-LENS MATRIX:
- Scientific: ${c.epistemicLenses.scientific}
- Mathematical: ${c.epistemicLenses.mathematical}
- Philosophical: ${c.epistemicLenses.philosophical}
- Moral: ${c.epistemicLenses.moral}`);

    handleReset();
  };

  // Launch debate directly on one of the 8 specific dilemmas
  const handleSelectTumorDilemma = (q: TumorResearchQuestion) => {
    setActiveDilemmaId(q.number);
    setActiveControversyId(null);
    const newTopic = `Motion: Resolving Dilemma #${q.number} — ${q.question}`;
    const customStances: StanceCard[] = [
      {
        id: `sc-q${q.number}-posA`,
        title: `Affirmative: ${q.positionA.title}`,
        claim: q.positionA.claim,
        reasoning: `Supported by empirical evidence in ${q.citations[0] || 'primary literature'}`,
        confidence: 85,
        isActive: true,
        lens: 'scientific',
      },
      {
        id: `sc-q${q.number}-posB`,
        title: `Opposition: ${q.positionB.title}`,
        claim: q.positionB.claim,
        reasoning: `Supported by dynamical modeling in ${q.citations[1] || q.citations[0]}`,
        confidence: 85,
        isActive: true,
        lens: 'mathematical',
      },
      {
        id: `sc-q${q.number}-synth`,
        title: `Clinical & Bioethical Impact`,
        claim: `Resolving this matters because: ${q.whyItMatters}`,
        reasoning: `${q.philosophicalLens} — ${q.moralLens}`,
        confidence: 90,
        isActive: true,
        lens: 'moral',
      },
    ];

    setTopic(newTopic);
    setStanceCards(customStances);

    setResearchBrief({
      question: q.question,
      population_or_system: `Cancer model systems for ${q.category} (Human cohorts, PDX, Organoids)`,
      primary_outcome: `Therapeutic response and mechanistic validation for ${q.shortTitle}`,
      candidate_mechanism: `${q.scientificLens}`,
      allowed_evidence: [
        'Prospective clinical trials & replication studies',
        'Controlled multi-omics human cohorts (scRNA-seq, scATAC-seq)',
        'In vivo humanized PDX / organoid microfluidic assays',
      ],
      excluded_evidence: [
        'Uncalibrated rhetorical consensus',
        'Single 2D immortalized cell-line monocultures without in vivo validation',
        'Unreplicated computational gene-set overrepresentation heuristics',
      ],
      success_criterion: `Decisive experimental discrimination between "${q.positionA.title}" vs "${q.positionB.title}" with pre-specified statistical power (1-β > 0.85, α = 0.05).`,
    });

    handleReset();
  };

  // Master Clock & Floor Countdown Ticker
  useEffect(() => {
    if (status !== 'active' || isPaused) return;

    const interval = setInterval(() => {
      setTotalElapsedSeconds((s) => s + 1);
      setRoundElapsedSeconds((s) => s + 1);

      setActiveTurnRemainingSeconds((s) => {
        if (s === undefined) return undefined;
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, isPaused]);

  // Floor Control Handlers
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const handleYieldFloor = () => {
    yieldFloorRef.current = true;
    setActiveTurnRemainingSeconds(0);
  };

  // Fetch saved debates on mount
  useEffect(() => {
    fetchSavedDebates();
  }, []);

  const fetchSavedDebates = async () => {
    try {
      const res = await fetch('/api/debates');
      if (res.ok) {
        const data = await res.json();
        setSavedDebates(data);
      }
    } catch (err) {
      console.error('Failed to load debates from memory:', err);
    }
  };

  // Save current session to memory
  const persistSession = async (updatedSession: Partial<DebateSession>) => {
    const sessionToSave: DebateSession = {
      id: sessionId,
      topic,
      format,
      timestamp: new Date().toISOString(),
      numRounds,
      currentRoundIndex,
      status,
      agents,
      rounds,
      judgeResult,
      contextMaterials: materials,
      userStanceCards: stanceCards,
      researchBrief,
      timingConfig,
      totalElapsedSeconds,
      ...updatedSession,
    };

    try {
      await fetch('/api/debates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionToSave),
      });
      fetchSavedDebates();
    } catch (err) {
      console.error('Failed to save debate session:', err);
    }
  };

  // 1. Spawning Subagents
  const handleSpawnAgents = async () => {
    setStatus('spawning');
    setErrorMessage(null);
    setAgents([]);
    setRounds([]);
    setJudgeResult(undefined);
    setCurrentRoundIndex(0);
    setActiveViewingRoundIndex(0);
    setTotalElapsedSeconds(0);
    setRoundElapsedSeconds(0);
    setIsPaused(false);
    setActiveSpeakingAgentId(null);
    setActiveTurnRemainingSeconds(undefined);

    try {
      const res = await fetch('/api/debate/spawn-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          numAgents,
          format,
          materials,
          stanceCards,
          researchBrief,
          modelEngine,
          recommendedPersonas: currentPreset?.recommendedPersonas,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to spawn agents');
      }

      const spawnedAgents: AgentPersona[] = await res.json();
      setAgents(spawnedAgents);

      // Initialize Round 1 structure with allocated time budget
      const initialRounds: DebateRound[] = [
        {
          roundIndex: 0,
          name: 'ROUND 1: OPENING CLAIMS & EVIDENCE STACKING',
          description: 'Independent thesis formulation, ClaimCard generation, and evidence tier assignment.',
          statements: [],
          allocatedTimeSeconds: timingConfig.roundTimeWindows[0] || 180,
        },
      ];
      setRounds(initialRounds);
      setStatus('active');

      const newId = `session_${Date.now()}`;
      setSessionId(newId);
      persistSession({
        id: newId,
        agents: spawnedAgents,
        rounds: initialRounds,
        status: 'active',
        totalElapsedSeconds: 0,
        timingConfig,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while connecting to orchestrator.');
      setStatus('configuring');
    }
  };

  // 2. Execute a single round (sequential agent turns with calibrated time windows)
  const handleRunRound = async (roundIdx: number = currentRoundIndex) => {
    if (agents.length === 0) {
      await handleSpawnAgents();
      return;
    }
    if (status === 'spawning' || status === 'judging') return;

    setErrorMessage(null);
    let updatedRounds = [...rounds];

    if (!updatedRounds[roundIdx]) {
      const roundNames = [
        'ROUND 1: OPENING CLAIMS & EVIDENCE STACKING',
        'ROUND 2: ADVERSARIAL CROSS-EXAMINATION & FALSIFICATION',
        'ROUND 3: METHODOLOGICAL AUDIT & CONSENSUS SYNTHESIS',
        'ROUND 4: PREREGISTERED PROTOCOL PREPARATION',
      ];
      updatedRounds[roundIdx] = {
        roundIndex: roundIdx,
        name: roundNames[roundIdx] || `ROUND 0${roundIdx + 1}`,
        description:
          roundIdx === 0
            ? 'Independent initial arguments with standardized ClaimCards'
            : 'Adversarial refutation, causal DAG audits, and prospective falsification testing',
        statements: [],
        allocatedTimeSeconds: timingConfig.roundTimeWindows[roundIdx] || 180,
      };
    }

    setActiveViewingRoundIndex(roundIdx);
    setRoundElapsedSeconds(0);

    for (const agent of agents) {
      const existing = updatedRounds[roundIdx].statements.find((s) => s.agentId === agent.id);
      if (existing) continue;

      yieldFloorRef.current = false;
      const turnLimit = timingConfig.turnTimeWindowSeconds || 45;
      setActiveTurnTotalSeconds(turnLimit);
      setActiveTurnRemainingSeconds(turnLimit);
      setActiveSpeakingAgentId(agent.id);

      try {
        const fetchPromise = fetch('/api/debate/agent-turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            format,
            toneStyle,
            modelEngine,
            materials,
            agents,
            agentId: agent.id,
            rounds: updatedRounds,
            currentRoundIndex: roundIdx,
            researchBrief,
            timeWindowSeconds: turnLimit,
            elapsedSessionSeconds: totalElapsedSeconds,
            enforceLengthByTime: timingConfig.enforceLengthByTime,
          }),
        });

        let delayMs = timingConfig.pacingMode === 'fast' ? 1000 : timingConfig.pacingMode === 'live' ? 3000 : 0;

        const [res] = await Promise.all([
          fetchPromise,
          new Promise((resolve) => {
            const start = Date.now();
            const check = setInterval(() => {
              if (Date.now() - start >= delayMs || yieldFloorRef.current) {
                clearInterval(check);
                resolve(true);
              }
            }, 100);
          }),
        ]);

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Agent ${agent.name} failed turn.`);
        }

        const statementResult = await res.json();
        updatedRounds[roundIdx].statements.push(statementResult);
        setRounds([...updatedRounds]);
      } catch (err: any) {
        setErrorMessage(err.message);
        setActiveSpeakingAgentId(null);
        setActiveTurnRemainingSeconds(undefined);
        setActiveTurnTotalSeconds(undefined);
        return;
      }
    }

    setActiveSpeakingAgentId(null);
    setActiveTurnRemainingSeconds(undefined);
    setActiveTurnTotalSeconds(undefined);

    const nextRoundIndex = roundIdx + 1;
    if (nextRoundIndex < numRounds) {
      setCurrentRoundIndex(nextRoundIndex);
      setActiveViewingRoundIndex(nextRoundIndex);
      if (!updatedRounds[nextRoundIndex]) {
        const roundNames = [
          'ROUND 1: OPENING CLAIMS & EVIDENCE STACKING',
          'ROUND 2: ADVERSARIAL CROSS-EXAMINATION & FALSIFICATION',
          'ROUND 3: METHODOLOGICAL AUDIT & CONSENSUS SYNTHESIS',
          'ROUND 4: PREREGISTERED PROTOCOL PREPARATION',
        ];
        updatedRounds.push({
          roundIndex: nextRoundIndex,
          name: roundNames[nextRoundIndex] || `ROUND 0${nextRoundIndex + 1}`,
          description: 'Iterative thesis refinement, evidence tier checking, and counterevidence analysis.',
          statements: [],
          allocatedTimeSeconds: timingConfig.roundTimeWindows[nextRoundIndex] || 180,
        });
        setRounds([...updatedRounds]);
      }
    }

    persistSession({
      rounds: updatedRounds,
      currentRoundIndex: Math.min(nextRoundIndex, numRounds - 1),
      timingConfig,
      totalElapsedSeconds,
    });
  };

  // 3. Auto-play all remaining rounds and auto-judge
  const handleAutoPlay = async () => {
    setIsAutoPlaying(true);
    if (agents.length === 0) {
      await handleSpawnAgents();
    }

    let rIdx = currentRoundIndex;
    while (rIdx < numRounds) {
      await handleRunRound(rIdx);
      rIdx++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await handleRunJudge();
    setIsAutoPlaying(false);
    setActiveSidebarTab('verdict');
  };

  // 4. Run Judge Synthesizer
  const handleRunJudge = async () => {
    if (rounds.length === 0 || rounds[0].statements.length === 0) return;
    setStatus('judging');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/debate/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          format,
          modelEngine,
          materials,
          agents,
          rounds,
          researchBrief,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to judge debate.');
      }

      const synthesis: JudgeSynthesis = await res.json();
      setJudgeResult(synthesis);
      setStatus('completed');
      setActiveSidebarTab('verdict');
      persistSession({ judgeResult: synthesis, status: 'completed' });
    } catch (err: any) {
      setErrorMessage(err.message);
      setStatus('active');
    }
  };

  // 5. Inject User Proxy Feedback / Quote
  const handleInjectInterjection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInterjectionInput.trim()) return;

    const updatedRounds = [...rounds];
    const targetRoundIdx = activeViewingRoundIndex;

    if (!updatedRounds[targetRoundIdx]) {
      updatedRounds[targetRoundIdx] = {
        roundIndex: targetRoundIdx,
        name: `ROUND 0${targetRoundIdx + 1}`,
        description: 'User-interjected debate exchange.',
        statements: [],
      };
    }

    updatedRounds[targetRoundIdx].userInterjection = userInterjectionInput.trim();
    setRounds(updatedRounds);
    setUserInterjectionInput('');
    persistSession({ rounds: updatedRounds });
  };

  const handleQuoteInInterjection = (quoteText: string, authorName: string) => {
    setUserInterjectionInput(`Responding to ${authorName}: "${quoteText}" — `);
  };

  // 6. Reset debate
  const handleReset = () => {
    setStatus('configuring');
    setAgents([]);
    setRounds([]);
    setJudgeResult(undefined);
    setCurrentRoundIndex(0);
    setActiveViewingRoundIndex(0);
    setErrorMessage(null);
    setTotalElapsedSeconds(0);
    setRoundElapsedSeconds(0);
    setActiveSpeakingAgentId(null);
    setActiveTurnRemainingSeconds(undefined);
    setActiveTurnTotalSeconds(undefined);
    setIsPaused(false);
    setSessionId(`session_${Date.now()}`);
  };

  // 7. Load saved debate from history
  const handleLoadDebate = async (id: string) => {
    try {
      const res = await fetch(`/api/debates/${id}`);
      if (res.ok) {
        const data: DebateSession = await res.json();
        setSessionId(data.id);
        setTopic(data.topic);
        setFormat(data.format);
        setMaterials(data.contextMaterials || '');
        setStanceCards(data.userStanceCards || currentPreset.stanceCards);
        setAgents(data.agents || []);
        setRounds(data.rounds || []);
        setJudgeResult(data.judgeResult);
        if (data.researchBrief) setResearchBrief(data.researchBrief);
        if (data.timingConfig) setTimingConfig(data.timingConfig);
        if (data.totalElapsedSeconds !== undefined) setTotalElapsedSeconds(data.totalElapsedSeconds);
        setCurrentRoundIndex(data.currentRoundIndex || 0);
        setActiveViewingRoundIndex(data.currentRoundIndex || 0);
        setStatus(data.status || 'completed');
        if (data.judgeResult) setActiveSidebarTab('verdict');
      }
    } catch (err) {
      console.error('Failed to load debate:', err);
    }
  };

  // 8. Delete saved debate
  const handleDeleteDebate = async (id: string) => {
    try {
      await fetch(`/api/debates/${id}`, { method: 'DELETE' });
      fetchSavedDebates();
    } catch (err) {
      console.error('Failed to delete debate:', err);
    }
  };

  // 9. Download saved debate
  const handleDownloadSavedDebate = async (id: string) => {
    try {
      const res = await fetch(`/api/debates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch debate');
      const data = await res.json();
      
      const md = generateTranscriptMarkdown(data);
      const filename = `debate-transcript-${Date.now()}.md`;
      downloadFileBlob(filename, md, 'text/markdown');
    } catch (err) {
      console.error('Failed to download debate:', err);
    }
  };

  // Stance card helper functions
  const handleToggleStanceCard = (id: string) => {
    setStanceCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleAddStanceCard = (newCard: Omit<StanceCard, 'id' | 'isActive'>) => {
    setStanceCards((prev) => [
      ...prev,
      { ...newCard, id: `sc_${Date.now()}`, isActive: true },
    ]);
  };

  const handleDeleteStanceCard = (id: string) => {
    setStanceCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Current viewing round statements
  const currentViewingRound = rounds[activeViewingRoundIndex];

  // Filter statements by lens if filter active
  const filteredAgents = agents.filter((agent) => {
    if (selectedLensFilter === 'all') return true;
    return (
      agent.primaryLens === selectedLensFilter ||
      agent.secondaryLens === selectedLensFilter
    );
  });

  // Calculate Affirmative vs Opposition Support Balance
  const affirmativeScore = agents.length > 0
    ? Math.round(
        (agents.filter((a) => a.initialPosition > 0.1).length / agents.length) * 100
      )
    : 50;
  const oppositionScore = 100 - affirmativeScore;

  // Active controversy title if one selected
  const activeControversy = CANCER_RESEARCH_CONTROVERSIES.find((c) => c.number === activeControversyId);
  const activeDilemma = TUMOR_RESEARCH_QUESTIONS_8.find((q) => q.number === activeDilemmaId);

  return (
    <div id="debate-forum-root" className="flex flex-col min-h-screen bg-[#090b10] text-slate-200 font-sans">
      {/* Forum Header / Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0e121a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Forum Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-[0_0_16px_rgba(79,70,229,0.35)]">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-white tracking-tight">
                  Oncology Discourse Forum
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Epistemic Debate Chamber
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                Quad-Lens Scientific Accountability & Preregistered Experimental Planning
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Topic Switcher Button */}
            <button
              onClick={() => setIsTopicModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-bold font-sans flex items-center gap-1.5 transition shadow-sm"
              title="Select or change debate motion"
            >
              <Flame size={14} className="text-indigo-400" />
              <span>Change Motion</span>
              <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.2 rounded font-mono">
                {activeControversyId ? `C${activeControversyId}` : activeDilemmaId ? `Q${activeDilemmaId}` : 'Preset'}
              </span>
            </button>

            {/* Evidence Dossier Button */}
            <button
              onClick={() => setIsEvidenceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-medium font-sans flex items-center gap-1.5 transition"
            >
              <BookOpen size={14} className="text-cyan-400" />
              <span className="hidden sm:inline">Evidence Dossier</span>
            </button>

            {/* Engine Toggle */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700/80 mr-2">
              <button
                onClick={() => setModelEngine('gemini')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                  modelEngine === 'gemini' ? 'bg-indigo-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gemini 3.7
              </button>
              <button
                onClick={() => setModelEngine('llama')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                  modelEngine === 'llama' ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={llamaInfo ? `Status: ${llamaInfo.status} (${llamaInfo.model})` : 'Llama 3.2 Engine'}
              >
                <span>Local Llama</span>
                {modelEngine === 'llama' && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      llamaInfo?.status === 'connected' ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'
                    }`}
                  />
                )}
              </button>
            </div>

            {/* Research Brief Button */}
            <button
              onClick={() => setIsBriefModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-medium font-sans flex items-center gap-1.5 transition"
            >
              <Lock size={14} className="text-indigo-400" />
              <span className="hidden sm:inline">Research Brief</span>
            </button>

            {/* Settings & Timer Button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 text-xs font-medium font-sans flex items-center gap-1.5 transition"
              title="Debate Settings & Pacing"
            >
              <Sliders size={14} className="text-amber-400" />
              <span className="hidden md:inline">Settings</span>
            </button>

            {/* Saved Debates / History Drawer */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition"
              title="View saved debate history"
            >
              <History size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* 3D Visualizer Background Overlay */}
      {(status !== 'configuring' || agents.length > 0) && (
        <Debater3DVisualizer agents={agents} activeSpeakingAgentId={activeSpeakingAgentId} />
      )}

      {/* Main Forum Stage */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 relative z-10">
        {/* Left / Center: Forum Thread Stage (70% width) */}
        <main className="flex-1 flex flex-col space-y-6 min-w-0">
          {/* Motion / Resolution Banner (Forum Thread Question) */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 shadow-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeControversy
                    ? `CONTROVERSY #${activeControversy.number} · ${activeControversy.title}`
                    : activeDilemma
                    ? `DILEMMA #${activeDilemma.number} · ${activeDilemma.category}`
                    : 'RESEARCH MOTION'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {format.toUpperCase()} PROTOCOL
                </span>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${status === 'active' && !isPaused ? 'bg-emerald-500 animate-pulse' : status === 'completed' ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                  {status === 'spawning'
                    ? 'SPAWNING SPEAKERS...'
                    : status === 'judging'
                    ? 'SYNTHESIZING VERDICT...'
                    : status === 'completed'
                    ? 'DEBATE CONCLUDED'
                    : status === 'active'
                    ? isPaused ? 'PAUSED' : `ROUND 0${activeViewingRoundIndex + 1} ACTIVE`
                    : 'READY FOR MOTION'}
                </span>
              </div>
            </div>

            {/* Central Resolution */}
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block mb-1">
                MOTION BEFORE THE CHAMBER:
              </span>
              <h2 className="text-base md:text-lg lg:text-xl font-bold text-white font-sans leading-snug">
                "{topic}"
              </h2>
            </div>

            {/* Affirmative vs Opposition Side-by-Side Highlights */}
            {activeControversy && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-emerald-400 font-mono text-[10px] uppercase tracking-wider block">
                    Affirmative Thesis: {activeControversy.proponentPosition.title}
                  </span>
                  <p className="text-slate-300 leading-relaxed font-sans">{activeControversy.proponentPosition.claim}</p>
                </div>

                <div className="p-3 bg-rose-950/20 border border-rose-500/25 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-rose-400 font-mono text-[10px] uppercase tracking-wider block">
                    Opposition Counter: {activeControversy.skepticPosition.title}
                  </span>
                  <p className="text-slate-300 leading-relaxed font-sans">{activeControversy.skepticPosition.claim}</p>
                </div>
              </div>
            )}

            {/* Chamber Support Balance & Progress Bar */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span className="text-emerald-400 font-bold">AFFIRMATIVE LEAN ({affirmativeScore}%)</span>
                <span className="text-slate-400">SESSION TIME: {formatDuration(totalElapsedSeconds)}</span>
                <span className="text-rose-400 font-bold">OPPOSITION LEAN ({oppositionScore}%)</span>
              </div>

              <div className="relative h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="absolute left-0 top-0 bottom-0 bg-emerald-500 transition-all duration-500"
                  style={{ width: `${affirmativeScore}%` }}
                />
                <div
                  className="absolute right-0 top-0 bottom-0 bg-rose-500 transition-all duration-500"
                  style={{ width: `${oppositionScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl text-xs font-sans text-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-400" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-4">
                Dismiss
              </button>
            </div>
          )}

          {/* Forum Thread Speeches Section */}
          {status === 'configuring' && agents.length === 0 ? (
            /* Welcome / Unstarted State */
            <div className="p-8 md:p-12 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 text-center space-y-6 shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
                <MessageSquare size={32} />
              </div>

              <div className="max-w-xl mx-auto space-y-2">
                <h3 className="text-lg md:text-xl font-bold text-white font-sans">
                  Welcome to the Scientific Debate Forum
                </h3>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
                  Orchestrates {numAgents} specialized academic debaters arguing this motion across 🔬 Molecular Proteogenomics, 📐 Dynamical Equations & Statistical Power, 🏛️ Epistemic Criteria, and ⚖️ Bioethical QALY Trade-offs.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleSpawnAgents}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs md:text-sm font-bold font-sans transition shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center gap-2"
                >
                  <Play size={16} />
                  <span>Start Live Forum Debate</span>
                </button>

                <button
                  onClick={() => setIsTopicModalOpen(true)}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs md:text-sm font-medium font-sans transition"
                >
                  Explore Other Motions
                </button>
              </div>
            </div>
          ) : (
            /* Active Thread View */
            <div className="space-y-4">
              {/* Round Tabs & Epistemic Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                {/* Round Stepper Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto">
                  {Array.from({ length: numRounds }).map((_, rIdx) => {
                    const roundData = rounds[rIdx];
                    const isComplete = roundData && roundData.statements.length >= agents.length && agents.length > 0;
                    const isActive = activeViewingRoundIndex === rIdx;

                    return (
                      <button
                        key={rIdx}
                        onClick={() => setActiveViewingRoundIndex(rIdx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5 transition ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-md'
                            : isComplete
                            ? 'bg-slate-900 text-slate-300 border border-slate-800'
                            : 'bg-slate-900/50 text-slate-500 border border-slate-800/60'
                        }`}
                      >
                        <span>Round 0{rIdx + 1}</span>
                        {isComplete && <CheckCircle2 size={13} className="text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>

                {/* Epistemic Lens Filter */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-sans">
                  <span className="text-slate-500 px-2 text-[11px] font-mono">LENS:</span>
                  <button
                    onClick={() => setSelectedLensFilter('all')}
                    className={`px-2 py-0.5 rounded-lg transition ${
                      selectedLensFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSelectedLensFilter('scientific')}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                      selectedLensFilter === 'scientific' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Dna size={11} /> Sci
                  </button>
                  <button
                    onClick={() => setSelectedLensFilter('mathematical')}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                      selectedLensFilter === 'mathematical' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Calculator size={11} /> Math
                  </button>
                  <button
                    onClick={() => setSelectedLensFilter('philosophical')}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                      selectedLensFilter === 'philosophical' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass size={11} /> Phil
                  </button>
                  <button
                    onClick={() => setSelectedLensFilter('moral')}
                    className={`px-2 py-0.5 rounded-lg transition flex items-center gap-1 ${
                      selectedLensFilter === 'moral' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Scale size={11} /> Ethics
                  </button>
                </div>

                {/* Tone Style Selector */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-sans">
                  <span className="text-slate-500 px-2 text-[11px] font-mono">TONE:</span>
                  {(['intellectual', 'layman', 'authoritative', 'slang'] as ToneStyle[]).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setToneStyle(tone)}
                      className={`px-2 py-0.5 rounded-lg transition capitalize ${
                        toneStyle === tone ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Forum Posts List */}
              <div className="space-y-4">
                {filteredAgents.map((agent, postIdx) => {
                  const statement = currentViewingRound?.statements.find((s) => s.agentId === agent.id);
                  const isThinking = activeSpeakingAgentId === agent.id;

                  return (
                    <DebateForumPost
                      key={agent.id}
                      agent={agent}
                      statement={statement}
                      isThinking={isThinking}
                      activeCountdownSeconds={isThinking ? activeTurnRemainingSeconds : undefined}
                      turnTimeWindowSeconds={timingConfig.turnTimeWindowSeconds}
                      postNumber={postIdx + 1}
                      roundName={currentViewingRound?.name}
                      onQuote={handleQuoteInInterjection}
                    />
                  );
                })}
              </div>

              {/* Debate Executive Summary & Takeaways (shown only on last round or completed) */}
              {status === 'completed' && activeViewingRoundIndex === rounds.length - 1 && (
                <DebateSummaryTakeawaysCard 
                  session={{
                    id: sessionId || 'live-session',
                    topic,
                    format,
                    agents,
                    rounds,
                    judgeResult,
                    researchBrief,
                    timestamp: new Date().toISOString(),
                    status,
                    totalElapsedSeconds
                  }}
                  onOpenFullTranscript={() => setIsTranscriptModalOpen(true)}
                />
              )}
            </div>
          )}

          {/* Forum Floor Controller Dock */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#0f131d]/95 backdrop-blur-md border border-slate-800 shadow-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Floor Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleRunRound(activeViewingRoundIndex)}
                  disabled={isAutoPlaying || activeSpeakingAgentId !== null}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-2 shadow-sm"
                >
                  <Play size={14} />
                  <span>
                    {currentViewingRound && currentViewingRound.statements.length > 0
                      ? 'Re-Run Round'
                      : `Run Round 0${activeViewingRoundIndex + 1}`}
                  </span>
                </button>

                <button
                  onClick={handleAutoPlay}
                  disabled={isAutoPlaying || activeSpeakingAgentId !== null}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 shadow-sm"
                >
                  <FastForward size={14} />
                  <span>Auto-Debate All</span>
                </button>

                <button
                  onClick={handleRunJudge}
                  disabled={rounds.length === 0 || isAutoPlaying || activeSpeakingAgentId !== null}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 shadow-sm"
                >
                  <Scale size={14} />
                  <span>Synthesize Verdict</span>
                </button>

                <button
                  onClick={handleTogglePause}
                  disabled={status !== 'active'}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  title={isPaused ? 'Resume debate' : 'Pause floor'}
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition"
                  title="Reset debate"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Time Elapsed HUD */}
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <Clock size={13} className="text-amber-400" />
                <span>Elapsed: <strong className="text-white">{formatDuration(totalElapsedSeconds)}</strong></span>
              </div>
            </div>

            {/* Interjection Input Form */}
            <form onSubmit={handleInjectInterjection} className="flex gap-2">
              <input
                type="text"
                placeholder="Submit scientific evidence, clinical trial citation, or point of order to the floor..."
                value={userInterjectionInput}
                onChange={(e) => setUserInterjectionInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-sans text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!userInterjectionInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>Interject</span>
              </button>
            </form>
          </div>
        </main>

        {/* Right: Forum Sidebar (30% width) */}
        <aside className="w-full lg:w-84 xl:w-96 flex flex-col space-y-4 shrink-0">
          {/* Sidebar Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-sans">
            <button
              onClick={() => setActiveSidebarTab('roster')}
              className={`flex-1 py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'roster'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={13} />
              <span>Debaters</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab('verdict')}
              className={`flex-1 py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'verdict'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale size={13} />
              <span>Verdict</span>
              {judgeResult && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>

            <button
              onClick={() => setActiveSidebarTab('stances')}
              className={`flex-1 py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1.5 ${
                activeSidebarTab === 'stances'
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>Stances</span>
            </button>
          </div>

          {/* Sidebar Body */}
          <div className="space-y-4">
            {/* Tab 1: Debater Roster & Trajectory Chart */}
            {activeSidebarTab === 'roster' && (
              <div className="space-y-4">
                {/* Debater Cards */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                      <Users size={14} className="text-indigo-400" />
                      Debate Participants ({agents.length})
                    </span>
                    <button
                      onClick={handleSpawnAgents}
                      className="text-[11px] font-sans text-indigo-400 hover:underline font-medium"
                    >
                      Re-spawn
                    </button>
                  </div>

                  {agents.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Debaters will appear here once the motion is initiated.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {agents.map((agent) => {
                        const currentPos = currentViewingRound?.statements.find((s) => s.agentId === agent.id)?.updatedPosition ?? agent.initialPosition;
                        return (
                          <div
                            key={agent.id}
                            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{agent.avatar}</span>
                              <div>
                                <h4 className="font-bold text-white font-sans leading-none">{agent.name}</h4>
                                <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{agent.role}</span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                currentPos > 0.1
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : currentPos < -0.1
                                  ? 'bg-rose-500/15 text-rose-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {currentPos > 0 ? '+' : ''}{currentPos.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Stance Trajectory Chart */}
                {rounds.length > 0 && rounds[0].statements.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-white font-sans flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-indigo-400" />
                      Opinion Trajectory Shift
                    </span>
                    <TrajectoryChart agents={agents} rounds={rounds} />
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Judge Synthesis & Verdict */}
            {activeSidebarTab === 'verdict' && (
              <div className="space-y-4">
                <JudgePanel 
                  judgeResult={judgeResult} 
                  isJudging={status === 'judging'} 
                  onOpenTranscript={() => setIsTranscriptModalOpen(true)}
                />
              </div>
            )}

            {/* Tab 3: Stance Cards & Testable Hypotheses */}
            {activeSidebarTab === 'stances' && (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <StanceManager
                  stanceCards={stanceCards}
                  onToggleCard={handleToggleStanceCard}
                  onAddCard={handleAddStanceCard}
                  onDeleteCard={handleDeleteStanceCard}
                />
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Topic & Motion Selector Modal */}
      <DebateTopicModal
        isOpen={isTopicModalOpen}
        onClose={() => setIsTopicModalOpen(false)}
        selectedPresetId={selectedPresetId}
        activeControversyId={activeControversyId}
        activeDilemmaId={activeDilemmaId}
        onSelectControversy={handleSelectControversy}
        onSelectDilemma={handleSelectTumorDilemma}
        onSelectPreset={handleSelectPreset}
      />

      {/* Debate Settings Modal */}
      <DebateSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        format={format}
        onChangeFormat={setFormat}
        numAgents={numAgents}
        onChangeNumAgents={setNumAgents}
        numRounds={numRounds}
        onChangeNumRounds={setNumRounds}
        materials={materials}
        onChangeMaterials={setMaterials}
        timingConfig={timingConfig}
        onOpenTimingModal={() => setIsTimingModalOpen(true)}
        status={status}
        onReset={handleReset}
      />

      {/* Research Brief Modal */}
      <ResearchBriefModal
        isOpen={isBriefModalOpen}
        topic={topic}
        modelEngine={modelEngine}
        onClose={() => setIsBriefModalOpen(false)}
        researchBrief={researchBrief}
        onSave={(updatedBrief) => {
          setResearchBrief(updatedBrief);
          setTopic(updatedBrief.question);
        }}
      />

      {/* Evidence Explorer Modal */}
      <EvidenceExplorerModal
        preset={currentPreset}
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        onInjectEvidence={(evidenceText) => {
          setUserInterjectionInput(evidenceText);
        }}
        onSelectDebateQuestion={(questionText, customStances) => {
          setTopic(questionText);
          if (customStances) setStanceCards(customStances);
          handleReset();
        }}
      />

      {/* 5 Live Cancer Research Controversies Modal */}
      <CancerControversiesModal
        isOpen={isControversiesModalOpen}
        onClose={() => setIsControversiesModalOpen(false)}
        onSelectControversy={(controversy) => {
          handleSelectControversy(controversy);
          setIsControversiesModalOpen(false);
        }}
        onApplyResearchBrief={(brief) => {
          setResearchBrief(brief);
          setTopic(brief.question);
        }}
      />

      {/* Time Windows & Schedule Modal */}
      <TimingScheduleModal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
        timingConfig={timingConfig}
        onChangeTimingConfig={(newConfig) => setTimingConfig(newConfig)}
        totalElapsedSeconds={totalElapsedSeconds}
        numRounds={numRounds}
        currentRoundIndex={activeViewingRoundIndex}
      />

      {/* Saved Debates History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0e1117] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                <History className="text-indigo-400" size={18} />
                Saved Debates Archive
              </h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <DebateHistory
              history={savedDebates}
              onLoadDebate={(id) => {
                handleLoadDebate(id);
                setIsHistoryModalOpen(false);
              }}
              onDeleteDebate={handleDeleteDebate}
              onDownloadDebate={handleDownloadSavedDebate}
              currentDebateId={sessionId}
            />
          </div>
        </div>
      )}

      {/* Transcript & Report Modal */}
      <TranscriptReportModal 
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        session={{
          id: sessionId || 'live-session',
          topic,
          format,
          agents,
          rounds,
          judgeResult,
          researchBrief,
          timestamp: new Date().toISOString(),
          status,
          totalElapsedSeconds
        }}
      />
    </div>
  );
}
