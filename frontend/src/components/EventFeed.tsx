import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  MapPin,
  Package,
  Bot,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { useEventStore } from '../stores';
import { formatTime } from '../utils';
import type { EventType } from '../types';

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  JOB_CREATED: <Package className="h-3 w-3" />,
  JOB_ASSIGNED: <Package className="h-3 w-3" />,
  JOB_COMPLETED: <Check className="h-3 w-3" />,
  JOB_DELAYED: <AlertTriangle className="h-3 w-3" />,
  JOB_INFEASIBLE: <Ban className="h-3 w-3" />,
  JOB_CANCELLED: <Ban className="h-3 w-3" />,
  TRIAGE_CREATED: <AlertTriangle className="h-3 w-3" />,
  TRIAGE_ESCALATED: <AlertTriangle className="h-3 w-3" />,
  TRIAGE_DEESCALATED: <Info className="h-3 w-3" />,
  TRIAGE_RESOLVED: <Check className="h-3 w-3" />,
  ZONE_BLOCKED: <MapPin className="h-3 w-3" />,
  ZONE_UNBLOCKED: <MapPin className="h-3 w-3" />,
  AGENT_FAILED: <Bot className="h-3 w-3" />,
  AGENT_DELAYED: <Bot className="h-3 w-3" />,
  AGENT_LOW_BATTERY: <Bot className="h-3 w-3" />,
  INVENTORY_LOW: <Package className="h-3 w-3" />,
  RESTOCK_REQUIRED: <Package className="h-3 w-3" />,
  REPLAN_COMPLETED: <RefreshCw className="h-3 w-3" />,
  MAP_CHANGED: <MapPin className="h-3 w-3" />,
  PREEMPTION: <AlertTriangle className="h-3 w-3" />,
};

const EVENT_COLORS: Record<string, string> = {
  JOB_CREATED: 'text-blue-500',
  JOB_ASSIGNED: 'text-violet-500',
  JOB_COMPLETED: 'text-green-500',
  JOB_DELAYED: 'text-amber-500',
  JOB_INFEASIBLE: 'text-red-500',
  JOB_CANCELLED: 'text-gray-500',
  TRIAGE_CREATED: 'text-red-500',
  TRIAGE_ESCALATED: 'text-red-500',
  TRIAGE_DEESCALATED: 'text-green-500',
  TRIAGE_RESOLVED: 'text-green-500',
  ZONE_BLOCKED: 'text-amber-500',
  ZONE_UNBLOCKED: 'text-green-500',
  AGENT_FAILED: 'text-red-500',
  AGENT_DELAYED: 'text-amber-500',
  AGENT_LOW_BATTERY: 'text-amber-500',
  INVENTORY_LOW: 'text-amber-500',
  RESTOCK_REQUIRED: 'text-amber-500',
  REPLAN_COMPLETED: 'text-blue-500',
  MAP_CHANGED: 'text-blue-500',
  PREEMPTION: 'text-amber-500',
};

export const EventFeed = () => {
  const events = useEventStore((s) => s.events);
  const unacknowledgedCount = useEventStore((s) => s.unacknowledgedCount);
  const acknowledgeEvent = useEventStore((s) => s.acknowledgeEvent);
  const acknowledgeAll = useEventStore((s) => s.acknowledgeAll);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h3 className="text-sm font-medium">Events</h3>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5 text-xs">
              {unacknowledgedCount}
            </Badge>
          )}
        </div>
        {unacknowledgedCount > 0 && (
          <Button variant="ghost" size="sm" onClick={acknowledgeAll}>
            <CheckCheck className="mr-1 h-3 w-3" />
            Ack All
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {events.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No events yet
            </div>
          ) : (
            events.map((event) => (
              <Card
                key={event.id}
                className={`p-2 ${!event.acknowledged ? 'border-l-2 border-l-blue-500 bg-blue-500/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 ${EVENT_COLORS[event.type] || 'text-muted-foreground'}`}>
                    {EVENT_ICONS[event.type] || <Info className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-medium leading-tight">{event.summary}</p>
                      {!event.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 shrink-0"
                          onClick={() => acknowledgeEvent(event.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {event.details && (
                      <p className="text-[10px] text-muted-foreground">{event.details}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(event.timestamp)}
                    </p>
                    {event.impact && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {event.impact.timeDelta !== undefined && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            +{formatTime(event.impact.timeDelta)}
                          </Badge>
                        )}
                        {event.impact.energyDelta !== undefined && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            +{event.impact.energyDelta.toFixed(1)} Wh
                          </Badge>
                        )}
                        {event.impact.lateJobs && event.impact.lateJobs.length > 0 && (
                          <Badge variant="destructive" className="text-[10px] py-0">
                            {event.impact.lateJobs.length} may be late
                          </Badge>
                        )}
                      </div>
                    )}
                    {event.highlightPosition && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[10px]"
                      >
                        <MapPin className="mr-1 h-2 w-2" />
                        Show on map
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
