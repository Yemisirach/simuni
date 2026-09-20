import { fetchApi } from '../api';

export interface Route {
  id: string;
  name: string;
  status: string;
  agentId?: string;
  stops: RouteStop[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  id: string;
  status: string;
  orderId?: string;
  lat: number;
  lng: number;
  sequence: number;
  metadata?: any;
}

export const routesService = {
  async getRoutes(): Promise<Route[]> {
    return fetchApi<Route[]>('/routes');
  },
  
  async getRouteDetails(id: string): Promise<Route> {
    return fetchApi<Route>(`/routes/${id}`);
  },

  async getRouteProgress(id: string): Promise<any> {
    return fetchApi<any>(`/routes/${id}/progress`);
  }
};
