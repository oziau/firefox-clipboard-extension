// background.js
var browser = browser || chrome;

let clipboardHistory = [];
let snippets = {};

// Load snippets and clipboard history on start
browser.storage.local.get(["clipboardHistory", "snippets"]).then(result => {
  clipboardHistory = result.clipboardHistory || [];
  snippets = result.snippets || {};
});

// Helper function to generate a unique ID using timestamp plus random suffix
function generateUniqueId() {
  return Date.now() + "-" + Math.floor(Math.random() * 1000000);
}

function addClipboardItem(text, url = "") {
  if (!text) return;

  // Expand text if matches a snippet exactly (dynamic snippets)
  if (snippets[text]) {
    text = snippets[text];
  }

  // Add new clipboard item with unique id
  clipboardHistory.unshift({ text, url, id: generateUniqueId() });

  if (clipboardHistory.length > 100) {
    clipboardHistory.pop();
  }

  browser.storage.local.set({ clipboardHistory });
}

// Listen for changes to snippets storage to update snippets object
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.snippets) {
    snippets = changes.snippets.newValue || {};
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.type === "clipboard-copy" && message.text) {
    addClipboardItem(message.text, message.url || "");
  }
});

// Listen for paste-last-item command shortcut
browser.commands.onCommand.addListener(async (command) => {
  if (command === "paste-last-item") {
    if (clipboardHistory.length === 0) return;

    const lastItem = clipboardHistory[0];
    const text = lastItem.text;

    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;

      browser.tabs.sendMessage(tabs[0].id, { type: "paste-text", text });
    } catch (e) {
      console.error("Failed to send paste message:", e);
    }
  }
});
