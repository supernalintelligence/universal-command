/**
 * Agent State Commands — Universal Command Definitions
 * 
 * Provides CRUD operations for agent state stored in local SQLite:
 * - Emails (deduplication, tracking)
 * - Contacts (people, organizations)
 * - Social posts (engagement tracking)
 * - Links (research, bookmarks)
 * - KV (key-value store)
 * 
 * Usage:
 *   CLI: sc state email check <id>
 *   API: POST /api/state/email/check
 *   MCP: state_email_check tool
 */

export * from './registry';
export * from './db-handler';
