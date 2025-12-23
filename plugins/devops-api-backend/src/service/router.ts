import { Router } from 'express';
import { Logger } from 'winston';
import { Config } from '@backstage/config';

export interface RouterOptions {
  logger: Logger;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<Router> {
  const { logger, config } = options;

  const router = Router();
  
  // Get the DevOps API base URL from config, default to localhost:8080
  const devopsApiBaseUrl = config.getOptionalString('devopsApi.baseUrl') || 'http://localhost:8080';
  // Get the environment parameter, default to 'stage'
  const env = config.getOptionalString('devopsApi.env') || 'stage';

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/data', async (_request, response) => {
    try {
      // Build the URL with the env parameter as a query parameter
      const endpoint = `/latest/envs/${env}/ec2/instances`;
      const fullUrl = `${devopsApiBaseUrl}${endpoint}?env=${env}`;
      logger.info(`Fetching data from DevOps API at ${fullUrl}`);
      
      // Make GET request to the DevOps API
      const apiResponse = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        logger.error(`DevOps API error: ${apiResponse.status} - ${errorText}`);
        response.status(apiResponse.status).json({
          error: `DevOps API returned ${apiResponse.status}: ${errorText}`,
        });
        return;
      }

      const data = await apiResponse.json();
      logger.info('Successfully fetched data from DevOps API');
      response.json(data);
    } catch (error) {
      logger.error(`Error calling DevOps API: ${error}`);
      response.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  return router;
}

