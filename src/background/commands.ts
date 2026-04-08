import { getQuickActions } from '../shared/storage';
import { ensureContent } from './injection';
import { mapOperation } from './utils';
import { MESSAGE_TYPES } from '../shared/constants';

function mapCommandToMessageType(command: string): string | null {
  switch (command) {
    case 'copy-selection':
      return MESSAGE_TYPES.COPY_SELECTION;
    case 'copy-selection-link':
      return MESSAGE_TYPES.COPY_SELECTION_LINK;
    case 'copy-page':
      return MESSAGE_TYPES.COPY_PAGE;
    case 'copy-links':
      return MESSAGE_TYPES.COPY_LINKS;
    default:
      return null;
  }
}

export async function handleCommand(command: string): Promise<void> {
  const builtInType = mapCommandToMessageType(command);

  const quickActions = await getQuickActions();
  const qa = quickActions.find(q => q.commandSlot === command);
  if (!qa && !builtInType) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const ok = await ensureContent(tab.id, tab.url);
  if (!ok) return;

  if (builtInType) {
    chrome.tabs.sendMessage(tab.id, { type: builtInType });
    return;
  }

  chrome.tabs.sendMessage(tab.id, {
    type: mapOperation(qa!.operation),
    templateId: qa!.template,
    customTemplate: qa!.customTemplate,
    wrapCodeFences: qa!.wrapCodeFences,
    includeSource: qa!.includeSource,
  });
}
