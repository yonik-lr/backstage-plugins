import { createApiRef } from '@backstage/core-plugin-api';

export interface DevOpsApiResponse {
  data?: any;
  error?: string;
}

export const devopsApiRef = createApiRef<DevOpsApiClient>({
  id: 'plugin.devops-api.client',
});

export interface DevOpsApiClient {
  getData(): Promise<DevOpsApiResponse>;
}

export class DevOpsApiClientImpl implements DevOpsApiClient {
  constructor(private baseUrl: string) {}

  async getData(): Promise<DevOpsApiResponse> {
    try {
      // Use the backend baseUrl to construct the full URL
      const url = `${this.baseUrl}/api/devops-api/data`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

