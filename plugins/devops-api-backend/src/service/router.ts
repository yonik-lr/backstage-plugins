import { Router, json } from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<Router> {
  const { logger, config } = options;

  const router = Router();
  // Add JSON body parsing middleware for POST requests
  router.use(json());
  
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

  router.post('/stop', async (request, response) => {
    try {
      const endpoint = `/latest/envs/${env}/ec2/stop`;
      const fullUrl = `${devopsApiBaseUrl}${endpoint}?env=${env}`;
      const body = request.body;
      
      logger.info(`POST /stop - Sending to ${fullUrl}`);
      
      // Validate and normalize instance_names to array
      if (!body || !body.instance_names) {
        response.status(400).json({ error: 'instance_names is required' });
        return;
      }
      
      // Ensure instance_names is an array
      if (!Array.isArray(body.instance_names)) {
        body.instance_names = typeof body.instance_names === 'string' 
          ? [body.instance_names] 
          : [body.instance_names];
      }
      
      const apiResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        logger.error(`DevOps API error: ${apiResponse.status} - ${errorText}`);
        response.status(apiResponse.status).json({
          error: `DevOps API returned ${apiResponse.status}: ${errorText}`,
        });
        return;
      }

      const data = await apiResponse.json().catch(() => ({}));
      logger.info('Successfully sent POST request to DevOps API');
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

