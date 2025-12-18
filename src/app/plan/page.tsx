'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Map, Plus, MapPin, Trash2 } from 'lucide-react';
import type { Waypoint, WaypointType } from '@/lib/types';

export default function PlanPage() {
  const [routeName, setRouteName] = useState('');
  const [waypoints, setWaypoints] = useState<Partial<Waypoint>[]>([]);

  const addWaypoint = () => {
    setWaypoints([
      ...waypoints,
      {
        id: crypto.randomUUID(),
        name: '',
        type: 'custom' as WaypointType,
        coordinates: { latitude: 0, longitude: 0 },
      },
    ]);
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter((w) => w.id !== id));
  };

  const updateWaypoint = (id: string, field: string, value: string) => {
    setWaypoints(
      waypoints.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Map className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Route Planner</h1>
          <p className="text-muted-foreground">
            Plan your overland route with waypoints and trail segments
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Route Details</CardTitle>
                <CardDescription>
                  Name your route and add waypoints
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Route Name
                  </label>
                  <Input
                    placeholder="e.g., Colorado Backcountry Loop"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Waypoints</label>
                    <Button variant="outline" size="sm" onClick={addWaypoint}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {waypoints.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No waypoints added yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {waypoints.map((waypoint, index) => (
                        <div
                          key={waypoint.id}
                          className="flex items-center gap-2 p-3 rounded-lg bg-secondary"
                        >
                          <MapPin className="h-4 w-4 text-accent shrink-0" />
                          <span className="text-sm font-medium w-6">
                            {index + 1}.
                          </span>
                          <Input
                            placeholder="Waypoint name"
                            value={waypoint.name || ''}
                            onChange={(e) =>
                              updateWaypoint(
                                waypoint.id!,
                                'name',
                                e.target.value
                              )
                            }
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWaypoint(waypoint.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" disabled={!routeName || waypoints.length < 2}>
              Save Route
            </Button>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Map Preview</CardTitle>
              <CardDescription>
                Your route will be displayed here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Map className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Map integration coming soon</p>
                  <p className="text-xs">Add waypoints to see your route</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
