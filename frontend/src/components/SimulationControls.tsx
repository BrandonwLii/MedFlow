import { useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Play, Pause, Square, RotateCcw, Zap, ChevronDown } from 'lucide-react';
import { useSimulationStore, useMapStore, useAgentStore, useJobStore, useTriageStore, useEventStore } from '../stores';
import { generateScenario, AVAILABLE_SCENARIOS, type ScenarioType } from '../utils/mockData';

export const SimulationControls = () => {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('rush-hour');

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

  const handleLoadScenario = (scenarioType: ScenarioType) => {
    setSelectedScenario(scenarioType);
    const scenario = generateScenario(scenarioType);
    setMap(scenario.map);
    setAgents(scenario.agents);
    setJobs(scenario.jobs);
    setCases(scenario.triageCases);
    clearEvents();
    reset();
    addEvent({
      type: 'MAP_CHANGED',
      timestamp: 0,
      summary: `Loaded: ${scenario.name}`,
      details: `${scenario.agents.length} agents, ${scenario.jobs.length} jobs`,
    });
  };

  const handleReset = () => {
    // Reload the current scenario to reset everything
    const scenario = generateScenario(selectedScenario);
    setMap(scenario.map);
    setAgents(scenario.agents);
    setJobs(scenario.jobs);
    setCases(scenario.triageCases);
    clearEvents();
    reset();
  };

  const handleStop = () => {
    stop();
  };

  const currentScenarioInfo = AVAILABLE_SCENARIOS.find(s => s.id === selectedScenario);

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
        <Button variant="outline" size="sm" onClick={handleStop}>
          <Square className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            <Zap className="mr-2 h-4 w-4" />
            {currentScenarioInfo?.name || 'Demo'}
            <ChevronDown className="ml-2 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {AVAILABLE_SCENARIOS.map((scenario) => (
            <DropdownMenuItem
              key={scenario.id}
              onClick={() => handleLoadScenario(scenario.id)}
              className="flex flex-col items-start py-2"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">{scenario.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  scenario.complexity === 'Simple' ? 'bg-green-500/20 text-green-500' :
                  scenario.complexity === 'Medium' ? 'bg-amber-500/20 text-amber-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {scenario.complexity}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {scenario.description}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {scenario.agents} agents • {scenario.jobs} jobs
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
