import { useState, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import {
  Upload,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useSimulationStore, useEventStore, useMapStore, useAgentStore, useJobStore, useTriageStore } from './stores';
import { useSimulation } from './hooks/useSimulation';
import { MapEditor } from './components/MapEditor';
import { FleetPanel } from './components/FleetPanel';
import { JobQueue } from './components/JobQueue';
import { TriageBoard } from './components/TriageBoard';
import { EventFeed } from './components/EventFeed';
import { MetricsPanel } from './components/MetricsPanel';
import { SimulationControls } from './components/SimulationControls';
import type { Scenario } from './types';

const App = () => {
  const [activeTab, setActiveTab] = useState('map');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simState = useSimulationStore((s) => s.state);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const config = useSimulationStore((s) => s.config);
  const reset = useSimulationStore((s) => s.reset);
  const unacknowledgedCount = useEventStore((s) => s.unacknowledgedCount);
  const clearEvents = useEventStore((s) => s.clearEvents);

  const map = useMapStore((s) => s.map);
  const setMap = useMapStore((s) => s.setMap);
  const agents = useAgentStore((s) => s.agents);
  const setAgents = useAgentStore((s) => s.setAgents);
  const jobs = useJobStore((s) => s.jobs);
  const setJobs = useJobStore((s) => s.setJobs);
  const cases = useTriageStore((s) => s.cases);
  const setCases = useTriageStore((s) => s.setCases);

  // Initialize simulation hook
  useSimulation();

  // Export scenario to JSON file
  const handleExport = () => {
    const scenario: Scenario = {
      version: '1.0.0',
      name: 'MedFlow Scenario',
      map,
      agents,
      jobs,
      triageCases: cases,
      config,
    };

    const blob = new Blob([JSON.stringify(scenario, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medflow-scenario-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import scenario from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const scenario = JSON.parse(event.target?.result as string) as Scenario;
        setMap(scenario.map);
        setAgents(scenario.agents);
        setJobs(scenario.jobs);
        setCases(scenario.triageCases);
        clearEvents();
        reset();
      } catch (err) {
        console.error('Failed to import scenario:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">MedFlow</h1>
          <span className="text-sm text-muted-foreground">
            Hospital Supply Delivery Optimizer
          </span>
        </div>
        <div className="flex items-center gap-4">
          <SimulationControls />
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Map and Controls */}
        <div className="flex flex-1 flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col min-h-0">
            <div className="border-b px-4">
              <TabsList>
                <TabsTrigger value="map">Map Editor</TabsTrigger>
                <TabsTrigger value="fleet">Fleet</TabsTrigger>
                <TabsTrigger value="queue">
                  Queue
                </TabsTrigger>
                <TabsTrigger value="triage">
                  Triage
                  {unacknowledgedCount > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center bg-red-500 text-xs text-white">
                      {unacknowledgedCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="map" className="flex-1 m-0 p-0">
              <MapEditor />
            </TabsContent>
            <TabsContent value="fleet" className="flex-1 min-h-0 m-0 p-4 overflow-auto">
              <FleetPanel />
            </TabsContent>
            <TabsContent value="queue" className="flex-1 min-h-0 m-0 p-4 overflow-auto">
              <JobQueue />
            </TabsContent>
            <TabsContent value="triage" className="flex-1 min-h-0 m-0 p-4 overflow-auto">
              <TriageBoard />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Events and Metrics */}
        <div className="flex w-80 flex-col border-l">
          <div className="flex-1 overflow-hidden">
            <EventFeed />
          </div>
          <div className="border-t">
            <MetricsPanel />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex h-8 items-center justify-between border-t bg-muted/50 px-4 text-xs">
        <div className="flex items-center gap-4">
          <span>
            Status:{' '}
            <span
              className={
                simState === 'RUNNING'
                  ? 'text-green-500'
                  : simState === 'REPLANNING'
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
              }
            >
              {simState}
            </span>
          </span>
          <span>Time: {Math.floor(currentTime)}s</span>
        </div>
        <div className="flex items-center gap-4">
          {unacknowledgedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              {unacknowledgedCount} unread events
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;
