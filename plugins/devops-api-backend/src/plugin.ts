import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const devopsApiBackendPlugin = createBackendPlugin({
  pluginId: 'devops-api',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ httpRouter, logger, config }) {
        const router = await createRouter({ logger, config });
        // Routes are automatically registered under /api/<plugin-id>
        // So this will be available at /api/devops-api/*
        httpRouter.use(router);
        // Allow unauthenticated access to the endpoints
        httpRouter.addAuthPolicy({
          path: '/health',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/data',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/stop',
          allow: 'unauthenticated',
        });
        logger.info('DevOps API backend plugin initialized');
      },
    });
  },
});

