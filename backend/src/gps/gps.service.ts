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
    await Promise.all([
      this.prisma.gpsLog.create({
        data: { agentId: point.agentId, routeId: point.routeId, lat: point.lat, lng: point.lng },
      }),
      this.prisma.agentProfile.update({
        where: { userId: point.agentId },
        data: { lastLat: point.lat, lastLng: point.lng, isOnline: true },
      }),
    ]);
  }
}
