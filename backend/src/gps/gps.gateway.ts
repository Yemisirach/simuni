import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GpsService } from './gps.service';
import { PrismaService } from '../prisma/prisma.service';

interface LocationPing {
  agentId: string;
  workspaceId: string;
  routeId?: string;
  lat: number;
  lng: number;
}

/**
 * Real-time GPS tracking channel.
 * - Field agent app emits 'location:update' every few seconds while a route is active.
 * - Manager dashboard joins the workspace room and receives 'location:broadcast'
 *   to move pins on the MapLibre map live.
 *
 * When the agent's device is offline, points don't come through here at all —
 * they queue on-device instead and get flushed over plain HTTP
 * (POST /agents/ping, see agents.controller.ts) once connectivity returns.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'gps' })
export class GpsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private gpsService: GpsService, private prisma: PrismaService) {}

  @SubscribeMessage('workspace:join')
  joinWorkspace(@ConnectedSocket() client: Socket, @MessageBody() workspaceId: string) {
    client.join(`workspace:${workspaceId}`);
  }

  @SubscribeMessage('location:update')
  async onLocation(@MessageBody() payload: LocationPing) {
    const { agentId, workspaceId, routeId, lat, lng } = payload;
    await this.gpsService.recordPing({ agentId, routeId, lat, lng });

    this.server.to(`workspace:${workspaceId}`).emit('location:broadcast', {
      agentId,
      routeId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('agent:offline')
  async onOffline(@MessageBody() payload: { agentId: string; workspaceId: string }) {
    await this.prisma.agentProfile.update({
      where: { userId: payload.agentId },
      data: { isOnline: false },
    });
    this.server.to(`workspace:${payload.workspaceId}`).emit('agent:offline', payload.agentId);
  }
}
