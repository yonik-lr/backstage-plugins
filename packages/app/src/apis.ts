import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
} from '@backstage/core-plugin-api';
import { devopsApiRef, DevOpsApiClientImpl } from '@internal/plugin-devops-api';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: devopsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => {
      // Get the backend baseUrl from config, defaulting to localhost:7007
      // In development, frontend (3000) calls backend (7007) directly
      const baseUrl = configApi.getOptionalString('backend.baseUrl') || 'http://localhost:7007';
      return new DevOpsApiClientImpl(baseUrl);
    },
  }),
];
