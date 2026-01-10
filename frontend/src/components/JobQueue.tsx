import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Clock,
  MapPin,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { useJobStore, useMapStore, useEventStore, createEvent } from '../stores';
import { useSimulationStore } from '../stores';
import { generateId, PRIORITY_COLORS, JOB_STATE_COLORS, formatTime } from '../utils';
import type { Job, PriorityTier } from '../types';

const PRIORITY_OPTIONS: { value: PriorityTier; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'SEMI_URGENT', label: 'Semi-Urgent' },
  { value: 'NON_URGENT', label: 'Non-Urgent' },
];

export const JobQueue = () => {
  const jobs = useJobStore((s) => s.jobs);
  const addJob = useJobStore((s) => s.addJob);
  const setPriority = useJobStore((s) => s.setPriority);
  const activeFloorId = useMapStore((s) => s.activeFloorId);
  const currentTime = useSimulationStore((s) => s.currentTime);
  const addEvent = useEventStore((s) => s.addEvent);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    itemType: '',
    quantity: 1,
    priority: 'URGENT' as PriorityTier,
    deadline: 300,
    pickupX: 20,
    pickupY: 5,
    dropoffX: 10,
    dropoffY: 10,
  });
  const immediateJobs = jobs.filter((j) => j.priority === 'IMMEDIATE' && j.state !== 'DELIVERED' && j.state !== 'CANCELLED');
  const emergencyJobs = jobs.filter((j) => j.priority === 'EMERGENCY' && j.state !== 'DELIVERED' && j.state !== 'CANCELLED');
  const otherJobs = jobs.filter(
    (j) => !['IMMEDIATE', 'EMERGENCY'].includes(j.priority) && j.state !== 'DELIVERED' && j.state !== 'CANCELLED'
  );
  const completedJobs = jobs.filter((j) => j.state === 'DELIVERED' || j.state === 'CANCELLED');

  const handleAddJob = () => {
    if (!newJob.itemType || !activeFloorId) return;

    const job: Job = {
      id: generateId('job'),
      pickup: {
        position: { x: newJob.pickupX, y: newJob.pickupY },
        floorId: activeFloorId,
      },
      dropoff: {
        position: { x: newJob.dropoffX, y: newJob.dropoffY },
        floorId: activeFloorId,
      },
      item: {
        type: newJob.itemType,
        quantity: newJob.quantity,
        weight: newJob.quantity * 0.5,
      },
      priority: newJob.priority,
      deadline: currentTime + newJob.deadline,
      createdAt: currentTime,
      state: 'QUEUED',
      pickupServiceTime: 15,
      dropoffServiceTime: 20,
    };

    addJob(job);
    addEvent(createEvent.jobCreated(job.id, job.priority, currentTime));
    setIsDialogOpen(false);
    setNewJob({
      itemType: '',
      quantity: 1,
      priority: 'URGENT',
      deadline: 300,
      pickupX: 20,
      pickupY: 5,
      dropoffX: 10,
      dropoffY: 10,
    });
  };

  const handleEscalate = (jobId: string, currentPriority: PriorityTier) => {
    const priorities: PriorityTier[] = ['IMMEDIATE', 'EMERGENCY', 'URGENT', 'SEMI_URGENT', 'NON_URGENT'];
    const currentIndex = priorities.indexOf(currentPriority);
    if (currentIndex > 0) {
      setPriority(jobId, priorities[currentIndex - 1]);
    }
  };

  const handleDefer = (jobId: string, currentPriority: PriorityTier) => {
    const priorities: PriorityTier[] = ['IMMEDIATE', 'EMERGENCY', 'URGENT', 'SEMI_URGENT', 'NON_URGENT'];
    const currentIndex = priorities.indexOf(currentPriority);
    if (currentIndex < priorities.length - 1) {
      setPriority(jobId, priorities[currentIndex + 1]);
    }
  };

  const JobCard = ({ job }: { job: Job }) => {
    const timeRemaining = job.deadline - currentTime;
    const isLate = timeRemaining < 0;
    const isUrgent = timeRemaining < 60 && timeRemaining >= 0;

    return (
      <Card className="mb-2">
        <CardHeader className="py-2 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                style={{
                  backgroundColor: PRIORITY_COLORS[job.priority] + '20',
                  color: PRIORITY_COLORS[job.priority],
                  borderColor: PRIORITY_COLORS[job.priority],
                }}
                variant="outline"
              >
                {job.priority.replace('_', '-')}
              </Badge>
              <Badge
                style={{
                  backgroundColor: JOB_STATE_COLORS[job.state] + '20',
                  color: JOB_STATE_COLORS[job.state],
                }}
                variant="outline"
              >
                {job.state}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleEscalate(job.id, job.priority)}
                disabled={job.priority === 'IMMEDIATE'}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleDefer(job.id, job.priority)}
                disabled={job.priority === 'NON_URGENT'}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <Package className="h-3 w-3" />
              <span>
                {job.item.type} x{job.item.quantity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              <span>
                ({job.pickup?.position.x}, {job.pickup?.position.y}) → ({job.dropoff.position.x}, {job.dropoff.position.y})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span className={isLate ? 'text-red-500' : isUrgent ? 'text-amber-500' : ''}>
                {isLate ? 'LATE by ' + formatTime(Math.abs(timeRemaining)) : formatTime(timeRemaining) + ' remaining'}
              </span>
              {job.isLikelyLate && !isLate && (
                <Badge variant="destructive" className="text-[10px] py-0">
                  <AlertTriangle className="mr-1 h-2 w-2" />
                  Likely Late
                </Badge>
              )}
            </div>
            {job.assignedAgentId && (
              <div className="text-muted-foreground">
                Agent: {job.assignedAgentId.slice(0, 8)}...
              </div>
            )}
            {job.delayReason && (
              <div className="text-red-400">Reason: {job.delayReason}</div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Delivery Queue</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Delivery Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Item Type</Label>
                  <Input
                    value={newJob.itemType}
                    onChange={(e) => setNewJob({ ...newJob, itemType: e.target.value })}
                    placeholder="e.g., IV Fluids"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newJob.quantity}
                    onChange={(e) => setNewJob({ ...newJob, quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={newJob.priority}
                  onValueChange={(v) => setNewJob({ ...newJob, priority: v as PriorityTier })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deadline (seconds from now)</Label>
                <Input
                  type="number"
                  value={newJob.deadline}
                  onChange={(e) => setNewJob({ ...newJob, deadline: parseInt(e.target.value) || 300 })}
                  min={60}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pickup (X, Y)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newJob.pickupX}
                      onChange={(e) => setNewJob({ ...newJob, pickupX: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      value={newJob.pickupY}
                      onChange={(e) => setNewJob({ ...newJob, pickupY: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Dropoff (X, Y)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newJob.dropoffX}
                      onChange={(e) => setNewJob({ ...newJob, dropoffX: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      type="number"
                      value={newJob.dropoffY}
                      onChange={(e) => setNewJob({ ...newJob, dropoffY: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
              <Button onClick={handleAddJob} className="w-full">
                Create Job
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({immediateJobs.length + emergencyJobs.length + otherJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedJobs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 overflow-y-auto max-h-[calc(100vh-280px)]">
          {/* Immediate Jobs - Pinned */}
          {immediateJobs.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-500">
                <AlertTriangle className="h-4 w-4" />
                IMMEDIATE ({immediateJobs.length})
              </h3>
              {immediateJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Emergency Jobs - Pinned */}
          {emergencyJobs.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-500">
                <AlertTriangle className="h-4 w-4" />
                EMERGENCY ({emergencyJobs.length})
              </h3>
              {emergencyJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {/* Other Jobs */}
          {otherJobs.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Other ({otherJobs.length})
              </h3>
              {otherJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          {jobs.filter((j) => j.state !== 'DELIVERED' && j.state !== 'CANCELLED').length === 0 && (
            <Card className="p-8 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No active jobs in queue</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 overflow-y-auto max-h-[calc(100vh-280px)]">
          {completedJobs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No completed jobs yet</p>
            </Card>
          ) : (
            completedJobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
