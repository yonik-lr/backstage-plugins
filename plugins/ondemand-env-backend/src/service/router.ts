import { Router, json } from 'express';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import yaml from 'js-yaml';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
}

interface CreateEnvRequest {
  envName: string;
  envDb: string;
  oneImageTag?: boolean;
  imageTag?: string;
  deploymentType: string;
  chartSource?: string;
  githubBranch: string;
  pathToChartFolder: string;
  ttl: string;
  valuesYaml?: string;
  owner?: string;
}


function prepareEnvData(params: CreateEnvRequest, logger: LoggerService): Record<string, any> {
  // Map envDb to do_not_delete_db boolean
  // If envDb is "rds", set do_not_delete_db to true, otherwise false
  const doNotDeleteDb = params.envDb === 'rds';

  // Handle valuesYaml - convert YAML to JSON string since backend expects JSON
  // The backend service uses json.Unmarshal to parse the advanced_params
  // Also replace __ENV_NAME__ placeholder with the actual envName
  let advancedParams = '{}';
  if (params.valuesYaml && params.valuesYaml.trim().length > 0) {
    try {
      // Replace __ENV_NAME__ placeholder with the actual environment name
      let processedYaml = params.valuesYaml;
      if (params.envName) {
        processedYaml = processedYaml.replace(/__ENV_NAME__/g, params.envName);
      }
      // Parse YAML and convert to JSON string
      const yamlObject = yaml.load(processedYaml);
      advancedParams = JSON.stringify(yamlObject);
    } catch (error) {
      logger.warn(`Failed to parse YAML, using empty object: ${error}`);
      advancedParams = '{}';
    }
  }

  // Prepare the request body according to the API specification
  return {
    env_name: `${params.envName}-ondemand-env`,
    owner: params.owner || 'unknown',
    chart_ver: params.githubBranch,
    ttl: params.ttl,
    advanced_params: advancedParams,
    chart_name: 'lightrun-helm-chart',
    path: params.pathToChartFolder || '',
    do_not_delete_db: doNotDeleteDb,
  };
}

export async function createRouter(
  options: RouterOptions,
): Promise<Router> {
  const { logger, config } = options;

  const router = Router();
  // Add JSON body parsing middleware for POST requests
  router.use(json());
  
  // Get the on-demand env service base URL from config
  const ondemandEnvServiceUrl = config.getOptionalString('ondemandEnv.serviceUrl') 
    || 'https://ondemand-env-service.internal.lightrun.com';

  router.post('/create', async (request, response) => {
    try {
      const body = request.body as CreateEnvRequest;
      
      // Validate required fields
      if (!body.envName) {
        response.status(400).json({ error: 'envName is required' });
        return;
      }
      
      if (!body.envDb) {
        response.status(400).json({ error: 'envDb is required' });
        return;
      }

      if (!body.deploymentType) {
        response.status(400).json({ error: 'deploymentType is required' });
        return;
      }

      if (!body.githubBranch) {
        response.status(400).json({ error: 'githubBranch is required' });
        return;
      }

      if (!body.pathToChartFolder) {
        response.status(400).json({ error: 'pathToChartFolder is required' });
        return;
      }

      if (!body.ttl) {
        response.status(400).json({ error: 'ttl is required' });
        return;
      }

      // Prepare the data according to the API format
      const postData = prepareEnvData(body, logger);
      
      const endpoint = '/envs/create';
      const fullUrl = `${ondemandEnvServiceUrl}${endpoint}`;
      logger.info(`POST /create - Sending to ${fullUrl}`, { postData });
      
      const apiResponse = await fetch(fullUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        logger.error(`On-demand env service error: ${apiResponse.status} - ${errorText}`);
        response.status(apiResponse.status).json({
          error: `On-demand env service returned ${apiResponse.status}: ${errorText}`,
        });
        return;
      }

      const data = await apiResponse.json().catch(() => ({}));
      logger.info('Successfully created on-demand environment');
      response.json(data);
    } catch (error) {
      logger.error(`Error calling on-demand env service: ${error}`);
      response.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  });

  return router;
}
