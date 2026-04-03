/**
 * Shared Database Handler for State Commands
 * 
 * Provides a singleton pattern for the AgentStateDB to avoid
 * repeated connection overhead.
 */

import { 
  AgentStateDB, 
  EmailStore, 
  ContactStore, 
  SocialStore, 
  LinkStore, 
  KVStore,
  type Email,
  type EmailStatus,
  type Contact,
  type SocialPost,
  type Link,
} from '@supernalintelligence/agent-tools';

// Lazy initialization
let _db: AgentStateDB | null = null;

function getDB(): AgentStateDB {
  if (!_db) {
    _db = new AgentStateDB();
  }
  return _db;
}

// ============ EMAIL HANDLERS ============

export async function emailCheck(id: string): Promise<{ exists: boolean; id: string }> {
  const db = getDB();
  const emails = new EmailStore(db);
  return { exists: emails.exists(id), id };
}

export async function emailAdd(data: {
  id: string;
  threadId?: string;
  subject?: string;
  sender?: string;
  senderEmail?: string;
  status?: EmailStatus;
  actionType?: string;
  notes?: string;
}): Promise<Email> {
  const db = getDB();
  const emails = new EmailStore(db);
  return emails.upsert({
    id: data.id,
    thread_id: data.threadId,
    subject: data.subject,
    sender: data.sender,
    sender_email: data.senderEmail,
    status: data.status || 'pending',
    action_type: data.actionType,
    notes: data.notes,
  });
}

export async function emailGet(id: string): Promise<Email | null> {
  const db = getDB();
  const emails = new EmailStore(db);
  return emails.get(id) || null;
}

export async function emailList(filter: {
  status?: EmailStatus;
  senderEmail?: string;
  since?: string;
  limit?: number;
}): Promise<Email[]> {
  const db = getDB();
  const emails = new EmailStore(db);
  return emails.list({
    status: filter.status,
    sender_email: filter.senderEmail,
    since: filter.since,
    limit: filter.limit || 20,
  });
}

export async function emailDelete(id: string): Promise<{ deleted: boolean; id: string }> {
  const db = getDB();
  const emails = new EmailStore(db);
  return { deleted: emails.delete(id), id };
}

export async function emailStats(): Promise<Record<EmailStatus, number>> {
  const db = getDB();
  const emails = new EmailStore(db);
  return emails.countByStatus();
}

// ============ CONTACT HANDLERS ============

export async function contactAdd(data: {
  name: string;
  email?: string;
  phone?: string;
  organization?: string;
  title?: string;
  relationship?: string;
  tags?: string[];
  notes?: string;
}): Promise<Contact> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return contacts.add(data);
}

export async function contactGet(id: string): Promise<Contact | null> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return contacts.get(id) || null;
}

export async function contactFind(query: string, limit?: number): Promise<Contact[]> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return contacts.search(query, limit || 20);
}

export async function contactList(filter: {
  relationship?: string;
  organization?: string;
  limit?: number;
}): Promise<Contact[]> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return contacts.list(filter);
}

export async function contactUpdate(id: string, updates: Partial<Omit<Contact, 'id' | 'created_at'>>): Promise<Contact> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return contacts.update(id, updates);
}

export async function contactDelete(id: string): Promise<{ deleted: boolean; id: string }> {
  const db = getDB();
  const contacts = new ContactStore(db);
  return { deleted: contacts.delete(id), id };
}

// ============ LINK HANDLERS ============

export async function linkAdd(data: {
  url: string;
  title?: string;
  summary?: string;
  tags?: string[];
  source?: string;
}): Promise<Link> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.upsert(data);
}

export async function linkGet(id: string): Promise<Link | null> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.get(id) || null;
}

export async function linkFind(query: string, limit?: number): Promise<Link[]> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.search(query, limit || 20);
}

export async function linkList(filter: {
  tag?: string;
  source?: string;
  limit?: number;
}): Promise<Link[]> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.list(filter);
}

export async function linkUpdate(id: string, updates: Partial<Omit<Link, 'id' | 'created_at'>>): Promise<Link> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.update(id, updates);
}

export async function linkDelete(id: string): Promise<{ deleted: boolean; id: string }> {
  const db = getDB();
  const links = new LinkStore(db);
  return { deleted: links.delete(id), id };
}

export async function linkTags(): Promise<string[]> {
  const db = getDB();
  const links = new LinkStore(db);
  return links.allTags();
}

// ============ KV HANDLERS ============

export async function kvSet(key: string, value: string, ttlSeconds?: number): Promise<{ key: string; set: boolean }> {
  const db = getDB();
  const kv = new KVStore(db);
  kv.set(key, value, ttlSeconds);
  return { key, set: true };
}

export async function kvGet(key: string): Promise<{ key: string; value: string | null }> {
  const db = getDB();
  const kv = new KVStore(db);
  return { key, value: kv.get(key) || null };
}

export async function kvDelete(key: string): Promise<{ key: string; deleted: boolean }> {
  const db = getDB();
  const kv = new KVStore(db);
  return { key, deleted: kv.delete(key) };
}

export async function kvKeys(prefix?: string): Promise<string[]> {
  const db = getDB();
  const kv = new KVStore(db);
  return kv.keys(prefix);
}

// ============ STATUS HANDLER ============

export async function status(): Promise<{
  path: string;
  schemaVersion: number;
  emails: number;
  contacts: number;
  socialPosts: number;
  links: number;
  kvEntries: number;
}> {
  const db = getDB();
  return db.stats();
}
