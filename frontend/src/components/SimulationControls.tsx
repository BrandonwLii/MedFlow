import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Square, RotateCcw, Zap } from 'lucide-react';
import { useSimulationStore, useMapStore, useAgentStore, useJobStore, useTriageStore, useEventStore } from '../stores';
import { generateMockScenario } from '../utils/mockData';

export const SimulationControls = () => {
  const simState = useSimulationStore((s) => s.state);
  const speedMultiplier = useSimulationStore((s) => s.config.speedMultiplier);
  const start = useSimulationStore((s) => s.start);
  const pause = useSimulationStore((s) => s.pause);
  const stop = useSimulationStore((s) => s.stop);
  const reset = useSimulationStore((s) => s.reset);
  const setSpeedMultiplier = useSimulationStore((s) => s.setSpeedMultiplier);

  const setMap = useMapStore((s) => s.setMap);
  const setAgents = useAgentStore((s) => s.setAgents);
  const setJobs = useJobStore((s) => s.setJobs);
  const setCases = useTriageStore((s) => s.setCases);
  const addEvent = useEventStore((s) => s.addEvent);
  const clearEvents = useEventStore((s) => s.clearEvents);

  const handleGenerateMock = () => {
    const scenario = generateMockScenario();
    setMap(scenario.map);
    setAgents(scenario.agents);
    setJobs(scenario.jobs);
    setCases(scenario.triageCases);
    clearEvents();
    reset();
    addEvent({
      type: 'MAP_CHANGED',
      timestamp: 0,
      summary: 'Mock scenario loaded',
      details: `${scenario.agents.length} agents, ${scenario.jobs.length} jobs`,
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {simState === 'RUNNING' ? (
          <Button variant="outline" size="sm" onClick={pause}>
            <Pause className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={start}>
            <Play className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={stop}>
          <Square className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed:</span>
        <Slider
          value={[speedMultiplier]}
          min={0.5}
          max={10}
          step={0.5}
          className="w-24"
          onValueChange={([value]) => setSpeedMultiplier(value)}
        />
        <span className="w-8 text-xs">{speedMultiplier}x</span>
      </div>

      <Button variant="secondary" size="sm" onClick={handleGenerateMock}>
        <Zap className="mr-2 h-4 w-4" />
        Demo
      </Button>
    </div>
  );
};
