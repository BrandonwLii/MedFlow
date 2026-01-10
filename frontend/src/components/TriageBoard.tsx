import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  MapPin,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTriageStore, useJobStore, useMapStore, useEventStore, createEvent } from '../stores';
import { useSimulationStore } from '../stores';
import { generateId } from '../utils';
import type { TriageCase, TriageLevel, TriageBundle, Job } from '../types';

const TRIAGE_BUNDLES_DATA: Record<TriageBundle, { name: string; items: { type: string; quantity: number; weight: number }[] }> = {
  CRASH_CODE_BLUE: {
    name: 'Crash/Code Blue',
    items: [
      { type: 'Defibrillator', quantity: 1, weight: 5 },
      { type: 'Emergency Meds', quantity: 1, weight: 0.5 },
      { type: 'IV Kit', quantity: 2, weight: 1 },
    ],
  },
  TRAUMA: {
    name: 'Trauma',
    items: [
      { type: 'Blood Products', quantity: 2, weight: 1 },
      { type: 'Surgical Kit', quantity: 1, weight: 3 },
      { type: 'Bandages', quantity: 5, weight: 0.5 },
    ],
  },
  OR_PREP: {
    name: 'OR Prep',
    items: [
      { type: 'Surgical Instruments', quantity: 1, weight: 4 },
      { type: 'Sterile Drapes', quantity: 3, weight: 1 },
      { type: 'Anesthesia Supplies', quantity: 1, weight: 2 },
    ],
  },
  ISOLATION: {
    name: 'Isolation',
    items: [
      { type: 'PPE Kit', quantity: 5, weight: 0.5 },
      { type: 'Isolation Gowns', quantity: 10, weight: 1 },
      { type: 'N95 Masks', quantity: 20, weight: 0.2 },
    ],
  },
};

const LEVEL_TO_PRIORITY: Record<TriageLevel, string> = {
  1: 'IMMEDIATE',
  2: 'EMERGENCY',
  3: 'URGENT',
  4: 'SEMI_URGENT',
  5: 'NON_URGENT',
};

const LEVEL_COLORS: Record<TriageLevel, string> = {
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
  5: '#3b82f6',
};

export const TriageBoard = () => {
  const cases = useTriageStore((s) => s.cases);
  const addCase = useTriageStore((s) => s.addCase);
  const escalate = useTriageStore((s) => s.escalate);
  const deescalate = useTriageStore((s) => s.deescalate);
  const resolveCase = useTriageStore((s) => s.resolveCase);
  const linkJob = useTriageStore((s) => s.linkJob);

  const addJob = useJobStore((s) => s.addJob);
  const jobs = useJobStore((s) => s.jobs);
  const activeFloorId = useMapStore((s) => s.activeFloorId);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const addEvent = useEventStore((s) => s.addEvent);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    level: 2 as TriageLevel,
    bundle: 'TRAUMA' as TriageBundle,
    locationX: 10,
    locationY: 10,
    notes: '',
  });

  const activeCases = cases.filter((c) => c.status === 'ACTIVE');
  const resolvedCases = cases.filter((c) => c.status === 'RESOLVED');

  const handleAddCase = () => {
    if (!activeFloorId) return;

    const caseId = generateId('triage');
    const triageCase: TriageCase = {
      id: caseId,
      level: newCase.level,
      location: {
        position: { x: newCase.locationX, y: newCase.locationY },
        floorId: activeFloorId,
      },
      bundle: newCase.bundle,
      linkedJobIds: [],
      status: 'ACTIVE',
      createdAt: currentTime,
      notes: newCase.notes,
    };

    addCase(triageCase);
    addEvent(createEvent.triageCreated(
      caseId,
      newCase.level,
      currentTime,
      { x: newCase.locationX, y: newCase.locationY },
      activeFloorId
    ));

    // Create jobs from bundle
    const bundleData = TRIAGE_BUNDLES_DATA[newCase.bundle];
    const priority = LEVEL_TO_PRIORITY[newCase.level] as any;

    bundleData.items.forEach((item) => {
      const jobId = generateId('job');
      const job: Job = {
        id: jobId,
        pickup: {
          position: { x: 20, y: 5 }, // Default supply room
          floorId: activeFloorId,
        },
        dropoff: {
          position: { x: newCase.locationX, y: newCase.locationY },
          floorId: activeFloorId,
        },
        item: {
          type: item.type,
          quantity: item.quantity,
          weight: item.weight,
        },
        priority,
        deadline: currentTime + (newCase.level === 1 ? 120 : newCase.level === 2 ? 180 : 300),
        createdAt: currentTime,
        state: 'QUEUED',
        triageCaseId: caseId,
        pickupServiceTime: 15,
        dropoffServiceTime: 20,
      };
      addJob(job);
      linkJob(caseId, jobId);
    });

    setIsDialogOpen(false);
    setNewCase({
      level: 2,
      bundle: 'TRAUMA',
      locationX: 10,
      locationY: 10,
      notes: '',
    });
  };

  const handleEscalate = (caseId: string, currentLevel: TriageLevel) => {
    const oldLevel = currentLevel;
    const newLevel = escalate(caseId);
    if (newLevel !== oldLevel) {
      addEvent(createEvent.triageEscalated(caseId, oldLevel, newLevel, currentTime));
    }
  };

  const handleDeescalate = (caseId: string) => {
    deescalate(caseId);
  };

  const CaseCard = ({ triageCase }: { triageCase: TriageCase }) => {
    const linkedJobs = jobs.filter((j) => j.triageCaseId === triageCase.id);
    const deliveredCount = linkedJobs.filter((j) => j.state === 'DELIVERED').length;
    const totalCount = linkedJobs.length;

    return (
      <Card className="mb-3">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                style={{
                  backgroundColor: LEVEL_COLORS[triageCase.level] + '20',
                  color: LEVEL_COLORS[triageCase.level],
                  borderColor: LEVEL_COLORS[triageCase.level],
                }}
                variant="outline"
              >
                Level {triageCase.level}
              </Badge>
              <span className="text-sm font-medium">
                → {LEVEL_TO_PRIORITY[triageCase.level].replace('_', '-')}
              </span>
            </div>
            {triageCase.status === 'ACTIVE' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleEscalate(triageCase.id, triageCase.level)}
                  disabled={triageCase.level === 1}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDeescalate(triageCase.id)}
                  disabled={triageCase.level === 5}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>
                Location: ({triageCase.location.position.x}, {triageCase.location.position.y})
              </span>
            </div>
            {triageCase.bundle && (
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3" />
                <span>Bundle: {TRIAGE_BUNDLES_DATA[triageCase.bundle].name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              <span>
                Deliveries: {deliveredCount}/{totalCount} completed
              </span>
            </div>
            {triageCase.notes && (
              <p className="text-muted-foreground">{triageCase.notes}</p>
            )}
            {triageCase.status === 'ACTIVE' && deliveredCount === totalCount && totalCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => resolveCase(triageCase.id)}
              >
                <CheckCircle2 className="mr-2 h-3 w-3" />
                Mark Resolved
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Triage Board</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Triage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Triage Case</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Triage Level</Label>
                <Select
                  value={String(newCase.level)}
                  onValueChange={(v) => setNewCase({ ...newCase, level: parseInt(v) as TriageLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 (Immediate)</SelectItem>
                    <SelectItem value="2">Level 2 (Emergency)</SelectItem>
                    <SelectItem value="3">Level 3 (Urgent)</SelectItem>
                    <SelectItem value="4">Level 4 (Semi-Urgent)</SelectItem>
                    <SelectItem value="5">Level 5 (Non-Urgent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supply Bundle</Label>
                <Select
                  value={newCase.bundle}
                  onValueChange={(v) => setNewCase({ ...newCase, bundle: v as TriageBundle })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIAGE_BUNDLES_DATA).map(([key, bundle]) => (
                      <SelectItem key={key} value={key}>
                        {bundle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location (X, Y)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={newCase.locationX}
                    onChange={(e) => setNewCase({ ...newCase, locationX: parseInt(e.target.value) || 0 })}
                  />
                  <Input
                    type="number"
                    value={newCase.locationY}
                    onChange={(e) => setNewCase({ ...newCase, locationY: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newCase.notes}
                  onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>
              <Button onClick={handleAddCase} className="w-full">
                Create Triage Case
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Triage Level to Priority Mapping */}
      <Card className="p-3">
        <p className="mb-2 text-xs font-medium">Triage → Priority Mapping</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {([1, 2, 3, 4, 5] as TriageLevel[]).map((level) => (
            <Badge
              key={level}
              variant="outline"
              style={{
                backgroundColor: LEVEL_COLORS[level] + '20',
                color: LEVEL_COLORS[level],
                borderColor: LEVEL_COLORS[level],
              }}
            >
              L{level} → {LEVEL_TO_PRIORITY[level].replace('_', '-')}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Active Cases */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-4 w-4 text-red-500" />
          Active Cases ({activeCases.length})
        </h3>
        {activeCases.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            No active triage cases
          </Card>
        ) : (
          activeCases.map((c) => <CaseCard key={c.id} triageCase={c} />)
        )}
      </div>

      {/* Resolved Cases */}
      {resolvedCases.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            Resolved ({resolvedCases.length})
          </h3>
          {resolvedCases.map((c) => (
            <CaseCard key={c.id} triageCase={c} />
          ))}
        </div>
      )}
    </div>
  );
};
