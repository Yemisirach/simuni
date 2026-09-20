import { IsString } from 'class-validator';

export class AssignAgentDto {
  @IsString()
  agentId: string;
}
