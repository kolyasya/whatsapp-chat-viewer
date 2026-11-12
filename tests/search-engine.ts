export interface AttachmentMeta {
  fileName: string;
  extension: string;
  isMedia: boolean;
}

export type MediaType = 'photo_video' | 'voice' | 'document';

export interface MediaItem {
  id: number;
  messageId: number;
  fileName: string;
  fileUrl: string;
  fileType: MediaType;
  extension: string;
  sender: string;
  isUser: boolean;
  date: string;
  time: string;
  caption: string;
}

export interface ChatMessage {
  id: number;
  type: "message" | "system";
  date: string;
  time: string;
  timestamp: number;
  sender: string;
  text: string;
  attachment: AttachmentMeta | null;
  _searchIndex: string;
  mediaIndexId?: number;
}

export interface SearchFilters {
  sender: string;
  dateFrom: number | null;
  dateTo: number | null;
  mediaOnly: boolean;
}

export function parseDateToTimestamp(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const cleanDate = dateStr.replace(/\//g, '.');
  const parts = cleanDate.split('.');
  if (parts.length !== 3) return 0;

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return 0;
  if (year < 100) year += 2000;

  let hours = 0;
  let minutes = 0;
  if (timeStr) {
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      if (/pm/i.test(timeStr) && hours < 12) hours += 12;
      if (/am/i.test(timeStr) && hours === 12) hours = 0;
    }
  }

  const parsedDate = new Date(year, month, day, hours, minutes);
  return parsedDate.getTime() || 0;
}

export function extractAttachment(text: string): { attachment: AttachmentMeta | null; cleanText: string } {
  // Matches English "(file attached)", Russian "(файл добавлен)", Spanish, German, French, Portuguese, Italian, Turkish, etc.
  // or any standard WhatsApp attachment pattern: filename.ext (phrase)
  const attachRegex = /[\u200e\u200f]?([^\s()<>]+\.[A-Za-z0-9]{2,5})\s*\((?:file attached|файл добавлен|archivo adjunto|angehängt|fichier joint|arquivo anexado|allegato|dosya eklendi|[^\)]*attached[^\)]*|[^\)]*добавлен[^\)]*)[^\)]*\)/i;
  const match = text.match(attachRegex);
  if (!match) {
    return {
      attachment: null,
      cleanText: text.replace(/[\u200e\u200f]/g, "").trim()
    };
  }

  const fileName = match[1];
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mediaExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'opus', 'ogg', 'mp3', 'm4a', 'wav', 'aac'];
  const isMedia = mediaExts.includes(ext);
  const cleanText = text.replace(match[0], "").replace(/[\u200e\u200f]/g, "").trim();

  return {
    attachment: {
      fileName,
      extension: ext,
      isMedia
    },
    cleanText
  };
}

export function parseChat(rawText: string): ChatMessage[] {
  const headerRegex = /^(\d{2}[./]\d{2}[./]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*/gm;
  const starts: Array<{ index: number; headerLength: number; date: string; time: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(rawText)) !== null) {
    starts.push({
      index: match.index,
      headerLength: match[0].length,
      date: match[1],
      time: match[2]
    });
  }

  const parsed: ChatMessage[] = [];
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const nextIndex = (i + 1 < starts.length) ? starts[i + 1].index : rawText.length;
    const body = rawText.slice(cur.index + cur.headerLength, nextIndex).trim();

    const timestamp = parseDateToTimestamp(cur.date, cur.time);

    const senderMatch = body.match(/^([^:\n]+?):\s*([\s\S]*)$/);
    if (senderMatch) {
      const sender = senderMatch[1].trim();
      const rawMsgText = senderMatch[2];
      const { attachment, cleanText } = extractAttachment(rawMsgText);
      const searchTarget = `${sender} ${cleanText} ${attachment ? attachment.fileName : ''}`.toLowerCase();

      parsed.push({
        id: i,
        type: "message",
        date: cur.date,
        time: cur.time,
        timestamp,
        sender,
        text: rawMsgText,
        attachment,
        _searchIndex: searchTarget
      });
    } else {
      const { attachment, cleanText } = extractAttachment(body);
      const searchTarget = `${body} ${attachment ? attachment.fileName : ''}`.toLowerCase();
      parsed.push({
        id: i,
        type: "system",
        date: cur.date,
        time: cur.time,
        timestamp,
        sender: "",
        text: body,
        attachment,
        _searchIndex: searchTarget
      });
    }
  }
  return parsed;
}

export function matchMessage(item: ChatMessage, terms: string[], filters: SearchFilters): boolean {
  // 1. Sender Filter
  if (filters.sender && filters.sender !== "ALL") {
    if (item.type === "system" || item.sender !== filters.sender) {
      return false;
    }
  }

  // 2. Media Filter
  if (filters.mediaOnly) {
    if (!item.attachment) return false;
  }

  // 3. Date Range Filter
  if (filters.dateFrom !== null && item.timestamp < filters.dateFrom) {
    return false;
  }
  if (filters.dateTo !== null && item.timestamp > filters.dateTo) {
    return false;
  }

  // 4. Multi-Term Substring Search (AND logic across all terms)
  if (terms.length > 0) {
    const target = item._searchIndex;
    for (let i = 0; i < terms.length; i++) {
      if (!target.includes(terms[i])) {
        return false;
      }
    }
  }

  return true;
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightText(rawText: string, terms: string[]): string {
  if (!rawText) return "";
  if (!terms || terms.length === 0) {
    return escapeHtml(rawText);
  }

  const validTerms = terms
    .map(t => t.trim())
    .filter(t => t.length > 0);

  if (validTerms.length === 0) {
    return escapeHtml(rawText);
  }

  // Safe regex escaping
  const escapedTerms = validTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
  
  // HTML-escape the raw text first to avoid XSS
  const safeText = escapeHtml(rawText);

  // When terms themselves contain characters like < or &, their escaped version will match safeText.
  // To handle plain terms matching inside safeText without corrupting HTML entities:
  return safeText.replace(pattern, '<mark class="search-highlight">$1</mark>');
}

export function classifyMediaType(ext: string): MediaType {
  const cleanExt = (ext || "").toLowerCase().replace(/^\./, "");
  if (["jpg", "jpeg", "png", "gif", "webp", "mp4", "webm", "mov"].includes(cleanExt)) {
    return "photo_video";
  }
  if (["opus", "ogg", "mp3", "m4a", "wav", "aac"].includes(cleanExt)) {
    return "voice";
  }
  return "document";
}

export function buildMediaIndex(messages: ChatMessage[], mediaFileMap?: Map<string, string>): MediaItem[] {
  const mediaIndex: MediaItem[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg.attachment) continue;

    const fileName = msg.attachment.fileName;
    const ext = msg.attachment.extension;
    const fileType = classifyMediaType(ext);
    const isUser = Boolean(msg.sender && (msg.sender.toLowerCase() === "you" || msg.sender.toLowerCase() === "me"));
    const { cleanText } = extractAttachment(msg.text);

    const mediaId = mediaIndex.length;
    const item: MediaItem = {
      id: mediaId,
      messageId: msg.id,
      fileName,
      fileUrl: (mediaFileMap && mediaFileMap.has(fileName)) ? (mediaFileMap.get(fileName) as string) : encodeURI(fileName),
      fileType,
      extension: ext,
      sender: msg.sender || "System",
      isUser,
      date: msg.date,
      time: msg.time,
      caption: cleanText
    };

    mediaIndex.push(item);
    msg.mediaIndexId = mediaId;
  }

  return mediaIndex;
}
