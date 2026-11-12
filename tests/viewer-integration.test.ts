import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("WhatsApp Chat Viewer HTML Integration", () => {
  const htmlPath = join(process.cwd(), "WhatsApp Chat Viewer.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  it("contains search toolbar markup and control elements", () => {
    assert.ok(htmlContent.includes('id="searchInput"'));
    assert.ok(htmlContent.includes('id="searchClearBtn"'));
    assert.ok(htmlContent.includes('id="senderFilter"'));
    assert.ok(htmlContent.includes('id="dateFrom"'));
    assert.ok(htmlContent.includes('id="dateTo"'));
    assert.ok(htmlContent.includes('id="mediaOnly"'));
    assert.ok(htmlContent.includes('id="resetFiltersBtn"'));
    assert.ok(htmlContent.includes('id="searchStats"'));
  });

  it("contains required CSS styles for search panel and highlights", () => {
    assert.ok(htmlContent.includes(".search-panel"));
    assert.ok(htmlContent.includes(".search-highlight"));
    assert.ok(htmlContent.includes(".empty-search-state"));
  });

  it("contains core search algorithms and event handlers", () => {
    assert.ok(htmlContent.includes("function matchMessage"));
    assert.ok(htmlContent.includes("function highlightText"));
    assert.ok(htmlContent.includes("function escapeHtml"));
    assert.ok(htmlContent.includes("function applySearchAndFilter"));
    assert.ok(htmlContent.includes("function renderNextBatch"));
  });

  it("contains keyboard shortcuts (Ctrl+F / Cmd+F, Escape)", () => {
    assert.ok(htmlContent.includes("keydown"));
    assert.ok(htmlContent.includes('e.key === "f"'));
    assert.ok(htmlContent.includes('e.key === "Escape"'));
  });

  it("contains media gallery and view switcher markup", () => {
    assert.ok(htmlContent.includes('id="view-tab-chat"'));
    assert.ok(htmlContent.includes('id="view-tab-media"'));
    assert.ok(htmlContent.includes('id="total-media-count"'));
    assert.ok(htmlContent.includes('id="media-gallery-container"'));
    assert.ok(htmlContent.includes('id="gallery-grid"'));
    assert.ok(htmlContent.includes('id="gallery-search-input"'));
    assert.ok(htmlContent.includes('data-filter="all"'));
    assert.ok(htmlContent.includes('data-filter="photo_video"'));
    assert.ok(htmlContent.includes('data-filter="voice"'));
    assert.ok(htmlContent.includes('data-filter="document"'));
  });

  it("contains lightbox modal markup and controls", () => {
    assert.ok(htmlContent.includes('id="lightbox-modal"'));
    assert.ok(htmlContent.includes('id="lightbox-viewport"'));
    assert.ok(htmlContent.includes('id="lightbox-btn-jump"'));
    assert.ok(htmlContent.includes('id="lightbox-btn-download"'));
    assert.ok(htmlContent.includes('id="lightbox-btn-close"'));
    assert.ok(htmlContent.includes('id="lightbox-btn-prev"'));
    assert.ok(htmlContent.includes('id="lightbox-btn-next"'));
    assert.ok(htmlContent.includes('id="lightbox-caption"'));
  });

  it("contains media viewer CSS classes and pulse animation", () => {
    assert.ok(htmlContent.includes(".lightbox-modal"));
    assert.ok(htmlContent.includes(".gallery-grid"));
    assert.ok(htmlContent.includes(".gallery-card"));
    assert.ok(htmlContent.includes(".highlight-pulse"));
    assert.ok(htmlContent.includes("@keyframes messageHighlightPulse"));
  });

  it("contains media viewer JS algorithms and event handlers", () => {
    assert.ok(htmlContent.includes("function buildMediaIndex"));
    assert.ok(htmlContent.includes("function classifyMediaType"));
    assert.ok(htmlContent.includes("function openLightbox"));
    assert.ok(htmlContent.includes("function closeLightbox"));
    assert.ok(htmlContent.includes("function showPrevMedia"));
    assert.ok(htmlContent.includes("function showNextMedia"));
    assert.ok(htmlContent.includes("function jumpToChatMessage"));
    assert.ok(htmlContent.includes("function switchView"));
    assert.ok(htmlContent.includes("function filterGalleryMedia"));
  });

  it("restores display: flex on chatContainer when switching back to chat view", () => {
    assert.ok(htmlContent.includes('chatContainer.style.display = "flex";'));
  });

  it("contains scroll-to-bottom button markup and CSS styles", () => {
    assert.ok(htmlContent.includes('id="scrollToBottomBtn"'));
    assert.ok(htmlContent.includes(".scroll-bottom-btn"));
    assert.ok(htmlContent.includes(".scroll-bottom-btn.visible"));
  });

  it("contains scroll-to-bottom logic and keyboard navigation", () => {
    assert.ok(htmlContent.includes("function updateScrollBottomButton"));
    assert.ok(htmlContent.includes("function scrollToBottom"));
    assert.ok(htmlContent.includes('scrollToBottomBtn.addEventListener("click", scrollToBottom)'));
    assert.ok(htmlContent.includes('e.key === "End"'));
  });

  it("activates the most recent message position by default on chat load", () => {
    assert.ok(htmlContent.includes("scrollToBottom({ behavior: 'auto' })"));
  });

  it("contains message context menu markup and CSS styles", () => {
    assert.ok(htmlContent.includes('id="messageContextMenu"'));
    assert.ok(htmlContent.includes('id="contextMenuGoHistory"'));
    assert.ok(htmlContent.includes(".chat-context-menu"));
    assert.ok(htmlContent.includes(".chat-context-menu-item"));
  });

  it("contains message context menu controller and jump logic", () => {
    assert.ok(htmlContent.includes("function hideContextMenu"));
    assert.ok(htmlContent.includes('chatContainer.addEventListener("contextmenu"'));
    assert.ok(htmlContent.includes("contextMenuGoHistory.addEventListener(\"click\""));
    assert.ok(htmlContent.includes("jumpToChatMessage(targetId, { resetSearch: true })"));
  });
});
