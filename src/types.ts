import { MESSAGE_TYPES } from './shared/constants';

export type OperationType = 'selection' | 'page' | 'links';

export type AttributionStyle = 'simple' | 'harvard' | 'apa' | 'mla' | 'custom';

export interface Template {
  id: string;
  name: string;
  content: string;
}

export interface SelectorMap {
  name: string;
  selector: string;
}

export interface SmartPasteConfig {
  id: string;
  name: string;
  enabled: boolean;
  sourcePattern: string; // URL glob pattern (e.g., "*://*.amazon.com/*")
  targetPattern: string; // Where to paste (e.g., "*://inventory.mysite.com/*")
  sourceSelectors: SelectorMap[]; // What to extract from source
  targetSelectors: SelectorMap[]; // Where to paste in target
  template?: string; // Format extracted data (optional)
  autoTrigger: boolean; // Auto-paste on page load vs manual
  createdAt: number;
  lastUsed?: number;
}

export interface Settings {
  includeSource: boolean;
  template: Record<OperationType, string>;
  customTemplate: Record<OperationType, string>;
  wrapCodeFences: Record<OperationType, boolean>;
  selectors: {
    page: SelectorMap[];
    links: SelectorMap[];
  };
  attributionPlaceholder: string;
  attributionStyle: AttributionStyle;
  customAttributionTemplate?: string;
  quickActions: QuickAction[];
  popupLayout: PopupLayout;
}

export type PopupWidgetId = 'copyActions' | 'stats' | 'history' | 'sourceToggle';
export type PopupWidgetSize = 'sm' | 'md' | 'fill';

export interface PopupLayoutItem {
  id: PopupWidgetId;
  enabled: boolean;
  size: PopupWidgetSize;
}

export interface PopupLayout {
  items: PopupLayoutItem[];
}

export interface ClipboardHistoryItem {
  text: string;
  type: 'selection' | 'page' | 'links' | 'link';
  url?: string;
  title?: string;
  timestamp: number;
}

export interface QuickAction {
  name: string;
  operation: OperationType;
  template: string;
  customTemplate?: string;
  wrapCodeFences?: boolean;
  includeSource?: boolean;
  commandSlot?: 'quick-action-1' | 'quick-action-2' | 'quick-action-3' | '';
}

export interface Stats {
  totalCopies: number;
  totalLinks: number;
  timeSavedSeconds: number;
  lastUsed?: number;
}

export interface License {
  userId: string;
  licenseKey: string;
  isPremium: boolean;
  licenseType?: 'trial' | 'premium'; // trial (7 days) or premium (lifetime)
  purchasedAt?: number;
  expiresAt?: number; // For one-time purchases, this would be far in the future
  trialStartedAt?: number; // Only for trial licenses
  daysRemaining?: number; // Days remaining for trial licenses
  lastChecked?: number;
}

export interface ExtractedData {
  [key: string]: string; // Map of selector name to extracted text
}

// Message types for content script communication
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES];

export interface BaseMessage {
  type: MessageType;
}

export interface CopyMessage extends BaseMessage {
  type:
    | typeof MESSAGE_TYPES.COPY_SELECTION
    | typeof MESSAGE_TYPES.COPY_SELECTION_LINK
    | typeof MESSAGE_TYPES.COPY_PAGE
    | typeof MESSAGE_TYPES.COPY_LINKS;
  templateId?: string;
  customTemplate?: string;
  wrapCodeFences?: boolean;
  includeSource?: boolean;
  showToast?: boolean;
}

export interface PingResponse extends ContentResponse {
  ready: true;
}

export interface SelectorPickerMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.START_SELECTOR_PICKER;
}

export interface ExtractWithSelectorsMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.EXTRACT_WITH_SELECTORS;
  selectors: SelectorMap[];
  template?: string;
  showToast?: boolean;
}

export interface PasteWithSelectorsMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.PASTE_WITH_SELECTORS;
  data: ExtractedData;
  selectors: SelectorMap[];
  showToast?: boolean;
}

export interface TestSelectorsMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.TEST_SELECTORS;
  selectors: SelectorMap[];
  template?: string;
  wrapCodeFences?: boolean;
}

export interface PingMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.PING;
}

export interface CopyToClipboardMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.COPY_TO_CLIPBOARD;
  text: string;
  html?: string;
}

export interface CopyCompletedMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.COPY_COMPLETED;
  data: {
    copyType: ClipboardHistoryItem['type'];
    text: string;
    metadata?: {
      title?: string;
      url?: string;
    };
  };
}

export interface SmartPasteExtractMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SMART_PASTE_EXTRACT;
  configId: string;
  selectors: SelectorMap[];
}

export interface SmartPasteInsertMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SMART_PASTE_INSERT;
  configId: string;
  data: ExtractedData;
  selectors: SelectorMap[];
}

export interface SmartPasteTestMessage extends BaseMessage {
  type: typeof MESSAGE_TYPES.SMART_PASTE_TEST;
  config: SmartPasteConfig;
}

export type ContentMessage =
  | CopyMessage
  | SelectorPickerMessage
  | ExtractWithSelectorsMessage
  | PasteWithSelectorsMessage
  | TestSelectorsMessage
  | SmartPasteExtractMessage
  | SmartPasteInsertMessage
  | SmartPasteTestMessage
  | PingMessage;

export type Message<T extends MessageType = MessageType> =
  T extends CopyMessage['type'] ? CopyMessage :
  T extends PingMessage['type'] ? PingMessage :
  T extends SelectorPickerMessage['type'] ? SelectorPickerMessage :
  T extends ExtractWithSelectorsMessage['type'] ? ExtractWithSelectorsMessage :
  T extends PasteWithSelectorsMessage['type'] ? PasteWithSelectorsMessage :
  T extends TestSelectorsMessage['type'] ? TestSelectorsMessage :
  T extends CopyToClipboardMessage['type'] ? CopyToClipboardMessage :
  T extends CopyCompletedMessage['type'] ? CopyCompletedMessage :
  BaseMessage;

export type MessagePayload<T extends MessageType> = Omit<Message<T>, 'type'>;

export function createMessage<T extends MessageType>(type: T, payload?: MessagePayload<T>): Message<T> {
  return { type, ...(payload as object) } as Message<T>;
}

export interface ContentResponse {
  success?: boolean;
  error?: string;
  text?: string;
  ready?: boolean;
  requiresPremium?: boolean;
  cancelled?: boolean;
  result?: unknown;
  extracted?: ExtractedData;
  formatted?: string;
  pastedCount?: number;
}

// Storage types
export interface StorageSyncData {
  [key: string]: unknown;
}

export interface StorageLocalData {
  [key: string]: unknown;
}

export interface ThemeStorage {
  [key: string]: 'light' | 'dark';
}

export interface TemplatesStorage {
  [key: string]: Template[];
}

export interface QuickActionsStorage {
  [key: string]: QuickAction[];
}

export interface HistoryStorage {
  [key: string]: ClipboardHistoryItem[];
}

export interface StatsStorage {
  [key: string]: Stats;
}
