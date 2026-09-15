export type ToolPermission = 'web' | 'documents' | 'code' | 'research';

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  permissions: ToolPermission[];
  costMicrousd: number;
};

export type ToolExecutionContext = {
  userId: string;
  personaId: string;
  conversationId?: string;
};

const TOOLS: ToolDefinition[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Search the public web for current information',
    permissions: ['web', 'research'],
    costMicrousd: 50_000,
  },
  {
    id: 'read_document',
    name: 'Read Document',
    description: 'Read uploaded document content',
    permissions: ['documents', 'research'],
    costMicrousd: 20_000,
  },
  {
    id: 'code_exec',
    name: 'Code Execution',
    description: 'Run sandboxed code snippets',
    permissions: ['code'],
    costMicrousd: 100_000,
  },
];

export class ToolRegistry {
  list(): ToolDefinition[] {
    return TOOLS;
  }

  get(id: string): ToolDefinition | undefined {
    return TOOLS.find((t) => t.id === id);
  }

  allowedForPersona(allowedPermissions: ToolPermission[]): ToolDefinition[] {
    return TOOLS.filter((t) => t.permissions.some((p) => allowedPermissions.includes(p)));
  }

  async execute(
    toolId: string,
    _ctx: ToolExecutionContext,
    _input: Record<string, unknown>
  ): Promise<{ result: string; costMicrousd: number }> {
    const tool = this.get(toolId);
    if (!tool) throw new Error(`Unknown tool: ${toolId}`);
    return {
      result: `[Tool ${tool.name} stub — implement in Phase 8]`,
      costMicrousd: tool.costMicrousd,
    };
  }
}

export const toolRegistry = new ToolRegistry();
