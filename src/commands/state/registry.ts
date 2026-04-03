/**
 * State Commands Registry
 * 
 * Defines all agent-state commands using UniversalCommand pattern.
 * Single source of truth for CLI, API, and MCP interfaces.
 */

import { UniversalCommand } from '../../UniversalCommand';
import * as handlers from './db-handler';

// ============ STATUS ============

export const stateStatus = new UniversalCommand({
  name: 'state status',
  description: 'Show agent state database status',
  category: 'state',
  keywords: ['state', 'database', 'status'],

  input: { parameters: [] },
  output: { type: 'json' },

  handler: async () => handlers.status(),

  mcp: { toolName: 'state_status' },
});

// ============ EMAIL COMMANDS ============

export const emailCheck = new UniversalCommand({
  name: 'state email check',
  description: 'Check if an email ID exists (for deduplication). Exit code 0 = exists, 1 = not found.',
  category: 'state',
  keywords: ['email', 'check', 'exists', 'dedup'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args, context) => {
    const result = await handlers.emailCheck(args.id);
    if (context.interface === 'cli' && !result.exists) {
      process.exitCode = 1;
    }
    return result;
  },

  mcp: { toolName: 'state_email_check' },
});

export const emailAdd = new UniversalCommand({
  name: 'state email add',
  description: 'Add or update an email record',
  category: 'state',
  keywords: ['email', 'add', 'create', 'track'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
      { name: 'threadId', type: 'string', description: 'Thread ID', cli: { option: '--thread' } },
      { name: 'subject', type: 'string', description: 'Email subject' },
      { name: 'sender', type: 'string', description: 'Sender name' },
      { name: 'senderEmail', type: 'string', description: 'Sender email', cli: { option: '--email' } },
      { name: 'status', type: 'string', default: 'pending', enum: ['pending', 'processed', 'actionable', 'archived', 'ignored'] },
      { name: 'actionType', type: 'string', description: 'Action type', cli: { option: '--type' } },
      { name: 'notes', type: 'string', description: 'Notes' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.emailAdd(args),

  mcp: { toolName: 'state_email_add' },
});

export const emailGet = new UniversalCommand({
  name: 'state email get',
  description: 'Get an email by ID',
  category: 'state',
  keywords: ['email', 'get', 'read'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.emailGet(args.id),

  mcp: { toolName: 'state_email_get' },
});

export const emailList = new UniversalCommand({
  name: 'state email list',
  description: 'List emails with optional filters',
  category: 'state',
  keywords: ['email', 'list', 'search'],

  input: {
    parameters: [
      { name: 'status', type: 'string', enum: ['pending', 'processed', 'actionable', 'archived', 'ignored'] },
      { name: 'senderEmail', type: 'string', description: 'Filter by sender', cli: { option: '--sender' } },
      { name: 'since', type: 'string', description: 'Since date (ISO)' },
      { name: 'limit', type: 'number', default: 20, cli: { option: '-n' } },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.emailList(args),

  mcp: { toolName: 'state_email_list' },
});

export const emailDelete = new UniversalCommand({
  name: 'state email delete',
  description: 'Delete an email',
  category: 'state',
  keywords: ['email', 'delete', 'remove'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Email message ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.emailDelete(args.id),

  mcp: { toolName: 'state_email_delete' },
});

export const emailStats = new UniversalCommand({
  name: 'state email stats',
  description: 'Show email statistics by status',
  category: 'state',
  keywords: ['email', 'stats', 'statistics', 'count'],

  input: { parameters: [] },
  output: { type: 'json' },

  handler: async () => handlers.emailStats(),

  mcp: { toolName: 'state_email_stats' },
});

// ============ CONTACT COMMANDS ============

export const contactAdd = new UniversalCommand({
  name: 'state contact add',
  description: 'Add a new contact',
  category: 'state',
  keywords: ['contact', 'add', 'create', 'person'],

  input: {
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Contact name' },
      { name: 'email', type: 'string', description: 'Email address' },
      { name: 'phone', type: 'string', description: 'Phone number' },
      { name: 'organization', type: 'string', description: 'Organization', cli: { option: '--org' } },
      { name: 'title', type: 'string', description: 'Job title' },
      { name: 'relationship', type: 'string', description: 'Relationship (personal, work, vendor, etc.)' },
      { name: 'tags', type: 'array', itemType: 'string', description: 'Tags (comma-separated in CLI)' },
      { name: 'notes', type: 'string', description: 'Notes' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.contactAdd(args),

  mcp: { toolName: 'state_contact_add' },
});

export const contactGet = new UniversalCommand({
  name: 'state contact get',
  description: 'Get a contact by ID',
  category: 'state',
  keywords: ['contact', 'get', 'read'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Contact ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.contactGet(args.id),

  mcp: { toolName: 'state_contact_get' },
});

export const contactFind = new UniversalCommand({
  name: 'state contact find',
  description: 'Search contacts by name, email, or organization',
  category: 'state',
  keywords: ['contact', 'find', 'search'],

  input: {
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', default: 20, cli: { option: '-n' } },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.contactFind(args.query, args.limit),

  mcp: { toolName: 'state_contact_find' },
});

export const contactList = new UniversalCommand({
  name: 'state contact list',
  description: 'List contacts with optional filters',
  category: 'state',
  keywords: ['contact', 'list'],

  input: {
    parameters: [
      { name: 'relationship', type: 'string', description: 'Filter by relationship' },
      { name: 'organization', type: 'string', description: 'Filter by organization', cli: { option: '--org' } },
      { name: 'limit', type: 'number', default: 50, cli: { option: '-n' } },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.contactList(args),

  mcp: { toolName: 'state_contact_list' },
});

export const contactUpdate = new UniversalCommand({
  name: 'state contact update',
  description: 'Update a contact',
  category: 'state',
  keywords: ['contact', 'update', 'edit', 'modify'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Contact ID' },
      { name: 'name', type: 'string', description: 'Name' },
      { name: 'email', type: 'string', description: 'Email' },
      { name: 'phone', type: 'string', description: 'Phone' },
      { name: 'organization', type: 'string', cli: { option: '--org' } },
      { name: 'title', type: 'string' },
      { name: 'relationship', type: 'string' },
      { name: 'tags', type: 'array', itemType: 'string' },
      { name: 'notes', type: 'string' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => {
    const { id, ...updates } = args;
    // Filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    return handlers.contactUpdate(id, filteredUpdates);
  },

  mcp: { toolName: 'state_contact_update' },
});

export const contactDelete = new UniversalCommand({
  name: 'state contact delete',
  description: 'Delete a contact',
  category: 'state',
  keywords: ['contact', 'delete', 'remove'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Contact ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.contactDelete(args.id),

  mcp: { toolName: 'state_contact_delete' },
});

// ============ LINK COMMANDS ============

export const linkAdd = new UniversalCommand({
  name: 'state link add',
  description: 'Add or update a link',
  category: 'state',
  keywords: ['link', 'add', 'bookmark', 'research'],

  input: {
    parameters: [
      { name: 'url', type: 'string', required: true, description: 'URL' },
      { name: 'title', type: 'string', description: 'Title' },
      { name: 'summary', type: 'string', description: 'Summary' },
      { name: 'tags', type: 'array', itemType: 'string', description: 'Tags' },
      { name: 'source', type: 'string', description: 'Source (where found)' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.linkAdd(args),

  mcp: { toolName: 'state_link_add' },
});

export const linkGet = new UniversalCommand({
  name: 'state link get',
  description: 'Get a link by ID',
  category: 'state',
  keywords: ['link', 'get'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Link ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.linkGet(args.id),

  mcp: { toolName: 'state_link_get' },
});

export const linkFind = new UniversalCommand({
  name: 'state link find',
  description: 'Search links by URL, title, or summary',
  category: 'state',
  keywords: ['link', 'find', 'search'],

  input: {
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', default: 20, cli: { option: '-n' } },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.linkFind(args.query, args.limit),

  mcp: { toolName: 'state_link_find' },
});

export const linkList = new UniversalCommand({
  name: 'state link list',
  description: 'List links with optional filters',
  category: 'state',
  keywords: ['link', 'list'],

  input: {
    parameters: [
      { name: 'tag', type: 'string', description: 'Filter by tag' },
      { name: 'source', type: 'string', description: 'Filter by source' },
      { name: 'limit', type: 'number', default: 50, cli: { option: '-n' } },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.linkList(args),

  mcp: { toolName: 'state_link_list' },
});

export const linkUpdate = new UniversalCommand({
  name: 'state link update',
  description: 'Update a link',
  category: 'state',
  keywords: ['link', 'update', 'edit'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Link ID' },
      { name: 'title', type: 'string' },
      { name: 'summary', type: 'string' },
      { name: 'tags', type: 'array', itemType: 'string' },
      { name: 'source', type: 'string' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    return handlers.linkUpdate(id, filteredUpdates);
  },

  mcp: { toolName: 'state_link_update' },
});

export const linkDelete = new UniversalCommand({
  name: 'state link delete',
  description: 'Delete a link',
  category: 'state',
  keywords: ['link', 'delete', 'remove'],

  input: {
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Link ID' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.linkDelete(args.id),

  mcp: { toolName: 'state_link_delete' },
});

export const linkTags = new UniversalCommand({
  name: 'state link tags',
  description: 'List all unique tags',
  category: 'state',
  keywords: ['link', 'tags'],

  input: { parameters: [] },
  output: { type: 'json' },

  handler: async () => handlers.linkTags(),

  mcp: { toolName: 'state_link_tags' },
});

// ============ KV COMMANDS ============

export const kvSet = new UniversalCommand({
  name: 'state kv set',
  description: 'Set a key-value pair',
  category: 'state',
  keywords: ['kv', 'set', 'store'],

  input: {
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'Key name' },
      { name: 'value', type: 'string', required: true, description: 'Value' },
      { name: 'ttl', type: 'number', description: 'TTL in seconds' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.kvSet(args.key, args.value, args.ttl),

  mcp: { toolName: 'state_kv_set' },
});

export const kvGet = new UniversalCommand({
  name: 'state kv get',
  description: 'Get a value by key',
  category: 'state',
  keywords: ['kv', 'get', 'read'],

  input: {
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'Key name' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.kvGet(args.key),

  mcp: { toolName: 'state_kv_get' },
});

export const kvDelete = new UniversalCommand({
  name: 'state kv delete',
  description: 'Delete a key',
  category: 'state',
  keywords: ['kv', 'delete', 'remove'],

  input: {
    parameters: [
      { name: 'key', type: 'string', required: true, description: 'Key name' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.kvDelete(args.key),

  mcp: { toolName: 'state_kv_delete' },
});

export const kvKeys = new UniversalCommand({
  name: 'state kv keys',
  description: 'List keys with optional prefix filter',
  category: 'state',
  keywords: ['kv', 'keys', 'list'],

  input: {
    parameters: [
      { name: 'prefix', type: 'string', description: 'Key prefix filter' },
    ],
  },
  output: { type: 'json' },

  handler: async (args) => handlers.kvKeys(args.prefix),

  mcp: { toolName: 'state_kv_keys' },
});

// ============ ALL COMMANDS ============

export const allStateCommands = [
  stateStatus,
  emailCheck,
  emailAdd,
  emailGet,
  emailList,
  emailDelete,
  emailStats,
  contactAdd,
  contactGet,
  contactFind,
  contactList,
  contactUpdate,
  contactDelete,
  linkAdd,
  linkGet,
  linkFind,
  linkList,
  linkUpdate,
  linkDelete,
  linkTags,
  kvSet,
  kvGet,
  kvDelete,
  kvKeys,
];
