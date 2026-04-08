import { MESSAGE_TYPES } from '../shared/constants';
import type { ClipboardHistoryItem } from '../types';

export function mapType(type: string): ClipboardHistoryItem['type'] {
  switch (type) {
    case MESSAGE_TYPES.COPY_SELECTION:
      return 'selection';
    case MESSAGE_TYPES.COPY_SELECTION_LINK:
      return 'link';
    case MESSAGE_TYPES.COPY_PAGE:
      return 'page';
    case MESSAGE_TYPES.COPY_LINKS:
    default:
      return 'links';
  }
}

export function mapOperation(op: string): string {
  switch (op) {
    case 'selection':
      return MESSAGE_TYPES.COPY_SELECTION;
    case 'page':
      return MESSAGE_TYPES.COPY_PAGE;
    case 'links':
      return MESSAGE_TYPES.COPY_LINKS;
    default:
      return MESSAGE_TYPES.COPY_PAGE;
  }
}

export function countLinks(text: string): number {
  return (text.match(/https?:\/\/\S+/g) || []).length;
}
