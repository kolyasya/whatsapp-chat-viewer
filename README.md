# WhatsApp Chat Viewer

WhatsApp Chat Viewer is a standalone web page to view exported WhatsApp chats. The application works directly in a web browser. It does not send data to an external server.

## Features

### Chat Timeline
- Parses exported WhatsApp chat files (`.txt`).
- Shows messages in a timeline with sender-specific message bubbles.
- Supports system messages, multi-line messages, timestamps, and attached media filenames.

### Search Engine
- High-speed text search across all chat messages.
- Highlights matched search terms in the message text.
- Case-sensitive search option.
- Regular expression search option.

### Filter Bar
- Sender filter: filter messages by specific participants.
- Date range filter: filter messages by start date and end date.
- Media-only filter: show only messages that contain attached media.

### Media Gallery View
- Tabbed navigation between the Chat view and the Media Gallery view.
- Category filters: All, Photos & Videos, Voice Notes, and Documents.
- Shows item counts for each media category.
- Search filter for media filenames.
- Lazy rendering for fast performance with large media sets.

### Lightbox Viewer
- Full-screen viewer for photos and videos.
- Zoom and pan controls for images.
- Audio playback controls for voice notes (`.opus`, `.m4a`, `.ogg`, `.mp3`).
- Download button for open media files.
- Previous and next buttons for gallery navigation.
- "Jump to message" action to open the related message in the chat timeline.

### Standalone and Web Operation
- Operates fully on the client side.
- Requires no server, backend service, or network connection. All data stays in your browser.
- Compatible with GitHub Pages and local `file://` execution.
- Supports drag-and-drop and folder upload for complete media access on web.

## How to Use

### Online (GitHub Pages)
1. Open the application at `https://kolyasya.github.io/whatsapp-chat-viewer/`.
2. Click **Select chat folder** or drag and drop your unpacked WhatsApp export folder directly onto the window.
3. The viewer immediately displays messages, pictures, voice notes, videos, and documents without uploading files to any server.

### Local Use (Direct File)
1. Export a chat from WhatsApp (with media attachments).
2. Unpack the exported `.zip` archive.
3. Open `WhatsApp Chat Viewer.html` (or `index.html`) in your web browser.
4. Click **Select export .txt file** or **Select chat folder**, or drag and drop the files into the window.
   - Alternatively, keep `WhatsApp Chat Viewer.html` directly in the unpacked chat directory and select the `.txt` file.
## Development and Testing

### Prerequisites
- Node.js 20 or higher
- pnpm (or npm / yarn)

### Install Dependencies
```bash
pnpm install
```

### Run Tests
Run the test suite (Vitest):
```bash
pnpm test
```

Run test suite in watch mode:
```bash
pnpm test:watch
```

Run test coverage:
```bash
pnpm test:coverage
```

## License

This project is open-source software licensed under the [MIT License](LICENSE).
