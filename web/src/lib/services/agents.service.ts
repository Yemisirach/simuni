import { fetchApi } from '../api';

export interface Agent {
  id: string;
  userId: string;
  workspaceId: string;
  vehicleType: string;
  vehiclePlate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const agentsService = {
  async getAgents(): Promise<Agent[]> {
    return fetchApi<Agent[]>('/agents');
  },
  
  async getAgentDetails(id: string): Promise<Agent> {
    return fetchApi<Agent>(`/agents/${id}`);
  }
};
