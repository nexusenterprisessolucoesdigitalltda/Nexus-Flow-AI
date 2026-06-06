import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { config } from '../config';
import { logger, createContextLogger } from '../utils/logger';
import { SkillDefinition, SkillModule, SkillContext } from './types';
import { skillRegistry } from './registry';

const skillLogger = createContextLogger('skill-loader');

class SkillLoader {
  private watcher: chokidar.FSWatcher | null = null;
  private loadedFiles: Map<string, string> = new Map();
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;
    this.ensureDirectories();
    this.loadExistingSkills();
    this.startWatcher();
    this.initialized = true;
    skillLogger.info(`Skills directory: ${config.paths.skills}`);
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(config.paths.skills)) {
      fs.mkdirSync(config.paths.skills, { recursive: true });
      skillLogger.info(`Created: ${config.paths.skills}`);
    }
  }

  private loadExistingSkills(): void {
    if (!fs.existsSync(config.paths.skills)) return;

    const files = fs.readdirSync(config.paths.skills)
      .filter(f => /\.(json|js|ts)$/i.test(f))
      .sort();

    for (const file of files) {
      this.loadSkill(path.join(config.paths.skills, file));
    }

    skillLogger.info(`Loaded ${this.loadedFiles.size} skill(s) from disk`);
  }

  private startWatcher(): void {
    this.watcher = chokidar.watch(config.paths.skills, {
      ignored: /(^|[\/\\])\./,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    this.watcher
      .on('add', (fp: string) => {
        if (/\.(json|js|ts)$/i.test(fp)) {
          skillLogger.info(`New skill detected: ${path.basename(fp)}`);
          this.loadSkill(fp);
        }
      })
      .on('change', (fp: string) => {
        if (/\.(json|js|ts)$/i.test(fp)) {
          skillLogger.info(`Skill modified: ${path.basename(fp)}`);
          this.unloadSkill(fp);
          this.loadSkill(fp);
        }
      })
      .on('unlink', (fp: string) => {
        if (/\.(json|js|ts)$/i.test(fp)) {
          skillLogger.info(`Skill removed: ${path.basename(fp)}`);
          this.unloadSkill(fp);
        }
      });

    skillLogger.info(`Watching for hot-reload skill changes...`);
  }

  private loadSkill(filePath: string): void {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const skill = ext === '.json'
        ? this.parseJsonSkill(filePath)
        : this.parseScriptSkill(filePath);

      if (skill) {
        skillRegistry.register(skill);
        this.loadedFiles.set(filePath, skill.name);
      }
    } catch (err: any) {
      skillLogger.error(`Failed to load ${path.basename(filePath)}: ${err.message}`);
    }
  }

  private parseJsonSkill(filePath: string): SkillModule | null {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const def: SkillDefinition = JSON.parse(raw);

    if (!def.name || !def.pattern) {
      skillLogger.warn(`Invalid JSON skill: ${path.basename(filePath)} (missing name/pattern)`);
      return null;
    }

    return {
      name: def.name,
      description: def.description || 'No description',
      version: def.version || '1.0.0',
      pattern: new RegExp(def.pattern, 'i'),
      execute: async (context: SkillContext) => {
        const handler = def.handler === 'builtin'
          ? this.getBuiltinHandler(def.name)
          : this.getDefaultHandler(def);

        if (handler) {
          return handler(context.matchedParams, context);
        }

        const paramsStr = Object.entries(context.matchedParams)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ');
        return `[Skill: ${def.name}] triggered with params: ${paramsStr}`;
      },
    };
  }

  private parseScriptSkill(filePath: string): SkillModule | null {
    const resolvedPath = path.resolve(filePath);
    delete require.cache[resolvedPath];

    try {
      const mod = require(resolvedPath);
      const skill = mod.default || mod;

      if (!skill || !skill.name || !skill.pattern || typeof skill.execute !== 'function') {
        skillLogger.warn(`Invalid script skill: ${path.basename(filePath)}`);
        return null;
      }

      if (typeof skill.pattern === 'string') {
        skill.pattern = new RegExp(skill.pattern, 'i');
      }

      return {
        name: skill.name,
        description: skill.description || 'No description',
        version: skill.version || '1.0.0',
        pattern: skill.pattern,
        execute: skill.execute,
      };
    } catch (err: any) {
      skillLogger.error(`Error loading script skill ${path.basename(filePath)}: ${err.message}`);
      return null;
    }
  }

  private getBuiltinHandler(skillName: string): ((params: Record<string, string>, ctx: SkillContext) => Promise<string>) | null {
    try {
      const handlerPath = path.join(config.paths.skills, 'handlers', `${skillName}.js`);
      if (fs.existsSync(handlerPath)) {
        delete require.cache[require.resolve(handlerPath)];
        const handlerMod = require(handlerPath);
        return handlerMod.default || handlerMod;
      }
    } catch {
      // Handler not found, fall through
    }
    return null;
  }

  private getDefaultHandler(def: SkillDefinition): ((params: Record<string, string>, ctx: SkillContext) => Promise<string>) | null {
    if (def.handler === 'llm') {
      return async (params, context) => {
        return `[LLM Skill: ${def.name}] Execute with LLM context: ${JSON.stringify({ params, context: context.message.slice(0, 100) })}`;
      };
    }
    return null;
  }

  private unloadSkill(filePath: string): void {
    const skillName = this.loadedFiles.get(filePath);
    if (skillName) {
      skillRegistry.unregister(skillName);
      this.loadedFiles.delete(filePath);
    }
  }

  reloadAll(): void {
    skillLogger.info('Reloading all skills...');
    const files = Array.from(this.loadedFiles.keys());
    this.loadedFiles.clear();

    for (const name of skillRegistry.getAll()) {
      skillRegistry.unregister(name.name);
    }

    for (const filePath of files) {
      this.loadSkill(filePath);
    }

    skillLogger.info(`Reload complete: ${this.loadedFiles.size} skills`);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      skillLogger.info('Skill watcher stopped');
    }
  }
}

export const skillLoader = new SkillLoader();
