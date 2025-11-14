// content.js

document.addEventListener("copy", (event) => {
  let selectedText = document.getSelection().toString();

  if (!selectedText && event.clipboardData) {
    selectedText = event.clipboardData.getData("text/plain");
  }

  if (selectedText) {
    const sourceUrl = window.location.href || "";
    browser.runtime.sendMessage({ type: "clipboard-copy", text: selectedText, url: sourceUrl });
  }
});

// Listen for paste-text messages and insert text into inputs/textareas
browser.runtime.onMessage.addListener((message) => {
  if (message.type === "paste-text" && message.text) {
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.tagName === "TEXTAREA" ||
        (activeElement.tagName === "INPUT" && activeElement.type === "text"))) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;

      const newValue = value.substring(0, start) + message.text + value.substring(end);
      activeElement.value = newValue;

      const cursorPos = start + message.text.length;
      activeElement.selectionStart = cursorPos;
      activeElement.selectionEnd = cursorPos;

      activeElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      navigator.clipboard.writeText(message.text).then(() => {
        document.execCommand("paste");
      });
    }
  }
});
