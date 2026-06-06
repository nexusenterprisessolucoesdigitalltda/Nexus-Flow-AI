import { SkillModule } from './types';
import { logger } from '../utils/logger';

class SkillRegistry {
  private skills: Map<string, SkillModule> = new Map();
  private skillsByPriority: SkillModule[] = [];

  register(skill: SkillModule): void {
    if (this.skills.has(skill.name)) {
      logger.warn(`Skill "${skill.name}" already registered, overwriting`);
    }
    this.skills.set(skill.name, skill);
    this.rebuildPriority();
    logger.info(`Skill registered: ${skill.name} v${skill.version} - ${skill.description}`);
  }

  unregister(name: string): boolean {
    const removed = this.skills.delete(name);
    if (removed) {
      this.rebuildPriority();
      logger.info(`Skill unregistered: ${name}`);
    }
    return removed;
  }

  get(name: string): SkillModule | undefined {
    return this.skills.get(name);
  }

  getAll(): SkillModule[] {
    return this.skillsByPriority;
  }

  count(): number {
    return this.skills.size;
  }

  findMatch(input: string): { skill: SkillModule; params: Record<string, string> } | null {
    for (const skill of this.skillsByPriority) {
      const match = input.match(skill.pattern);
      if (match) {
        return {
          skill,
          params: match.groups || {},
        };
      }
    }
    return null;
  }

  private rebuildPriority(): void {
    this.skillsByPriority = Array.from(this.skills.values());
  }
}

export const skillRegistry = new SkillRegistry();
