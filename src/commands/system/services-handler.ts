/**
 * System Services Handler - Universal Command Implementation
 * Single source of truth for service status - used by CLI, API, and MCP
 */

import { ExecutionContext } from '../../types';
import { execSync } from 'child_process';

export interface SystemServicesInput {
  // No parameters
}

export interface ServiceInfo {
  name: string;
  type: 'launchd' | 'automation' | 'cron';
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  autoRestart?: boolean;
}

export interface SystemServicesOutput {
  services: ServiceInfo[];
  cron: {
    jobCount: number;
    nextRun?: string;
  };
  automation: {
    watcherCount: number;
    scheduledCount: number;
  };
  timestamp: string;
  ok: boolean;
}

export async function handler(
  _args: SystemServicesInput,
  context: ExecutionContext
): Promise<SystemServicesOutput> {
  const services: ServiceInfo[] = [];
  let cronJobCount = 0;
  let watcherCount = 0;
  let scheduledCount = 0;

  // Check LaunchAgents
  const launchAgents = [
    { name: 'gateway', label: 'ai.openclaw.gateway' },
    { name: 'orch-automation', label: 'com.sai.orch-automation' },
  ];

  try {
    const launchctlOut = execSync('launchctl list 2>/dev/null', { 
      encoding: 'utf-8', 
      timeout: 5000 
    });

    for (const agent of launchAgents) {
      const regex = new RegExp(`(\\d+)\\s+\\d+\\s+${agent.label.replace(/\./g, '\\.')}`);
      const match = launchctlOut.match(regex);
      
      services.push({
        name: agent.name,
        type: 'launchd',
        status: match ? 'running' : 'stopped',
        pid: match ? parseInt(match[1], 10) : undefined,
        autoRestart: true, // Both have KeepAlive=true
      });
    }
  } catch {
    // If launchctl fails, mark services as error
    for (const agent of launchAgents) {
      services.push({
        name: agent.name,
        type: 'launchd',
        status: 'error',
      });
    }
  }

  // Check cron jobs
  try {
    const cronOut = execSync(
      'openclaw cron list 2>/dev/null | grep -E "^[a-f0-9]{8}" | wc -l',
      { encoding: 'utf-8', timeout: 5000, shell: '/bin/bash' }
    );
    cronJobCount = parseInt(cronOut.trim(), 10) || 0;
  } catch {
    cronJobCount = 0;
  }

  // Check orch automation
  try {
    const autoOut = execSync('orch automation list 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
    });
    
    // Count watchers and scheduled jobs
    const watcherMatches = autoOut.match(/paths:/g);
    const schedMatches = autoOut.match(/schedule:/g);
    watcherCount = watcherMatches?.length || 0;
    scheduledCount = schedMatches?.length || 0;
  } catch {
    // Automation might not be running
  }

  const output: SystemServicesOutput = {
    services,
    cron: {
      jobCount: cronJobCount,
    },
    automation: {
      watcherCount,
      scheduledCount,
    },
    timestamp: new Date().toISOString(),
    ok: services.every(s => s.status === 'running'),
  };

  // If CLI context, print human-readable output
  if (context.stdout) {
    context.stdout.write('📊 System Services\n\n');
    
    context.stdout.write('🔧 Services:\n');
    for (const svc of services) {
      const icon = svc.status === 'running' ? '✓' : '○';
      const pidStr = svc.pid ? ` (PID: ${svc.pid})` : '';
      context.stdout.write(`  ${icon} ${svc.name}${pidStr}\n`);
    }
    
    context.stdout.write('\n📡 Automation:\n');
    context.stdout.write(`  Watchers: ${watcherCount}\n`);
    context.stdout.write(`  Scheduled: ${scheduledCount}\n`);
    
    context.stdout.write('\n⏰ Cron:\n');
    context.stdout.write(`  ${cronJobCount} jobs in openclaw cron\n`);
  }

  return output;
}
