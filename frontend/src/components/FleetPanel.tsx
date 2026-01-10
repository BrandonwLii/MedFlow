import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
  Plus,
  Bot,
  Battery,
  Package,
  Zap,
} from 'lucide-react';
import { useAgentStore, createDefaultAgent } from '../stores';
import { useMapStore } from '../stores';
import { generateId, AGENT_STATUS_COLORS } from '../utils';
import type { Agent, AgentType } from '../types';

export const FleetPanel = () => {
  const agents = useAgentStore((s) => s.agents);
  const addAgent = useAgentStore((s) => s.addAgent);
  const activeFloorId = useMapStore((s) => s.activeFloorId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentType, setNewAgentType] = useState<AgentType>('CART');

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
    </div>
  );
};
