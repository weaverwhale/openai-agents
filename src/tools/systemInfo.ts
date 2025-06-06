import { z } from 'zod';
import { tool } from '@openai/agents';

// System Information Tool
export const systemInfoTool = tool({
  name: 'system_info',
  description: 'Get system information like OS, memory, CPU, etc.',
  parameters: z.object({
    info_type: z
      .enum(['os', 'memory', 'cpu', 'uptime', 'all'])
      .describe('Type of system information to retrieve'),
  }),
  execute: async ({ info_type }) => {
    const os = await import('os');

    switch (info_type) {
      case 'os':
        return `OS: ${os.type()} ${os.release()} (${os.arch()})`;

      case 'memory':
        const totalMem = Math.round((os.totalmem() / 1024 / 1024 / 1024) * 100) / 100;
        const freeMem = Math.round((os.freemem() / 1024 / 1024 / 1024) * 100) / 100;
        return `Memory: ${freeMem}GB free of ${totalMem}GB total`;

      case 'cpu':
        const cpus = os.cpus();
        return `CPU: ${cpus[0].model} (${cpus.length} cores)`;

      case 'uptime':
        const uptime = Math.floor(os.uptime() / 3600);
        return `System uptime: ${uptime} hours`;

      case 'all':
        const allInfo = {
          os: `${os.type()} ${os.release()} (${os.arch()})`,
          hostname: os.hostname(),
          memory: `${Math.round((os.freemem() / 1024 / 1024 / 1024) * 100) / 100}GB free of ${
            Math.round((os.totalmem() / 1024 / 1024 / 1024) * 100) / 100
          }GB`,
          cpu: `${os.cpus()[0].model} (${os.cpus().length} cores)`,
          uptime: `${Math.floor(os.uptime() / 3600)} hours`,
        };
        return `System Information:\n${Object.entries(allInfo)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}`;

      default:
        return 'Invalid system information type';
    }
  },
});
