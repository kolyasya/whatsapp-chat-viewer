import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseDateToTimestamp,
  extractAttachment,
  parseChat,
  matchMessage,
  escapeHtml,
  highlightText,
  classifyMediaType,
  buildMediaIndex,
  type ChatMessage,
  type SearchFilters,
  type MediaItem,
  type MediaType
} from "./search-engine.ts";

describe("parseDateToTimestamp", () => {
  it("parses DD.MM.YYYY, HH:mm correctly", () => {
    const ts = parseDateToTimestamp("25.07.2019", "22:24");
    const d = new Date(ts);
    assert.equal(d.getFullYear(), 2019);
    assert.equal(d.getMonth(), 6); // 0-indexed July
    assert.equal(d.getDate(), 25);
    assert.equal(d.getHours(), 22);
    assert.equal(d.getMinutes(), 24);
  });

  it("handles 2-digit years DD/MM/YY", () => {
    const ts = parseDateToTimestamp("10/05/21", "09:15");
    const d = new Date(ts);
    assert.equal(d.getFullYear(), 2021);
    assert.equal(d.getMonth(), 4); // May
    assert.equal(d.getDate(), 10);
    assert.equal(d.getHours(), 9);
    assert.equal(d.getMinutes(), 15);
  });

  it("returns 0 on invalid date format", () => {
    assert.equal(parseDateToTimestamp("invalid"), 0);
  });
});

describe("extractAttachment", () => {
  it("extracts '(file attached)' attachment with caption correctly", () => {
    const raw = "IMG-20221021-WA0012.jpg (file attached)\nPhoto of the site";
    const res = extractAttachment(raw);
    assert.notEqual(res.attachment, null);
    assert.equal(res.attachment?.fileName, "IMG-20221021-WA0012.jpg");
    assert.equal(res.attachment?.extension, "jpg");
    assert.equal(res.attachment?.isMedia, true);
    assert.equal(res.cleanText, "Photo of the site");
  });

  it("extracts english '(file attached)' attachment", () => {
    const raw = "document.pdf (file attached)";
    const res = extractAttachment(raw);
    assert.notEqual(res.attachment, null);
    assert.equal(res.attachment?.fileName, "document.pdf");
    assert.equal(res.attachment?.extension, "pdf");
    assert.equal(res.attachment?.isMedia, false);
    assert.equal(res.cleanText, "");
  });

  it("handles text with no attachments", () => {
    const raw = "Hello, how are you?";
    const res = extractAttachment(raw);
    assert.equal(res.attachment, null);
    assert.equal(res.cleanText, "Hello, how are you?");
  });
});

describe("parseChat", () => {
  it("parses chat messages with _searchIndex, attachments, and timestamps", () => {
    const sample = `25.07.2019, 22:24 - Messages and calls are end-to-end encrypted.
25.07.2019, 22:25 - Alice Smith: Hello! The agreement is ready.
26.07.2019, 10:00 - Bob Miller: PTT-20221021-WA0013.opus (file attached)
26.07.2019, 10:05 - Bob Miller: Sent a voice note`;

    const messages = parseChat(sample);
    assert.equal(messages.length, 4);

    assert.equal(messages[0].type, "system");
    assert.ok(messages[0].timestamp > 0);
    assert.ok(messages[0]._searchIndex.includes("encrypted"));

    assert.equal(messages[1].type, "message");
    assert.equal(messages[1].sender, "Alice Smith");
    assert.equal(messages[1].text, "Hello! The agreement is ready.");
    assert.ok(messages[1]._searchIndex.includes("alice smith"));
    assert.ok(messages[1]._searchIndex.includes("agreement is ready"));

    assert.notEqual(messages[2].attachment, null);
    assert.equal(messages[2].attachment?.fileName, "PTT-20221021-WA0013.opus");
    assert.ok(messages[2]._searchIndex.includes("ptt-20221021-wa0013.opus"));
  });
});

describe("matchMessage", () => {
  const item: ChatMessage = {
    id: 1,
    type: "message",
    date: "15.08.2022",
    time: "14:30",
    timestamp: parseDateToTimestamp("15.08.2022", "14:30"),
    sender: "Alice Smith",
    text: "IMG-20221021-WA0012.jpg (file attached) Budget for bathroom is ready",
    attachment: {
      fileName: "IMG-20221021-WA0012.jpg",
      extension: "jpg",
      isMedia: true
    },
    _searchIndex: "alice smith budget for bathroom is ready img-20221021-wa0012.jpg"
  };

  const defaultFilters: SearchFilters = {
    sender: "ALL",
    dateFrom: null,
    dateTo: null,
    mediaOnly: false
  };

  it("matches multi-term search query in any order (AND logic)", () => {
    assert.equal(matchMessage(item, ["bathroom", "budget"], defaultFilters), true);
    assert.equal(matchMessage(item, ["bathroom", "kitchen"], defaultFilters), false);
  });

  it("filters by sender", () => {
    assert.equal(matchMessage(item, [], { ...defaultFilters, sender: "Alice Smith" }), true);
    assert.equal(matchMessage(item, [], { ...defaultFilters, sender: "Bob Miller" }), false);
  });

  it("filters by mediaOnly", () => {
    assert.equal(matchMessage(item, [], { ...defaultFilters, mediaOnly: true }), true);
    const textOnlyItem: ChatMessage = { ...item, attachment: null, _searchIndex: "text" };
    assert.equal(matchMessage(textOnlyItem, [], { ...defaultFilters, mediaOnly: true }), false);
  });

  it("filters by date range", () => {
    const fromTs = parseDateToTimestamp("01.08.2022", "00:00");
    const toTs = parseDateToTimestamp("31.08.2022", "23:59");
    assert.equal(matchMessage(item, [], { ...defaultFilters, dateFrom: fromTs, dateTo: toTs }), true);

    const pastFromTs = parseDateToTimestamp("01.09.2022", "00:00");
    assert.equal(matchMessage(item, [], { ...defaultFilters, dateFrom: pastFromTs }), false);
  });
});

describe("highlightText and escapeHtml", () => {
  it("escapes special HTML characters to prevent XSS", () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    assert.equal(escaped, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it("highlights search terms with <mark class='search-highlight'>", () => {
    const text = "Budget for bathroom is ready for approval";
    const highlighted = highlightText(text, ["bathroom", "budget"]);
    assert.ok(highlighted.includes('<mark class="search-highlight">Budget</mark>'));
    assert.ok(highlighted.includes('<mark class="search-highlight">bathroom</mark>'));
  });

  it("safely handles regex special characters in search terms", () => {
    const text = "Price is 100$ (or 200$)";
    const highlighted = highlightText(text, ["100$", "(or"]);
    assert.ok(highlighted.includes('<mark class="search-highlight">100$</mark>'));
    assert.ok(highlighted.includes('<mark class="search-highlight">(or</mark>'));
  });
});

describe("Media Indexing (TDD)", () => {
  it("classifyMediaType categorizes extensions correctly", () => {
    assert.equal(classifyMediaType("jpg"), "photo_video");
    assert.equal(classifyMediaType("PNG"), "photo_video");
    assert.equal(classifyMediaType("mp4"), "photo_video");
    assert.equal(classifyMediaType("opus"), "voice");
    assert.equal(classifyMediaType("mp3"), "voice");
    assert.equal(classifyMediaType("pdf"), "document");
    assert.equal(classifyMediaType("zip"), "document");
    assert.equal(classifyMediaType("unknown"), "document");
  });

  it("buildMediaIndex extracts media items with correct properties", () => {
    const sample = `25.07.2019, 22:25 - Alice Smith: IMG-20221021-WA0012.jpg (file attached)
Photo of bathroom
26.07.2019, 10:00 - You: PTT-20221021-WA0013.opus (file attached)
26.07.2019, 10:05 - Alice Smith: Invoice.pdf (file attached)`;

    const messages = parseChat(sample);
    const mediaList = buildMediaIndex(messages);

    assert.equal(mediaList.length, 3);

    assert.equal(mediaList[0].id, 0);
    assert.equal(mediaList[0].messageId, 0);
    assert.equal(mediaList[0].fileName, "IMG-20221021-WA0012.jpg");
    assert.equal(mediaList[0].fileUrl, "IMG-20221021-WA0012.jpg");
    assert.equal(mediaList[0].fileType, "photo_video");
    assert.equal(mediaList[0].extension, "jpg");
    assert.equal(mediaList[0].sender, "Alice Smith");
    assert.equal(mediaList[0].isUser, false);
    assert.equal(mediaList[0].caption, "Photo of bathroom");

    assert.equal(mediaList[1].id, 1);
    assert.equal(mediaList[1].messageId, 1);
    assert.equal(mediaList[1].fileType, "voice");
    assert.equal(mediaList[1].isUser, true);
    assert.equal(mediaList[1].caption, "");

    assert.equal(mediaList[2].id, 2);
    assert.equal(mediaList[2].messageId, 2);
    assert.equal(mediaList[2].fileType, "document");
    assert.equal(mediaList[2].caption, "");

    // Bidirectional link: message has mediaIndexId
    assert.equal(messages[0].mediaIndexId, 0);
    assert.equal(messages[1].mediaIndexId, 1);
    assert.equal(messages[2].mediaIndexId, 2);
  });

  it("buildMediaIndex resolves fileUrl from mediaFileMap if present", () => {
    const sample = `25.07.2019, 22:25 - Alice: IMG-001.jpg (file attached)
26.07.2019, 10:00 - Bob: DOC-002.pdf (file attached)`;

    const messages = parseChat(sample);
    const map = new Map<string, string>();
    map.set("IMG-001.jpg", "blob:http://localhost/uuid-img-1");

    const mediaList = buildMediaIndex(messages, map);

    assert.equal(mediaList[0].fileName, "IMG-001.jpg");
    assert.equal(mediaList[0].fileUrl, "blob:http://localhost/uuid-img-1");
    assert.equal(mediaList[1].fileName, "DOC-002.pdf");
    assert.equal(mediaList[1].fileUrl, "DOC-002.pdf");
  });
});
