import { Card } from './ui/card';
import { Progress } from './ui/progress';
import {
  Zap,
  Cloud,
  Clock,
  CheckCircle2,
  Package,
  TrendingDown,
  Leaf,
} from 'lucide-react';
import { useSimulationStore, useJobStore, useAgentStore } from '../stores';
import { formatEnergy, formatCO2, formatTime } from '../utils';

export const MetricsPanel = () => {
  const currentPlan = useSimulationStore((s) => s.currentPlan);
  const baselineComparison = useSimulationStore((s) => s.baselineComparison);
  const replanCount = useSimulationStore((s) => s.replanCount);
  const jobs = useJobStore((s) => s.jobs);
  const agents = useAgentStore((s) => s.agents);

  const deliveredJobs = jobs.filter((j) => j.state === 'DELIVERED');
  const activeJobs = jobs.filter(
    (j) => !['DELIVERED', 'CANCELLED', 'INFEASIBLE'].includes(j.state)
  );
  const lateJobs = jobs.filter(
    (j) => j.state === 'DELIVERED' && j.progress?.deliveredTime && j.progress.deliveredTime > j.deadline
  );

  const onTimePercentage =
    deliveredJobs.length > 0
      ? ((deliveredJobs.length - lateJobs.length) / deliveredJobs.length) * 100
      : 100;

  const metrics = currentPlan?.metrics || {
    totalEnergyWh: 0,
    totalCO2g: 0,
    idleWaitingSeconds: 0,
    idleChargingSeconds: 0,
    onTimePercentage: 100,
    batchedDeliveries: 0,
    deadheadingPercentage: 0,
    energyPerItem: 0,
    lowEmissionChoicesPercentage: 0,
  };

  const idleAgents = agents.filter((a) => a.status === 'IDLE').length;
  const chargingAgents = agents.filter((a) => a.status === 'CHARGING').length;
  const activeAgents = agents.filter(
    (a) => !['IDLE', 'CHARGING', 'FAILED'].includes(a.status)
  ).length;

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-medium">Metrics</h3>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <Card className="p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Package className="h-3 w-3" />
            Jobs
          </div>
          <div className="text-lg font-semibold">
            {deliveredJobs.length}/{jobs.length}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {activeJobs.length} active
          </div>
        </Card>

        <Card className="p-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            On-Time
          </div>
          <div className="text-lg font-semibold">{onTimePercentage.toFixed(0)}%</div>
          <Progress value={onTimePercentage} className="h-1 mt-1" />
        </Card>
      </div>

      {/* Energy & CO2 */}
      <Card className="p-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            Energy
          </div>
          <span className="font-medium">{formatEnergy(metrics.totalEnergyWh)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Cloud className="h-3 w-3 text-blue-500" />
            CO2
          </div>
          <span className="font-medium">{formatCO2(metrics.totalCO2g)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Leaf className="h-3 w-3 text-green-500" />
            Low-Emission
          </div>
          <span className="font-medium">{metrics.lowEmissionChoicesPercentage.toFixed(0)}%</span>
        </div>
      </Card>

      {/* Idle Time */}
      <Card className="p-2 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Idle (Waiting)
          </div>
          <span>{formatTime(metrics.idleWaitingSeconds)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Idle (Charging)
          </div>
          <span>{formatTime(metrics.idleChargingSeconds)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Deadheading
          </div>
          <span>{metrics.deadheadingPercentage.toFixed(1)}%</span>
        </div>
      </Card>

      {/* Agent Status */}
      <Card className="p-2">
        <div className="text-xs text-muted-foreground mb-1">Agent Status</div>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-green-500" />
            {idleAgents} idle
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-blue-500" />
            {activeAgents} active
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 bg-amber-500" />
            {chargingAgents} charging
          </span>
        </div>
      </Card>

      {/* Baseline Comparison */}
      {baselineComparison && (
        <Card className="p-2 bg-green-500/10 border-green-500/30">
          <div className="text-xs font-medium text-green-500 mb-1">vs Baseline</div>
          <div className="grid grid-cols-2 gap-1 text-[10px]">
            <div>
              Energy: <span className="text-green-500">-{baselineComparison.energySavedPercentage.toFixed(0)}%</span>
            </div>
            <div>
              CO2: <span className="text-green-500">-{baselineComparison.co2SavedPercentage.toFixed(0)}%</span>
            </div>
            <div>
              Deadhead: <span className="text-green-500">-{baselineComparison.deadheadingReduction.toFixed(0)}%</span>
            </div>
            <div>
              On-Time: <span className="text-green-500">+{baselineComparison.onTimeRateDifference.toFixed(0)}%</span>
            </div>
          </div>
        </Card>
      )}

      {/* System Stats */}
      <div className="text-[10px] text-muted-foreground text-center">
        {replanCount} replans • {agents.length} agents • {metrics.batchedDeliveries} batched
      </div>
    </div>
  );
};
