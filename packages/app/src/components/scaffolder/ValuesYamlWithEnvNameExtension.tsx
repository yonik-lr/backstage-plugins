import { useEffect, useState, useRef } from 'react';
import {
  FieldExtensionComponentProps,
  createScaffolderFieldExtension,
} from '@backstage/plugin-scaffolder-react';
import {
  TextField,
  FormHelperText,
  makeStyles,
  Box,
  Typography,
} from '@material-ui/core';

interface ValuesYamlWithEnvNameOptions {
  watchField?: string; // Field name to watch for envName (default: 'envName')
}

const useStyles = makeStyles(theme => ({
  yamlEditorContainer: {
    position: 'relative',
    width: '100%',
    marginTop: theme.spacing(2),
  },
  yamlEditor: {
    '& .MuiInputBase-root': {
      fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
      fontSize: '13px',
      lineHeight: '1.6',
      backgroundColor: theme.palette.type === 'dark' 
        ? 'rgba(0, 0, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.02)',
      '& textarea': {
        fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        padding: theme.spacing(2),
        letterSpacing: '0.01em',
        tabSize: 2,
        whiteSpace: 'pre',
        overflowWrap: 'normal',
        overflowX: 'auto',
        '&::placeholder': {
          fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
          opacity: 0.5,
        },
        '&:focus': {
          backgroundColor: theme.palette.type === 'dark'
            ? 'rgba(0, 0, 0, 0.4)'
            : 'rgba(0, 0, 0, 0.03)',
        },
      },
      '& fieldset': {
        borderColor: theme.palette.type === 'dark'
          ? 'rgba(255, 255, 255, 0.23)'
          : 'rgba(0, 0, 0, 0.23)',
        borderWidth: '1px',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.type === 'dark'
          ? 'rgba(255, 255, 255, 0.4)'
          : 'rgba(0, 0, 0, 0.4)',
      },
      '&.Mui-focused fieldset': {
        borderWidth: '2px',
        borderColor: theme.palette.primary.main,
      },
    },
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1, 0),
  },
  yamlBadge: {
    display: 'inline-block',
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.05)',
    fontSize: '11px',
    fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
    fontWeight: 500,
    color: theme.palette.text.secondary,
    letterSpacing: '0.05em',
  },
  helperText: {
    marginTop: theme.spacing(1),
    fontSize: '0.75rem',
  },
}));

const ValuesYamlWithEnvName = (
  props: FieldExtensionComponentProps<string, ValuesYamlWithEnvNameOptions>,
) => {
  const { onChange, rawErrors, required, schema, uiSchema, formContext, formData } = props;
  const [internalValue, setInternalValue] = useState<string>('');
  const classes = useStyles();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get form values from context
  const envName = formContext?.formData?.envName || '';
  const envDb = formContext?.formData?.envDb || '';
  const deploymentType = formContext?.formData?.deploymentType || '';
  const imageTag = formContext?.formData?.imageTag || '';

  // Process the YAML by replacing all placeholders
  const processYaml = (yaml: string): string => {
    if (!yaml) {
      return '';
    }

    let processed = yaml;

    // 1. Replace __ENV_NAME__ with envName
    if (envName) {
      processed = processed.replace(/__ENV_NAME__/g, envName);
    }

    // 2. Replace __DB_DATABASE__ placeholder
    if (envDb) {
      if (envDb === 'db-local') {
        processed = processed.replace(/__DB_DATABASE__/g, 'lightrunserver');
      } else {
        // Replace hyphens with underscores in envName for db_database
        const envNameUnderscore = envName.replace(/-/g, '_');
        processed = processed.replace(/__DB_DATABASE__/g, `${envNameUnderscore}_ondemand_env`);
      }
    }

    // 3. Replace __DB_LOCAL__ placeholder
    if (envDb) {
      const dbLocalValue = envDb === 'db-local' ? 'true' : 'false';
      processed = processed.replace(/__DB_LOCAL__/g, dbLocalValue);
    }

    // 4. Replace __DEPLOYMENT_TYPE__ placeholder
    if (deploymentType) {
      processed = processed.replace(/__DEPLOYMENT_TYPE__/g, deploymentType);
    }

    // 5-8. Replace image tag placeholders
    if (imageTag) {
      processed = processed.replace(/__IMAGE_TAG__/g, imageTag);
    }

    // 9. Replace artifacts configuration
    if (deploymentType) {
      if (deploymentType === 'saas') {
        // Replace the artifacts placeholder with simple enable: false
        processed = processed.replace(/artifacts:\s*__ARTIFACTS_CONFIG__/g, `artifacts:\n      enable: false`);
      } else {
        // Replace the artifacts placeholder with full configuration
        const artifactsYaml = 
        `enable: true
      repository_url: "https://artifacts.internal.lightrun.com/"
      s3_url: "https://artifacts.internal.lightrun.com/"
      resolution_mode: "same_as_server"
      download_prerelease: true`;
        processed = processed.replace(/artifacts:\s*__ARTIFACTS_CONFIG__/g, `artifacts:\n      ${artifactsYaml}`);
      }
    }

    return processed;
  };

  // Initialize from formData or schema default, and handle updates
  useEffect(() => {
    const currentValue = formData || (schema.default as string) || '';
    
    if (!currentValue) {
      return;
    }

    // Check if we have any placeholders to process
    const hasPlaceholders = 
      currentValue.includes('__ENV_NAME__') ||
      currentValue.includes('__DB_DATABASE__') ||
      currentValue.includes('__DB_LOCAL__') ||
      currentValue.includes('__DEPLOYMENT_TYPE__') ||
      currentValue.includes('__IMAGE_TAG__') ||
      currentValue.includes('__ARTIFACTS_');

    if (hasPlaceholders) {
      const processed = processYaml(currentValue);
      if (processed !== internalValue) {
        setInternalValue(processed);
        // Only update if we have at least one required value
        if (envName || envDb || deploymentType || imageTag) {
          onChange(processed);
        }
      }
    } else if (!internalValue || (formData && formData !== internalValue && !hasPlaceholders)) {
      // Set value if we don't have one, or if formData changed and doesn't have placeholders
      setInternalValue(currentValue);
    }
  }, [formData, envName, envDb, deploymentType, imageTag, schema.default]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Tab key for proper YAML indentation
    if (event.key === 'Tab' && textareaRef.current) {
      event.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      if (event.shiftKey) {
        // Shift+Tab: Remove indentation
        const lines = value.split('\n');
        let currentLine = 0;
        let charCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
          const lineLength = lines[i].length + 1; // +1 for newline
          if (charCount + lineLength > start) {
            currentLine = i;
            break;
          }
          charCount += lineLength;
        }
        
        if (lines[currentLine].startsWith('  ')) {
          lines[currentLine] = lines[currentLine].substring(2);
          const newValue = lines.join('\n');
          setInternalValue(newValue);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = Math.max(0, start - 2);
            textarea.selectionEnd = Math.max(0, end - 2);
          }, 0);
        }
      } else {
        // Tab: Add indentation (2 spaces for YAML)
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setInternalValue(newValue);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        }, 0);
      }
    }
  };

  const handleBlur = () => {
    // Re-process on blur to ensure placeholders are replaced if user added them back
    if (internalValue) {
      const reprocessed = processYaml(internalValue);
      if (reprocessed !== internalValue) {
        setInternalValue(reprocessed);
        onChange(reprocessed);
      }
    }
  };

  const title = schema.title as string || 'Helm Values Configuration';
  const rows = (uiSchema?.['ui:options'] as any)?.rows || 20;

  const displayValue = internalValue || formData || '';

  // Count lines for badge
  const lineCount = displayValue ? displayValue.split('\n').length : 0;

  return (
    <Box className={classes.yamlEditorContainer}>
      <Box className={classes.editorHeader}>
        <Typography variant="body2" color="textSecondary">
          {title}
        </Typography>
        <Box className={classes.yamlBadge}>
          YAML • {lineCount} {lineCount === 1 ? 'line' : 'lines'}
        </Box>
      </Box>
      <TextField
        fullWidth
        multiline
        required={required}
        error={rawErrors?.length > 0}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        rows={rows}
        variant="outlined"
        className={classes.yamlEditor}
        inputRef={textareaRef}
        placeholder={Array.isArray(schema.examples) && schema.examples[0] ? String(schema.examples[0]) : '# Enter your Helm values.yaml configuration\n# Use __ENV_NAME__ as a placeholder for the environment name'}
        InputProps={{
          style: {
            fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
          },
        }}
        inputProps={{
          spellCheck: false,
          style: {
            fontFamily: '"Roboto Mono", "Monaco", "Courier New", monospace',
            tabSize: 2,
          },
        }}
      />
      {rawErrors?.length > 0 && (
        <FormHelperText error className={classes.helperText}>
          {rawErrors.map((error, index) => (
            <span key={index}>{error}</span>
          ))}
        </FormHelperText>
      )}
    </Box>
  );
};

// Export both the extension and the component
export const ValuesYamlWithEnvNameExtension = createScaffolderFieldExtension({
  name: 'ValuesYamlWithEnvName',
  component: ValuesYamlWithEnvName as any,
});

// Also export the component directly for potential direct use
export { ValuesYamlWithEnvName };
