import { Injectable, Logger } from '@nestjs/common';

export interface RouteStep {
  instruction: string; // human-readable maneuver, e.g. "Turn right onto Ring Road"
  distanceMeters: number;
  durationSeconds: number;
}

export interface DirectionsResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][]; // [lng, lat] pairs, decoded from OSRM's polyline
  steps: RouteStep[];
}

/**
 * Thin wrapper around a self-hosted OSRM instance (see docker-compose.yml —
 * OSRM needs Ethiopia's OpenStreetMap extract pre-processed with
 * `osrm-extract` + `osrm-contract` before this will return anything).
 *
 * Not exercised against a live OSRM server in this environment (no network
 * access here) — the request/response shapes below match OSRM's documented
 * "Route service" API (http://project-osrm.org/docs/v5.24.0/api/#route-service),
 * so double-check against your OSRM version if you see shape mismatches.
 */
@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly baseUrl = process.env.OSRM_URL || 'http://localhost:5000';

  /**
   * Turn-by-turn directions from the agent's current GPS position to a
   * customer stop. Used by RouteDetailScreen on the mobile app to render
   * the next-turn banner while a route is IN_PROGRESS.
   */
  async directionsToStop(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): Promise<DirectionsResult | null> {
    const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
    const url = `${this.baseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        this.logger.warn(`OSRM responded ${res.status} for ${url}`);
        return null;
      }
      const data: any = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) return null;

      const route = data.routes[0];
      const steps: RouteStep[] = (route.legs?.[0]?.steps || []).map((s: any) => ({
        instruction: describeManeuver(s.maneuver, s.name),
        distanceMeters: s.distance,
        durationSeconds: s.duration,
      }));

      return {
        distanceMeters: route.distance,
        durationSeconds: route.duration,
        geometry: route.geometry.coordinates,
        steps,
      };
    } catch (err) {
      this.logger.error(`OSRM request failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Optimal visiting order for a route's stops (nearest-neighbor via OSRM's
   * Trip service), starting from the agent's current position. Returns stop
   * indices in visiting order — RoutesService can use this to resequence
   * RouteStop.sequence when a manager clicks "Optimize order".
   */
  async optimizeStopOrder(
    start: { lat: number; lng: number },
    stops: { lat: number; lng: number }[],
  ): Promise<number[] | null> {
    if (stops.length === 0) return [];
    const coords = [start, ...stops].map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${this.baseUrl}/trip/v1/driving/${coords}?source=first&roundtrip=false`;

    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data: any = await res.json();
      if (data.code !== 'Ok') return null;

      // waypoints[0] is the fixed start; the rest map back to `stops` by
      // (original index - 1), ordered by OSRM's chosen visiting sequence.
      return data.waypoints
        .filter((w: any) => w.waypoint_index !== 0)
        .sort((a: any, b: any) => a.trips_index - b.trips_index)
        .map((w: any) => w.waypoint_index - 1);
    } catch (err) {
      this.logger.error(`OSRM trip request failed: ${(err as Error).message}`);
      return null;
    }
  }
}

function describeManeuver(maneuver: any, roadName: string): string {
  const road = roadName ? ` onto ${roadName}` : '';
  const type = maneuver?.type;
  const modifier = maneuver?.modifier;

  if (type === 'depart') return 'Head out';
  if (type === 'arrive') return 'You have arrived at the customer';
  if (type === 'roundabout') return `Take the roundabout${road}`;
  if (modifier) return `${capitalize(modifier)}${road}`;
  return `Continue${road}`;
}
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
