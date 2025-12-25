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

  router.get('/data', async (request, response) => {
    try {
      // Get envType from query parameters, request body, or config default
      const envType = request.query.envType as string || request.body?.envType as string;
      
      // Build the URL with the env parameter
      const endpoint = `/latest/envs/${envType}/ec2/instances`;
      const fullUrl = `${devopsApiBaseUrl}${endpoint}?env=${envType}`;
      logger.info(`Fetching data from DevOps API at ${fullUrl} for env: ${envType}`);
      
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

  router.post('/start-ec2', async (request, response) => {
    try {
      const body = request.body;
      
      if (!body || !body.env) {
        response.status(400).json({ error: 'env is required' });
        return;
      }
      
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

      const endpoint = `/latest/envs/${body.env}/ec2/start`;
      const fullUrl = `${devopsApiBaseUrl}${endpoint}`;
      logger.info(`POST /start-ec2 - Sending to ${fullUrl}`);
      
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

  router.post('/stop-ec2', async (request, response) => {
    try {
      const body = request.body;
      
      if (!body || !body.env) {
        response.status(400).json({ error: 'env is required' });
        return;
      }
      
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

      const endpoint = `/latest/envs/${body.env}/ec2/stop`;
      const fullUrl = `${devopsApiBaseUrl}${endpoint}`;
      logger.info(`POST /stop-ec2 - Sending to ${fullUrl}`);
      
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

