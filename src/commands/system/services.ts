/**
 * System Services Command - Universal Command Schema
 * Shows status of system services (gateway, automation, cron)
 */

import { LazyUniversalCommand } from '../../LazyUniversalCommand';

export const systemServicesCommand = new LazyUniversalCommand({
  name: 'system services',
  description: 'Show status of system services (gateway, automation, cron jobs)',
  category: 'system',
  scope: 'operations',
  keywords: ['services', 'status', 'gateway', 'automation', 'cron', 'health', 'launchd'],

  cli: {
    path: ['system', 'services'],
    allowUnknownOption: false,
    passThroughOptions: false,
  },

  handlerPath: './services-handler',
  handlerExport: 'handler',

  input: {
    parameters: [],
  },

  output: {
    type: 'json',
    schema: {
      type: 'object',
      properties: {
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['launchd', 'automation', 'cron'] },
              status: { type: 'string', enum: ['running', 'stopped', 'error'] },
              pid: { type: 'number' },
              autoRestart: { type: 'boolean' },
            },
          },
        },
        cron: {
          type: 'object',
          properties: {
            jobCount: { type: 'number' },
            nextRun: { type: 'string' },
          },
        },
        automation: {
          type: 'object',
          properties: {
            watcherCount: { type: 'number' },
            scheduledCount: { type: 'number' },
          },
        },
        timestamp: { type: 'string' },
        ok: { type: 'boolean' },
      },
    },
  },

  mcp: {
    toolName: 'system_services',
  },

  api: {
    method: 'GET',
  },
});
