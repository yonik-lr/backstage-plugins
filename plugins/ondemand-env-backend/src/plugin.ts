import { createBackendPlugin } from '@backstage/backend-plugin-api';
import { coreServices } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

export const ondemandEnvBackendPlugin = createBackendPlugin({
  pluginId: 'ondemand-env',
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
        // So this will be available at /api/ondemand-env/*
        httpRouter.use(router);
        // Allow unauthenticated access to the endpoints
        httpRouter.addAuthPolicy({
          path: '/create',
          allow: 'unauthenticated',
        });
        logger.info('On-demand environment backend plugin initialized');
      },
    });
  },
});

