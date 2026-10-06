import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LocationPoint {
  agentId: string;
  routeId?: string;
  lat: number;
  lng: number;
}

/**
 * Shared "record a GPS point" logic used by both the live Socket.IO gateway
 * (gps.gateway.ts) and the HTTP fallback endpoint (POST /agents/ping) that
 * the mobile app's offline queue replays through once it reconnects after
 * being offline — see mobile/src/offline/queue.ts.
 */
@Injectable()
export class GpsService {
  constructor(private prisma: PrismaService) {}

  async recordPing(point: LocationPoint) {
    if (!point.agentId) return;

    // Check if routeId is valid before setting foreign key constraint
    let validRouteId: string | undefined = undefined;
    if (point.routeId) {
      const route = await this.prisma.route.findUnique({
        where: { id: point.routeId },
        select: { id: true },
      });
      if (route) validRouteId = route.id;
    }

    await Promise.all([
      this.prisma.gpsLog.create({
        data: {
          agentId: point.agentId,
          routeId: validRouteId,
          lat: point.lat,
          lng: point.lng,
        },
      }).catch((e) => console.error('Failed to log GPS ping:', e.message)),
      this.prisma.agentProfile.upsert({
        where: { userId: point.agentId },
        create: {
          userId: point.agentId,
          lastLat: point.lat,
          lastLng: point.lng,
          isOnline: true,
        },
        update: {
          lastLat: point.lat,
          lastLng: point.lng,
          isOnline: true,
        },
      }).catch((e) => console.error('Failed to update agent profile position:', e.message)),
    ]);
  }
}
