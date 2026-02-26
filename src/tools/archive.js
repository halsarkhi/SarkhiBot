import { shellRun, shellEscape } from '../utils/shell.js';
import { getLogger } from '../utils/logger.js';
import { existsSync } from 'fs';

const run = (cmd, timeout = 30000) => shellRun(cmd, timeout);

export const definitions = [
  {
    name: 'archive_create',
    description: 'Create a compressed archive (tar.gz or zip) from files or directories.',
    input_schema: {
      type: 'object',
      properties: {
        output: { type: 'string', description: 'Output archive file path (e.g., "backup.tar.gz" or "backup.zip")' },
        sources: { type: 'array', items: { type: 'string' }, description: 'List of files/directories to include' },
        format: { type: 'string', enum: ['tar.gz', 'zip'], description: 'Archive format (default: tar.gz)' },
      },
      required: ['output', 'sources'],
    },
  },
  {
    name: 'archive_extract',
    description: 'Extract files from an archive (tar.gz, tar.bz2, zip, 7z).',
    input_schema: {
      type: 'object',
      properties: {
        archive: { type: 'string', description: 'Path to the archive file' },
        destination: { type: 'string', description: 'Destination directory (default: current directory)' },
      },
      required: ['archive'],
    },
  },
  {
    name: 'archive_list',
    description: 'List contents of an archive without extracting.',
    input_schema: {
      type: 'object',
      properties: {
        archive: { type: 'string', description: 'Path to the archive file' },
      },
      required: ['archive'],
    },
  },
];

export const handlers = {
  archive_create: async (params) => {
    const logger = getLogger();
    const { output, sources, format = 'tar.gz' } = params;
    const srcList = sources.map(s => shellEscape(s)).join(' ');
    let cmd;
    if (format === 'zip') {
      cmd = `zip -r ${shellEscape(output)} ${srcList}`;
    } else {
      cmd = `tar -czf ${shellEscape(output)} ${srcList}`;
    }
    logger.debug(`archive_create: ${cmd}`);
    const result = await run(cmd);
    if (result.error) return result;
    return { success: true, output, format, message: result.output || 'Archive created successfully' };
  },
  archive_extract: async (params) => {
    const logger = getLogger();
    const { archive, destination = '.' } = params;
    if (!existsSync(archive)) return { error: `Archive not found: ${archive}` };
    let cmd;
    if (archive.endsWith('.zip')) {
      cmd = `unzip -o ${shellEscape(archive)} -d ${shellEscape(destination)}`;
    } else if (archive.endsWith('.tar.bz2') || archive.endsWith('.tbz2')) {
      cmd = `tar -xjf ${shellEscape(archive)} -C ${shellEscape(destination)}`;
    } else if (archive.endsWith('.7z')) {
      cmd = `7z x ${shellEscape(archive)} -o${shellEscape(destination)}`;
    } else {
      cmd = `tar -xzf ${shellEscape(archive)} -C ${shellEscape(destination)}`;
    }
    logger.debug(`archive_extract: ${cmd}`);
    const result = await run(cmd, 60000);
    if (result.error) return result;
    return { success: true, archive, destination, message: result.output || 'Extracted successfully' };
  },
  archive_list: async (params) => {
    const { archive } = params;
    if (!existsSync(archive)) return { error: `Archive not found: ${archive}` };
    let cmd;
    if (archive.endsWith('.zip')) {
      cmd = `unzip -l ${shellEscape(archive)}`;
    } else {
      cmd = `tar -tzf ${shellEscape(archive)}`;
    }
    const result = await run(cmd);
    if (result.error) return result;
    const files = result.output.split('\n').filter(Boolean);
    return { archive, total_entries: files.length, entries: files.slice(0, 100) };
  },
};
