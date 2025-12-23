import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const devopsApiPlugin = createPlugin({
  id: 'devops-api',
  routes: {
    root: rootRouteRef,
  },
});

export const DevOpsApiPage = devopsApiPlugin.provide(
  createRoutableExtension({
    name: 'DevOpsApiPage',
    component: () => import('./components/DevOpsApiPage').then(m => m.DevOpsApiPage),
    mountPoint: rootRouteRef,
  }),
);

