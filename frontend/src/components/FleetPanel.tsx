import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import {
  Plus,
  Bot,
  Battery,
  Package,
  Zap,
  Settings,
  Shield,
} from 'lucide-react';
import { useAgentStore, createDefaultAgent } from '../stores';
import { useMapStore } from '../stores';
import { generateId, AGENT_STATUS_COLORS } from '../utils';
import type { Agent, AgentType } from '../types';

// Available access profiles for restricted areas
const ACCESS_PROFILES = [
  { id: 'GENERAL', label: 'General', description: 'Standard corridors and open areas' },
  { id: 'WARD', label: 'Ward', description: 'Patient ward areas' },
  { id: 'ICU', label: 'ICU', description: 'Intensive Care Unit' },
  { id: 'OR', label: 'Operating Room', description: 'Surgical suites' },
  { id: 'PHARMACY', label: 'Pharmacy', description: 'Medication storage' },
  { id: 'EMERGENCY', label: 'Emergency', description: 'Emergency department' },
  { id: 'SUPPLY', label: 'Supply', description: 'Supply storage areas' },
] as const;

export const FleetPanel = () => {
  const agents = useAgentStore((s) => s.agents);
  const addAgent = useAgentStore((s) => s.addAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const setAgentPool = useAgentStore((s) => s.setAgentPool);
  const activeFloorId = useMapStore((s) => s.activeFloorId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<AgentType>('CART');

  // Edit agent state
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editAccessProfiles, setEditAccessProfiles] = useState<string[]>([]);
  const [editPool, setEditPool] = useState<'URGENT' | 'NON_URGENT'>('NON_URGENT');

  const handleAddAgent = () => {
    if (!newAgentName || !activeFloorId) return;

    const agent = createDefaultAgent(
      generateId('agent'),
      newAgentName,
      newAgentType,
      { x: 10, y: 10 },
      activeFloorId
    );
    addAgent(agent);
    setNewAgentName('');
    setIsDialogOpen(false);
  };

  const handleStartEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setEditAccessProfiles([...agent.accessProfiles]);
    setEditPool(agent.pool);
  };

  const handleSaveEdit = () => {
    if (!editingAgent) return;
    updateAgent(editingAgent.id, { accessProfiles: editAccessProfiles });
    setAgentPool(editingAgent.id, editPool);
    setEditingAgent(null);
  };

  const handleToggleProfile = (profileId: string) => {
    setEditAccessProfiles((prev) =>
      prev.includes(profileId)
        ? prev.filter((p) => p !== profileId)
        : [...prev, profileId]
    );
  };

  const urgentPoolAgents = agents.filter((a) => a.pool === 'URGENT');
  const nonUrgentPoolAgents = agents.filter((a) => a.pool === 'NON_URGENT');

  const AgentCard = ({ agent }: { agent: Agent }) => (
    <Card key={agent.id} className="mb-2">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <CardTitle className="text-sm">{agent.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              style={{
                backgroundColor: AGENT_STATUS_COLORS[agent.status] + '20',
                color: AGENT_STATUS_COLORS[agent.status],
                borderColor: AGENT_STATUS_COLORS[agent.status],
              }}
              variant="outline"
            >
              {agent.status}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleStartEdit(agent)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Battery className="h-3 w-3" />
            <Progress value={agent.battery} className="h-2 flex-1" />
            <span>{Math.round(agent.battery)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Payload: {agent.currentPayload}/{agent.payloadLimit} kg
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Speed: {agent.speed} c/s
            </span>
          </div>
          {/* Access Profiles */}
          <div className="flex items-center gap-1 flex-wrap">
            <Shield className="h-3 w-3 text-muted-foreground" />
            {agent.accessProfiles.map((profile) => (
              <Badge key={profile} variant="outline" className="text-[10px] py-0 px-1">
                {profile}
              </Badge>
            ))}
          </div>
          {agent.inventorySlots.length > 0 && (
            <div className="mt-2">
              <p className="text-muted-foreground">Inventory:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {agent.inventorySlots.map((slot, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {slot.itemType}: {slot.quantity}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {agent.currentJobId && (
            <p className="text-muted-foreground">
              Job: {agent.currentJobId.slice(0, 8)}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fleet Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Agent name"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newAgentType}
                  onValueChange={(v) => setNewAgentType(v as AgentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CART">Cart (50kg payload, 1 cell/s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddAgent} className="w-full">
                Add Agent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Urgent Pool */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Badge variant="destructive">Urgent Pool</Badge>
            <span className="text-muted-foreground">
              ({urgentPoolAgents.length} agents)
            </span>
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Reserved for Immediate + Emergency jobs
          </p>
          {urgentPoolAgents.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              No agents in urgent pool
            </Card>
          ) : (
            urgentPoolAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
          )}
        </div>

        {/* Non-Urgent Pool */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Badge variant="secondary">Non-Urgent Pool</Badge>
            <span className="text-muted-foreground">
              ({nonUrgentPoolAgents.length} agents)
            </span>
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            For Urgent, Semi-urgent, Non-urgent jobs
          </p>
          {nonUrgentPoolAgents.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              No agents in non-urgent pool
            </Card>
          ) : (
            nonUrgentPoolAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
          )}
        </div>
      </div>

      {agents.length === 0 && (
        <Card className="p-8 text-center">
          <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            No agents configured. Add carts to start deliveries.
          </p>
        </Card>
      )}

      {/* Edit Agent Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Edit {editingAgent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {/* Pool Selection */}
            <div>
              <Label className="text-sm font-medium">Agent Pool</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Urgent pool is reserved for Immediate and Emergency jobs
              </p>
              <Select
                value={editPool}
                onValueChange={(v) => setEditPool(v as 'URGENT' | 'NON_URGENT')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENT">Urgent Pool</SelectItem>
                  <SelectItem value="NON_URGENT">Non-Urgent Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Access Profiles */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Area Access Profiles
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Select which restricted areas this agent can access
              </p>
              <div className="space-y-2">
                {ACCESS_PROFILES.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`profile-${profile.id}`}
                      checked={editAccessProfiles.includes(profile.id)}
                      onCheckedChange={() => handleToggleProfile(profile.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`profile-${profile.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {profile.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingAgent(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
