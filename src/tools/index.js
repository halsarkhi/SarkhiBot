import { definitions as osDefinitions, handlers as osHandlers } from './os.js';
import { definitions as processDefinitions, handlers as processHandlers } from './process.js';
import { definitions as dockerDefinitions, handlers as dockerHandlers } from './docker.js';
import { definitions as monitorDefinitions, handlers as monitorHandlers } from './monitor.js';
import { definitions as networkDefinitions, handlers as networkHandlers } from './network.js';
import { definitions as gitDefinitions, handlers as gitHandlers } from './git.js';
import { definitions as githubDefinitions, handlers as githubHandlers } from './github.js';
import { definitions as codingDefinitions, handlers as codingHandlers } from './coding.js';
import { definitions as browserDefinitions, handlers as browserHandlers } from './browser.js';
import { definitions as jiraDefinitions, handlers as jiraHandlers } from './jira.js';
import { definitions as linkedinDefinitions, handlers as linkedinHandlers } from './linkedin.js';
import { definitions as xDefinitions, handlers as xHandlers } from './x.js';
import { definitions as personaDefinitions, handlers as personaHandlers } from './persona.js';
import { definitions as weatherDefinitions, handlers as weatherHandlers } from './weather.js';
import { definitions as translateDefinitions, handlers as translateHandlers } from './translate.js';
import { definitions as cryptoDefinitions, handlers as cryptoHandlers } from './crypto.js';
import { definitions as calculatorDefinitions, handlers as calculatorHandlers } from './calculator.js';
import { definitions as hashDefinitions, handlers as hashHandlers } from './hash.js';
import { definitions as datetimeDefinitions, handlers as datetimeHandlers } from './datetime.js';
import { definitions as jsonToolsDefinitions, handlers as jsonToolsHandlers } from './json-tools.js';
import { definitions as regexDefinitions, handlers as regexHandlers } from './regex-tools.js';
import { definitions as archiveDefinitions, handlers as archiveHandlers } from './archive.js';
import { definitions as dnsDefinitions, handlers as dnsHandlers } from './dns-tools.js';
import { definitions as textDefinitions, handlers as textHandlers } from './text-tools.js';
import { definitions as httpClientDefinitions, handlers as httpClientHandlers } from './http-client.js';
import { definitions as cronDefinitions, handlers as cronHandlers } from './cron-parser.js';
import { logToolCall } from '../security/audit.js';
import { requiresConfirmation } from '../security/confirm.js';

export const toolDefinitions = [
  ...osDefinitions,
  ...processDefinitions,
  ...dockerDefinitions,
  ...monitorDefinitions,
  ...networkDefinitions,
  ...gitDefinitions,
  ...githubDefinitions,
  ...codingDefinitions,
  ...browserDefinitions,
  ...jiraDefinitions,
  ...linkedinDefinitions,
  ...xDefinitions,
  ...personaDefinitions,
  ...weatherDefinitions,
  ...translateDefinitions,
  ...cryptoDefinitions,
  ...calculatorDefinitions,
  ...hashDefinitions,
  ...datetimeDefinitions,
  ...jsonToolsDefinitions,
  ...regexDefinitions,
  ...archiveDefinitions,
  ...dnsDefinitions,
  ...textDefinitions,
  ...httpClientDefinitions,
  ...cronDefinitions,
];

const handlerMap = {
  ...osHandlers,
  ...processHandlers,
  ...dockerHandlers,
  ...monitorHandlers,
  ...networkHandlers,
  ...gitHandlers,
  ...githubHandlers,
  ...codingHandlers,
  ...browserHandlers,
  ...jiraHandlers,
  ...linkedinHandlers,
  ...xHandlers,
  ...personaHandlers,
  ...weatherHandlers,
  ...translateHandlers,
  ...cryptoHandlers,
  ...calculatorHandlers,
  ...hashHandlers,
  ...datetimeHandlers,
  ...jsonToolsHandlers,
  ...regexHandlers,
  ...archiveHandlers,
  ...dnsHandlers,
  ...textHandlers,
  ...httpClientHandlers,
  ...cronHandlers,
};

export function checkConfirmation(name, params, config) {
  return requiresConfirmation(name, params, config);
}

export async function executeTool(name, params, context) {
  const handler = handlerMap[name];
  if (!handler) {
    return { error: `Unknown tool: ${name}` };
  }

  const start = Date.now();
  let output;
  let success = true;

  try {
    output = await handler(params, context);
    if (output?.error) success = false;
  } catch (err) {
    output = { error: err.message };
    success = false;
  }

  const duration = Date.now() - start;

  logToolCall({
    user: context.user,
    tool: name,
    params,
    output,
    success,
    duration,
  });

  return output;
}
