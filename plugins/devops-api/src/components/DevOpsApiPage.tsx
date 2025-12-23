import {
  Page,
  Header,
  Content,
  Progress,
  ErrorPanel,
  InfoCard,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { devopsApiRef } from '../api/client';
import { useAsync } from 'react-use';

export const DevOpsApiPage = () => {
  const devopsApi = useApi(devopsApiRef);
  const { value, loading, error } = useAsync(async () => {
    return await devopsApi.getData();
  }, []);

  return (
    <Page themeId="tool">
      <Header
        title="DevOps API"
        subtitle="Access internal DevOps API data"
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <ErrorPanel
            title="Failed to load data"
            error={error}
          />
        )}
        {!loading && !error && value && (
          <InfoCard title="DevOps API Response">
            {value.error ? (
              <ErrorPanel
                title="API Error"
                error={new Error(value.error)}
              />
            ) : (
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(value.data, null, 2)}
              </pre>
            )}
          </InfoCard>
        )}
      </Content>
    </Page>
  );
};

