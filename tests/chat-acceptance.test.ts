import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseChat,
  matchMessage,
  buildMediaIndex,
  classifyMediaType,
  type ChatMessage,
  type SearchFilters,
  type MediaItem
} from "./search-engine.ts";

// Realistic synthetic chat export containing system messages, multi-party dialogue,
// and attachments across photos, videos, voice notes, PDFs, and contacts.
const SYNTHETIC_CHAT_DATA = `10.01.2024, 09:00 - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
10.01.2024, 09:01 - Alice Smith: Good morning team! Welcome to the Project Apollo coordination chat.
10.01.2024, 09:05 - Boris Johnson: Good morning! Happy to join the project.
10.01.2024, 09:15 - Alice Smith: project_specification_v1.pdf (file attached)
Here is the initial project specification document for review.
10.01.2024, 09:20 - Boris Johnson: project_timeline.pdf (file attached)
Work schedule and equipment delivery milestones.
10.01.2024, 10:30 - Charlie Brown: site_survey_photo.jpg (file attached)
Photo of the server room installation site.
10.01.2024, 10:45 - Boris Johnson: IMG_20240110_104500.png (file attached)
Racks connection diagram and power layout
10.01.2024, 11:00 - Alice Smith: walkthrough_video.mp4 (file attached)
Video walkthrough of the datacenter facility.
10.01.2024, 11:30 - Charlie Brown: audio_memo_brief.opus (file attached)
Voice message describing power backup requirements.
10.01.2024, 11:45 - Boris Johnson: PTT-20240110-WA0007.opus (file attached)
Voice message with engineer comments.
10.01.2024, 12:00 - Alice Smith: vendor_contact.vcf (file attached)
Contractor contact card for hardware delivery.
10.01.2024, 12:30 - Boris Johnson: Great, all specification points are approved. Beginning procurement.
10.01.2024, 12:35 - Charlie Brown: All milestones confirmed for Apollo launch.`;

describe("Synthetic Chat Acceptance Test Suite", () => {
  it("parses synthetic chat into messages and system events accurately", () => {
    const messages = parseChat(SYNTHETIC_CHAT_DATA);
    assert.equal(messages.length, 13);

    // Message 0 is system notice
    assert.equal(messages[0].type, "system");
    assert.equal(messages[0].sender, "");
    assert.ok(messages[0]._searchIndex.includes("encrypted"));
    assert.equal(messages[0].attachment, null);

    // Message 1 is standard text
    assert.equal(messages[1].type, "message");
    assert.equal(messages[1].sender, "Alice Smith");
    assert.equal(messages[1].attachment, null);
    assert.ok(messages[1].text.includes("Project Apollo coordination chat"));
    assert.ok(messages[1]._searchIndex.includes("alice smith"));
    assert.ok(messages[1]._searchIndex.includes("apollo"));
  });

  it("extracts and categorizes attachments correctly", () => {
    const messages = parseChat(SYNTHETIC_CHAT_DATA);

    // Message 2: PDF English
    assert.equal(messages[3].attachment?.fileName, "project_specification_v1.pdf");
    assert.equal(messages[3].attachment?.extension, "pdf");
    assert.equal(messages[3].attachment?.isMedia, false);
    assert.ok(messages[3]._searchIndex.includes("project_specification_v1.pdf"));

    // Message 3: PDF
    assert.equal(messages[4].attachment?.fileName, "project_timeline.pdf");
    assert.equal(messages[4].attachment?.extension, "pdf");
    assert.equal(messages[4].attachment?.isMedia, false);

    // Message 4: JPG photo English
    assert.equal(messages[5].attachment?.fileName, "site_survey_photo.jpg");
    assert.equal(messages[5].attachment?.extension, "jpg");
    assert.equal(messages[5].attachment?.isMedia, true);

    // Message 5: PNG photo
    assert.equal(messages[6].attachment?.fileName, "IMG_20240110_104500.png");
    assert.equal(messages[6].attachment?.extension, "png");
    assert.equal(messages[6].attachment?.isMedia, true);

    // Message 6: MP4 video English
    assert.equal(messages[7].attachment?.fileName, "walkthrough_video.mp4");
    assert.equal(messages[7].attachment?.extension, "mp4");
    assert.equal(messages[7].attachment?.isMedia, true);

    // Message 7: OPUS voice memo English
    assert.equal(messages[8].attachment?.fileName, "audio_memo_brief.opus");
    assert.equal(messages[8].attachment?.extension, "opus");
    assert.equal(messages[8].attachment?.isMedia, true);

    // Message 8: OPUS voice memo
    assert.equal(messages[9].attachment?.fileName, "PTT-20240110-WA0007.opus");
    assert.equal(messages[9].attachment?.extension, "opus");
    assert.equal(messages[9].attachment?.isMedia, true);

    // Message 9: VCF contact card
    assert.equal(messages[10].attachment?.fileName, "vendor_contact.vcf");
    assert.equal(messages[10].attachment?.extension, "vcf");
    assert.equal(messages[10].attachment?.isMedia, false);
  });

  it("builds media index with complete classification and bidirectional links", () => {
    const messages = parseChat(SYNTHETIC_CHAT_DATA);
    const mediaItems = buildMediaIndex(messages);

    // Expected media count: 8 attached files (indices 3..10)
    assert.equal(mediaItems.length, 8);

    // Classifications:
    // 0: project_specification_v1.pdf -> document
    assert.equal(mediaItems[0].fileName, "project_specification_v1.pdf");
    assert.equal(mediaItems[0].fileType, "document");
    assert.equal(mediaItems[0].messageId, 3);
    assert.equal(messages[3].mediaIndexId, 0);

    // 1: project_timeline.pdf -> document
    assert.equal(mediaItems[1].fileName, "project_timeline.pdf");
    assert.equal(mediaItems[1].fileType, "document");
    assert.equal(mediaItems[1].messageId, 4);
    assert.equal(messages[4].mediaIndexId, 1);

    // 2: site_survey_photo.jpg -> photo_video
    assert.equal(mediaItems[2].fileName, "site_survey_photo.jpg");
    assert.equal(mediaItems[2].fileType, "photo_video");
    assert.equal(mediaItems[2].caption, "Photo of the server room installation site.");
    assert.equal(mediaItems[2].messageId, 5);
    assert.equal(messages[5].mediaIndexId, 2);

    // 3: IMG_20240110_104500.png -> photo_video
    assert.equal(mediaItems[3].fileName, "IMG_20240110_104500.png");
    assert.equal(mediaItems[3].fileType, "photo_video");
    assert.equal(mediaItems[3].caption, "Racks connection diagram and power layout");
    assert.equal(mediaItems[3].messageId, 6);
    assert.equal(messages[6].mediaIndexId, 3);

    // 4: walkthrough_video.mp4 -> photo_video
    assert.equal(mediaItems[4].fileName, "walkthrough_video.mp4");
    assert.equal(mediaItems[4].fileType, "photo_video");
    assert.equal(mediaItems[4].messageId, 7);
    assert.equal(messages[7].mediaIndexId, 4);

    // 5: audio_memo_brief.opus -> voice
    assert.equal(mediaItems[5].fileName, "audio_memo_brief.opus");
    assert.equal(mediaItems[5].fileType, "voice");
    assert.equal(mediaItems[5].messageId, 8);
    assert.equal(messages[8].mediaIndexId, 5);

    // 6: PTT-20240110-WA0007.opus -> voice
    assert.equal(mediaItems[6].fileName, "PTT-20240110-WA0007.opus");
    assert.equal(mediaItems[6].fileType, "voice");
    assert.equal(mediaItems[6].messageId, 9);
    assert.equal(messages[9].mediaIndexId, 6);

    // 7: vendor_contact.vcf -> document
    assert.equal(mediaItems.find(m => m.fileName === "vendor_contact.vcf")?.fileType, "document");

    // Check counts by mediaType category
    const photoVideoCount = mediaItems.filter(m => m.fileType === "photo_video").length;
    const voiceCount = mediaItems.filter(m => m.fileType === "voice").length;
    const docCount = mediaItems.filter(m => m.fileType === "document").length;

    assert.equal(photoVideoCount, 3); // jpg, png, mp4
    assert.equal(voiceCount, 2);      // 2 opus voice notes
    assert.equal(docCount, 3);        // 2 pdfs, 1 vcf
  });

  it("filters search results by sender, mediaOnly, and multi-term queries", () => {
    const messages = parseChat(SYNTHETIC_CHAT_DATA);

    const baseFilters: SearchFilters = {
      sender: "ALL",
      dateFrom: null,
      dateTo: null,
      mediaOnly: false
    };

    // 1. Sender filtering
    const aliceMsgs = messages.filter(m => matchMessage(m, [], { ...baseFilters, sender: "Alice Smith" }));
    assert.equal(aliceMsgs.length, 4);

    const borisMsgs = messages.filter(m => matchMessage(m, [], { ...baseFilters, sender: "Boris Johnson" }));
    assert.equal(borisMsgs.length, 5);

    const charlieMsgs = messages.filter(m => matchMessage(m, [], { ...baseFilters, sender: "Charlie Brown" }));
    assert.equal(charlieMsgs.length, 3);

    // 2. MediaOnly filter
    const mediaOnlyMsgs = messages.filter(m => matchMessage(m, [], { ...baseFilters, mediaOnly: true }));
    assert.equal(mediaOnlyMsgs.length, 8); // 8 attachments total in chat

    // 3. Multi-term query matching (AND logic across terms)
    const apolloResults = messages.filter(m => matchMessage(m, ["apollo"], baseFilters));
    assert.equal(apolloResults.length, 2); // Alice welcome + Charlie launch

    const specResults = messages.filter(m => matchMessage(m, ["specification", "approved"], baseFilters));
    assert.equal(specResults.length, 1);
    assert.equal(specResults[0].sender, "Boris Johnson");

    const multiTermAttached = messages.filter(m => matchMessage(m, ["server", "room"], baseFilters));
    assert.equal(multiTermAttached.length, 1);
    assert.equal(multiTermAttached[0].attachment?.fileName, "site_survey_photo.jpg");
  });

  it("verifies extension classification coverage", () => {
    assert.equal(classifyMediaType("jpg"), "photo_video");
    assert.equal(classifyMediaType("jpeg"), "photo_video");
    assert.equal(classifyMediaType("png"), "photo_video");
    assert.equal(classifyMediaType("gif"), "photo_video");
    assert.equal(classifyMediaType("webp"), "photo_video");
    assert.equal(classifyMediaType("mp4"), "photo_video");
    assert.equal(classifyMediaType("webm"), "photo_video");
    assert.equal(classifyMediaType("mov"), "photo_video");

    assert.equal(classifyMediaType("opus"), "voice");
    assert.equal(classifyMediaType("ogg"), "voice");
    assert.equal(classifyMediaType("mp3"), "voice");
    assert.equal(classifyMediaType("m4a"), "voice");
    assert.equal(classifyMediaType("wav"), "voice");
    assert.equal(classifyMediaType("aac"), "voice");

    assert.equal(classifyMediaType("pdf"), "document");
    assert.equal(classifyMediaType("vcf"), "document");
    assert.equal(classifyMediaType("docx"), "document");
    assert.equal(classifyMediaType("xlsx"), "document");
    assert.equal(classifyMediaType("zip"), "document");
  });
});
