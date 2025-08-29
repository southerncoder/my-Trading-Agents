import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { UserSelections } from './types';
import chalk from 'chalk';
import { input, select, confirm, Separator } from '@inquirer/prompts';

export interface SavedConfig {
  name: string;
  description?: string;
  selections: UserSelections;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

export interface ConfigFile {
  version: string;
  configs: Record<string, SavedConfig>;
  defaultConfig?: string | undefined;
}

export class ConfigManager {
  private configDir: string;
  private configFile: string;

  constructor(configDir: string = join(process.cwd(), '.tradingagents')) {
    this.configDir = configDir;
    this.configFile = join(configDir, 'configs.json');
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true });
    }
  }

  private loadConfigFile(): ConfigFile {
    if (!existsSync(this.configFile)) {
      return {
        version: '1.0.0',
        configs: {}
      };
    }

    try {
      const content = readFileSync(this.configFile, 'utf-8');
      return JSON.parse(content);
    } catch (_error) {
      console.warn(chalk.yellow('Warning: Could not load config file, creating new one'));
      return {
        version: '1.0.0',
        configs: {}
      };
    }
  }

  private saveConfigFile(configFile: ConfigFile): void {
    try {
      writeFileSync(this.configFile, JSON.stringify(configFile, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async saveConfig(selections: UserSelections): Promise<void> {
    const name = await input({
      message: 'Enter a name for this configuration:',
      validate: (input: string) => {
        if (input.trim().length === 0) {
          return 'Please enter a valid name.';
        }
        if (input.includes('/') || input.includes('\\')) {
          return 'Name cannot contain path separators.';
        }
        return true;
      }
    });

    const description = await input({
      message: 'Enter a description (optional):',
      default: ''
    }) || '';

    const setAsDefault = await confirm({
      message: 'Set this as the default configuration?',
      default: false
    });

    const configFile = this.loadConfigFile();
    const configKey = name.trim().toLowerCase().replace(/\s+/g, '-');

    const savedConfig: SavedConfig = {
      name: name.trim(),
      description: description.trim() || '',
      selections,
      createdAt: new Date().toISOString(),
      useCount: 0
    };

    configFile.configs[configKey] = savedConfig;

    if (setAsDefault) {
      configFile.defaultConfig = configKey;
    }

    this.saveConfigFile(configFile);
    console.log(chalk.green(`✓ Configuration "${name}" saved successfully!`));

    if (setAsDefault) {
      console.log(chalk.blue(`✓ Set as default configuration`));
    }
  }

  public async loadConfig(): Promise<UserSelections | null> {
    const configFile = this.loadConfigFile();
    const configKeys = Object.keys(configFile.configs);

    if (configKeys.length === 0) {
      console.log(chalk.yellow('No saved configurations found.'));
      return null;
    }

    // Add option to create new config
    const choices = [
      { name: chalk.cyan('[ Create New Configuration ]'), value: '__new__' },
      new Separator('--- Saved Configurations ---'),
      ...configKeys.map(key => {
        const config = configFile.configs[key]!;
        const isDefault = configFile.defaultConfig === key;
        const defaultBadge = isDefault ? chalk.green(' [DEFAULT]') : '';
        const usageInfo = chalk.gray(` (used ${config.useCount} times)`);
        const analysts = config.selections.analysts.join(', ');
        const description = config.description ? chalk.gray(` - ${config.description}`) : '';
        
        return {
          name: `${config.name}${defaultBadge}${usageInfo}\n  ${chalk.gray(`Provider: ${config.selections.llmProvider}, Analysts: ${analysts}`)}${description}`,
          value: key
        };
      })
    ];

    const selectedConfig = await select({
      message: 'Select a configuration:',
      choices,
      pageSize: 15
    });

    if (selectedConfig === '__new__') {
      return null;
    }

    const config = configFile.configs[selectedConfig]!;
    
    // Update usage statistics
    config.useCount++;
    config.lastUsed = new Date().toISOString();
    configFile.configs[selectedConfig] = config;
    this.saveConfigFile(configFile);

    console.log(chalk.green(`✓ Loaded configuration: ${config.name}`));
    return config.selections;
  }

  public async manageConfigs(): Promise<void> {
    const configFile = this.loadConfigFile();
    const configKeys = Object.keys(configFile.configs);

    if (configKeys.length === 0) {
      console.log(chalk.yellow('No saved configurations found.'));
      return;
    }

    const action = await select({
      message: 'Configuration Management:',
      choices: [
        { name: 'List all configurations', value: 'list' },
        { name: 'Delete a configuration', value: 'delete' },
        { name: 'Set default configuration', value: 'setDefault' },
        { name: 'Export configurations', value: 'export' },
        { name: 'Import configurations', value: 'import' },
        new Separator(),
        { name: 'Back to main menu', value: 'back' }
      ]
    });

    switch (action) {
      case 'list':
        this.listConfigs(configFile);
        break;
      case 'delete':
        await this.deleteConfig(configFile);
        break;
      case 'setDefault':
        await this.setDefaultConfig(configFile);
        break;
      case 'export':
        await this.exportConfigs(configFile);
        break;
      case 'import':
        await this.importConfigs();
        break;
      case 'back':
        return;
    }
  }

  private listConfigs(configFile: ConfigFile): void {
    console.log(chalk.bold('\nSaved Configurations:'));
    console.log('='.repeat(50));

    Object.entries(configFile.configs).forEach(([key, config]) => {
      const isDefault = configFile.defaultConfig === key;
      const defaultBadge = isDefault ? chalk.green(' [DEFAULT]') : '';
      
      console.log(chalk.blue(`\n${config.name}${defaultBadge}`));
      if (config.description) {
        console.log(chalk.gray(`  Description: ${config.description}`));
      }
      console.log(chalk.gray(`  Provider: ${config.selections.llmProvider}`));
      console.log(chalk.gray(`  Analysts: ${config.selections.analysts.join(', ')}`));
      console.log(chalk.gray(`  Depth: ${config.selections.researchDepth}`));
      console.log(chalk.gray(`  Created: ${new Date(config.createdAt).toLocaleDateString()}`));
      console.log(chalk.gray(`  Used: ${config.useCount} times`));
      if (config.lastUsed) {
        console.log(chalk.gray(`  Last used: ${new Date(config.lastUsed).toLocaleDateString()}`));
      }
    });
  }

  private async deleteConfig(configFile: ConfigFile): Promise<void> {
    const configKeys = Object.keys(configFile.configs);
    
    const configToDelete = await select({
      message: 'Select configuration to delete:',
      choices: configKeys.map(key => ({
        name: configFile.configs[key]!.name,
        value: key
      }))
    });

    const confirmDelete = await confirm({
      message: `Are you sure you want to delete "${configFile.configs[configToDelete]!.name}"?`,
      default: false
    });

    if (confirmDelete) {
      const configName = configFile.configs[configToDelete]!.name;
      delete configFile.configs[configToDelete];
      
      // If this was the default, clear the default
      if (configFile.defaultConfig === configToDelete) {
        configFile.defaultConfig = undefined;
      }
      
      this.saveConfigFile(configFile);
      console.log(chalk.green(`✓ Configuration "${configName}" deleted successfully!`));
    }
  }

  private async setDefaultConfig(configFile: ConfigFile): Promise<void> {
    const configKeys = Object.keys(configFile.configs);
    
    const choices = [
      { name: '[ No Default ]', value: null },
      ...configKeys.map(key => ({
        name: configFile.configs[key]!.name,
        value: key
      }))
    ];

    const defaultConfig = await select({
      message: 'Select default configuration:',
      choices
    });

    configFile.defaultConfig = defaultConfig || undefined;
    this.saveConfigFile(configFile);
    
    if (defaultConfig) {
      console.log(chalk.green(`✓ Set "${configFile.configs[defaultConfig]!.name}" as default configuration`));
    } else {
      console.log(chalk.green('✓ Cleared default configuration'));
    }
  }

  private async exportConfigs(configFile: ConfigFile): Promise<void> {
    const exportPath = await input({
      message: 'Enter export file path:',
      default: 'tradingagents-configs.json'
    });

    try {
      writeFileSync(exportPath, JSON.stringify(configFile, null, 2));
      console.log(chalk.green(`✓ Configurations exported to: ${exportPath}`));
    } catch (error) {
      console.log(chalk.red(`✗ Export failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  private async importConfigs(): Promise<void> {
    const importPath = await input({
      message: 'Enter import file path:',
      validate: (input: string) => {
        if (!existsSync(input)) {
          return 'File does not exist.';
        }
        return true;
      }
    });

    try {
      const importedData = JSON.parse(readFileSync(importPath, 'utf-8'));
      const currentConfigFile = this.loadConfigFile();
      
      // Merge configurations
      let importCount = 0;
      for (const [key, config] of Object.entries(importedData.configs || {})) {
        if (!currentConfigFile.configs[key]) {
          currentConfigFile.configs[key] = config as SavedConfig;
          importCount++;
        }
      }
      
      this.saveConfigFile(currentConfigFile);
      console.log(chalk.green(`✓ Imported ${importCount} configurations from: ${importPath}`));
    } catch (error) {
      console.log(chalk.red(`✗ Import failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }

  public async getDefaultConfig(): Promise<UserSelections | null> {
    const configFile = this.loadConfigFile();
    
    if (!configFile.defaultConfig || !configFile.configs[configFile.defaultConfig]) {
      return null;
    }

    const config = configFile.configs[configFile.defaultConfig]!;
    
    // Update usage statistics
    config.useCount++;
    config.lastUsed = new Date().toISOString();
    configFile.configs[configFile.defaultConfig] = config;
    this.saveConfigFile(configFile);

    console.log(chalk.green(`✓ Using default configuration: ${config.name}`));
    return config.selections;
  }
}