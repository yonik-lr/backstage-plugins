import { useEffect, useState } from 'react';
import {
  FieldExtensionComponentProps,
  createScaffolderFieldExtension,
} from '@backstage/plugin-scaffolder-react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
} from '@material-ui/core';
import { useApi } from '@backstage/core-plugin-api';
import { configApiRef } from '@backstage/core-plugin-api';

interface SelectFieldFromApiOptions {
  title?: string;
  description?: string;
  path: string;
  params?: Record<string, string>;
  placeholder?: string;
  arraySelector: string;
  valueSelector?: string;
  labelSelector?: string;
  labelTemplate?: string;
  filterBy?: {
    watchField: string; // Field name to watch (e.g., 'action')
    stateField: string; // Field in item to check (e.g., 'state')
    filterMap: Record<string, string>; // Map of watchField values to state values (e.g., { 'stop': 'running', 'start': 'stopped' })
  };
}

const SelectFieldFromApi = (
  props: FieldExtensionComponentProps<string, SelectFieldFromApiOptions>,
) => {
  const { onChange, rawErrors, required, schema, uiSchema, formContext } = props;
  const configApi = useApi(configApiRef);
  const [options, setOptions] = useState<Array<{ value: string; label: string; item: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const optionsConfig = uiSchema?.['ui:options'] as SelectFieldFromApiOptions | undefined;
  const backendBaseUrl = configApi.getOptionalString('backend.baseUrl') || 'http://localhost:7007';

  // Get the watched field value from form data
  const watchedFieldValue = optionsConfig?.filterBy?.watchField 
    ? formContext?.formData?.[optionsConfig.filterBy.watchField]
    : undefined;

  console.log('SelectFieldFromApi: Component rendered', { 
    optionsConfig, 
    optionsCount: options.length, 
    loading, 
    error,
    watchedFieldValue,
    formData: formContext?.formData 
  });

  useEffect(() => {
    const fetchOptions = async () => {
      if (!optionsConfig?.path) {
        console.warn('SelectFieldFromApi: No path provided in optionsConfig');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build URL with path and params
        // If path starts with /, use it as-is, otherwise prepend /api/
        const path = `/api/${optionsConfig.path}`;
        const url = new URL(`${backendBaseUrl}${path}`);
        if (optionsConfig.params) {
          Object.entries(optionsConfig.params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
          });
        }

        console.log('SelectFieldFromApi: Fetching from URL:', url.toString());
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('SelectFieldFromApi: Received data:', data);

        // Extract array using arraySelector (e.g., 'facets.kind' or '.' for root)
        let arrayData: any[] = [];
        if (optionsConfig.arraySelector === '.' || optionsConfig.arraySelector === '') {
          // If selector is '.' or empty, treat the root data as the array
          if (Array.isArray(data)) {
            arrayData = data;
          } else {
            // If data is an object, try to convert it to an array of entries
            arrayData = Object.entries(data).map(([key, value]) => ({ key, ...(typeof value === 'object' && value !== null ? value : { value }) }));
          }
        } else {
          const selectorParts = optionsConfig.arraySelector.split('.').filter(p => p.length > 0);
          let currentData: any = data;
          for (const part of selectorParts) {
            currentData = currentData?.[part];
          }
          arrayData = currentData;
        }

        console.log('SelectFieldFromApi: Extracted array data:', arrayData);

        if (!Array.isArray(arrayData)) {
          throw new Error(`Array selector "${optionsConfig.arraySelector}" did not resolve to an array. Got: ${typeof arrayData}`);
        }

        // Map array to options
        let mappedOptions = arrayData.map((item: any) => {
          let value: string;
          let label: string;

          if (optionsConfig.valueSelector) {
            // Extract value using valueSelector
            const valueParts = optionsConfig.valueSelector.split('.');
            let valueData = item;
            for (const part of valueParts) {
              valueData = valueData?.[part];
            }
            value = String(valueData ?? item);
          } else {
            value = String(item);
          }

          if (optionsConfig.labelTemplate) {
            // Use Nunjucks-like templating (simplified version)
            label = optionsConfig.labelTemplate.replace(/\{\{([^}]+)\}\}/g, (_, expr) => {
              const trimmed = expr.trim();
              if (trimmed.startsWith('item.')) {
                const field = trimmed.substring(5);
                const fieldParts = field.split('.');
                let fieldData = item;
                for (const part of fieldParts) {
                  fieldData = fieldData?.[part];
                }
                return String(fieldData ?? '');
              }
              return '';
            });
          } else if (optionsConfig.labelSelector) {
            // Extract label using labelSelector
            const labelParts = optionsConfig.labelSelector.split('.');
            let labelData = item;
            for (const labelPart of labelParts) {
              labelData = labelData?.[labelPart];
            }
            label = String(labelData ?? item);
          } else {
            label = String(item);
          }

          return { value, label, item };
        });

        // Apply filtering if filterBy is configured
        if (optionsConfig.filterBy && watchedFieldValue) {
          const expectedState = optionsConfig.filterBy.filterMap[watchedFieldValue];
          if (expectedState) {
            const stateField = optionsConfig.filterBy.stateField;
            mappedOptions = mappedOptions.filter(option => {
              // Extract state from item
              const stateParts = stateField.split('.');
              let stateValue = option.item;
              for (const part of stateParts) {
                stateValue = stateValue?.[part];
              }
              return String(stateValue) === expectedState;
            });
            console.log('SelectFieldFromApi: Filtered options by', { watchedFieldValue, expectedState, filteredCount: mappedOptions.length });
          }
        }

        console.log('SelectFieldFromApi: Mapped options:', mappedOptions);
        setOptions(mappedOptions);
      } catch (err) {
        console.error('SelectFieldFromApi: Error fetching options:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch options');
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [optionsConfig, backendBaseUrl, watchedFieldValue]);

  const title = optionsConfig?.title || (schema.title as string) || 'Select Option';
  const description = optionsConfig?.description || (schema.description as string);
  const placeholder = optionsConfig?.placeholder;

  return (
    <FormControl
      fullWidth
      required={required}
      error={rawErrors?.length > 0 || !!error}
      disabled={loading}
    >
      <InputLabel id={`select-field-${title}-label`}>{title}</InputLabel>
      {loading ? (
        <>
          <Select 
            value="" 
            labelId={`select-field-${title}-label`}
            label={title}
            disabled
          >
            <MenuItem value="">
              <CircularProgress size={20} style={{ marginRight: 8 }} />
              Loading options...
            </MenuItem>
          </Select>
          <FormHelperText>Loading options...</FormHelperText>
        </>
      ) : error ? (
        <>
          <Select 
            value="" 
            labelId={`select-field-${title}-label`}
            label={title}
            disabled
          >
            <MenuItem value="">Error loading options</MenuItem>
          </Select>
          <FormHelperText error>{error}</FormHelperText>
        </>
      ) : options.length === 0 ? (
        <>
          <Select 
            value="" 
            labelId={`select-field-${title}-label`}
            label={title}
            disabled
          >
            <MenuItem value="">No options available</MenuItem>
          </Select>
          <FormHelperText>No options found</FormHelperText>
        </>
      ) : (
        <>
          <Select
            value={props.formData || ''}
            onChange={e => onChange(e.target.value as string)}
            labelId={`select-field-${title}-label`}
            label={title}
            displayEmpty={!!placeholder}
          >
            {placeholder && (
              <MenuItem value="" disabled>
                {placeholder}
              </MenuItem>
            )}
            {options.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {description && <FormHelperText>{description}</FormHelperText>}
          {error && <FormHelperText error>{error}</FormHelperText>}
        </>
      )}
    </FormControl>
  );
};

// Export both the extension and the component
export const SelectFieldFromApiExtension = createScaffolderFieldExtension({
  name: 'SelectFieldFromApi',
  component: SelectFieldFromApi as any,
});

// Also export the component directly for potential direct use
export { SelectFieldFromApi };
