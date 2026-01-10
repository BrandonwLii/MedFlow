import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import {
  MousePointer2,
  Footprints,
  Square,
  AlertTriangle,
  Lock,
  Zap,
  Package,
  Clock,
  ArrowUpDown,
  Upload,
} from 'lucide-react';
import { useMapStore, useAgentStore, type MapTool } from '../stores';
import { createFloorFromImage, pixelToGrid, generateId, AGENT_STATUS_COLORS } from '../utils';
import type { Floor, GridCell } from '../types';

// Cache for loaded floor images
const imageCache = new Map<string, HTMLImageElement>();

const TOOLS: { id: MapTool; icon: React.ReactNode; label: string; color: string }[] = [
  { id: 'SELECT', icon: <MousePointer2 className="h-4 w-4" />, label: 'Select', color: '' },
  { id: 'WALKABLE', icon: <Footprints className="h-4 w-4" />, label: 'Walkable', color: 'bg-green-500/30' },
  { id: 'OBSTACLE', icon: <Square className="h-4 w-4" />, label: 'Obstacle', color: 'bg-gray-700' },
  { id: 'QUARANTINE', icon: <AlertTriangle className="h-4 w-4" />, label: 'Quarantine', color: 'bg-yellow-500/50' },
  { id: 'RESTRICTED', icon: <Lock className="h-4 w-4" />, label: 'Restricted', color: 'bg-red-500/30' },
  { id: 'CHARGER', icon: <Zap className="h-4 w-4" />, label: 'Charger', color: 'bg-blue-500' },
  { id: 'STORAGE', icon: <Package className="h-4 w-4" />, label: 'Storage', color: 'bg-purple-500' },
  { id: 'STAGING', icon: <Clock className="h-4 w-4" />, label: 'Staging', color: 'bg-cyan-500' },
  { id: 'CONNECTOR', icon: <ArrowUpDown className="h-4 w-4" />, label: 'Connector', color: 'bg-orange-500' },
];

export const MapEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const {
    map,
    activeFloorId,
    selectedTool,
    setSelectedTool,
    addFloor,
    setActiveFloor,
    setCellType,
    addCharger,
    addStoragePoint,
    addStagingArea,
  } = useMapStore();

  const agents = useAgentStore((s) => s.agents);
  // Memoize based on stringified positions to avoid re-renders on every tick
  const floorAgentsKey = useMemo(
    () => JSON.stringify(
      agents
        .filter((a) => a.floorId === activeFloorId)
        .map((a) => ({ id: a.id, x: a.position.x, y: a.position.y, status: a.status }))
    ),
    [agents, activeFloorId]
  );
  const floorAgents = useMemo(
    () => agents.filter((a) => a.floorId === activeFloorId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorAgentsKey]
  );

  const activeFloor = map.floors.find((f) => f.id === activeFloorId);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const floor = createFloorFromImage(
          `Floor ${map.floors.length + 1}`,
          event.target?.result as string,
          img.width,
          img.height,
          20
        );
        addFloor(floor);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Draw the canvas - uses cached images to avoid stale closure issues
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !activeFloor) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw floor image if available
    if (activeFloor.imageUrl) {
      const cacheKey = activeFloor.id + '_' + activeFloor.imageUrl;
      const cachedImg = imageCache.get(cacheKey);

      if (cachedImg && cachedImg.complete) {
        // Image already cached - draw synchronously
        ctx.drawImage(cachedImg, 0, 0, canvas.width, canvas.height);
        drawGrid(ctx, activeFloor, floorAgents);
      } else {
        // Load and cache the image
        const img = new Image();
        img.onload = () => {
          imageCache.set(cacheKey, img);
          // Only redraw if this is still the active floor
          if (canvasRef.current) {
            const newCtx = canvasRef.current.getContext('2d');
            if (newCtx) {
              newCtx.clearRect(0, 0, canvas.width, canvas.height);
              newCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
              // Get current agents from store to avoid stale closure
              const currentAgents = useAgentStore.getState().agents.filter(
                (a) => a.floorId === activeFloor.id
              );
              drawGrid(newCtx, activeFloor, currentAgents);
            }
          }
        };
        img.src = activeFloor.imageUrl;
      }
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawGrid(ctx, activeFloor, floorAgents);
    }
  }, [activeFloor, floorAgents]);

  const drawGrid = (ctx: CanvasRenderingContext2D, floor: Floor, agents: typeof floorAgents) => {
    const { gridSize, grid } = floor;

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const px = x * gridSize;
        const py = y * gridSize;

        // Draw cell based on type
        if (cell.isObstacle) {
          ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
          ctx.fillRect(px, py, gridSize, gridSize);
        } else if (cell.isQuarantine) {
          ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
          ctx.fillRect(px, py, gridSize, gridSize);
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, gridSize, gridSize);
        } else if (cell.isRestricted) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.fillRect(px, py, gridSize, gridSize);
        } else if (cell.walkable) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
          ctx.fillRect(px, py, gridSize, gridSize);
        }

        // Draw special markers
        if (cell.isCharger) {
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(px + gridSize / 2, py + gridSize / 2, gridSize / 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell.isStorage) {
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(px + 2, py + 2, gridSize - 4, gridSize - 4);
        } else if (cell.isStaging) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(px + 4, py + 4, gridSize - 8, gridSize - 8);
        } else if (cell.isConnector) {
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(px + gridSize / 2, py + 2);
          ctx.lineTo(px + gridSize - 2, py + gridSize / 2);
          ctx.lineTo(px + gridSize / 2, py + gridSize - 2);
          ctx.lineTo(px + 2, py + gridSize / 2);
          ctx.closePath();
          ctx.fill();
        }

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, gridSize, gridSize);
      }
    }

    // Draw agents on this floor
    for (const agent of agents) {
      const ax = agent.position.x * gridSize + gridSize / 2;
      const ay = agent.position.y * gridSize + gridSize / 2;
      const color = AGENT_STATUS_COLORS[agent.status] || '#22c55e';

      // Draw agent circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(ax, ay, gridSize / 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Draw agent border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ax, ay, gridSize / 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // Draw agent type indicator (C for cart)
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${gridSize / 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', ax, ay);
    }
  };

  // Handle mouse events for painting
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeFloor || selectedTool === 'SELECT') return;
    setIsPainting(true);
    paintAtPosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !activeFloor || selectedTool === 'SELECT') return;
    paintAtPosition(e);
  };

  const handleMouseUp = () => {
    setIsPainting(false);
  };

  const paintAtPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeFloor) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const gridPos = pixelToGrid(x, y, activeFloor.gridSize);

    // Apply tool
    const updates: Partial<GridCell> = {};
    switch (selectedTool) {
      case 'WALKABLE':
        updates.walkable = true;
        updates.isObstacle = false;
        break;
      case 'OBSTACLE':
        updates.isObstacle = true;
        updates.walkable = false;
        break;
      case 'QUARANTINE':
        updates.isQuarantine = true;
        updates.walkable = false;
        break;
      case 'RESTRICTED':
        updates.isRestricted = true;
        break;
      case 'CHARGER':
        updates.isCharger = true;
        updates.walkable = true;
        addCharger({
          id: generateId('charger'),
          position: gridPos,
          floorId: activeFloor.id,
          chargeRate: 1,
          capacity: 1,
        });
        break;
      case 'STORAGE':
        updates.isStorage = true;
        updates.walkable = true;
        addStoragePoint({
          id: generateId('storage'),
          name: 'Supply Room',
          position: gridPos,
          floorId: activeFloor.id,
          serviceTime: 30,
          capacity: 1,
          availableItems: [],
        });
        break;
      case 'STAGING':
        updates.isStaging = true;
        updates.walkable = true;
        addStagingArea({
          id: generateId('staging'),
          position: gridPos,
          floorId: activeFloor.id,
          capacity: 3,
        });
        break;
      case 'CONNECTOR':
        updates.isConnector = true;
        updates.walkable = true;
        break;
    }

    setCellType(activeFloor.id, gridPos.x, gridPos.y, updates);
  };

  // Update canvas size only when floor dimensions change
  useEffect(() => {
    if (activeFloor) {
      setCanvasSize((prev) => {
        if (prev.width === activeFloor.width && prev.height === activeFloor.height) {
          return prev; // Return same reference to avoid re-render
        }
        return { width: activeFloor.width, height: activeFloor.height };
      });
    }
  }, [activeFloor?.width, activeFloor?.height]);

  // Redraw canvas when relevant data changes
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="flex w-48 flex-col gap-2 border-r p-3">
        <div className="mb-2">
          <Label className="text-xs font-medium">Tools</Label>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((tool) => (
            <Button
              key={tool.id}
              variant={selectedTool === tool.id ? 'default' : 'outline'}
              size="sm"
              className="flex h-auto flex-col gap-1 py-2"
              onClick={() => setSelectedTool(tool.id)}
            >
              {tool.icon}
              <span className="text-[10px]">{tool.label}</span>
            </Button>
          ))}
        </div>

        <Separator className="my-2" />

        <div>
          <Label className="text-xs font-medium">Floors</Label>
          <div className="mt-2 space-y-1">
            {map.floors.map((floor) => (
              <Button
                key={floor.id}
                variant={floor.id === activeFloorId ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => setActiveFloor(floor.id)}
              >
                {floor.name}
              </Button>
            ))}
          </div>
          <div className="mt-2">
            <Label
              htmlFor="floor-upload"
              className="flex cursor-pointer items-center justify-center gap-2 border border-dashed py-2 text-xs hover:bg-muted"
            >
              <Upload className="h-4 w-4" />
              Add Floor
            </Label>
            <Input
              id="floor-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <Separator className="my-2" />

        <div className="text-xs text-muted-foreground">
          <p>Click and drag to paint cells.</p>
          <p className="mt-1">Upload a floor plan image to get started.</p>
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/20 p-4">
        {activeFloor ? (
          <div className="inline-block">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border shadow-lg"
              style={{ maxWidth: '100%', height: 'auto' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Card className="p-8 text-center">
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No Floor Plan</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload a floor plan image to start editing
              </p>
              <Label
                htmlFor="floor-upload-main"
                className="inline-flex cursor-pointer items-center gap-2 bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                Upload Floor Plan
              </Label>
              <Input
                id="floor-upload-main"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
