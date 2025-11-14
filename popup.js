const historyContainer = document.getElementById("history");
const searchBox = document.getElementById("searchBox");
const snippetKeyInput = document.getElementById("snippetKey");
const snippetValueInput = document.getElementById("snippetValue");
const addSnippetBtn = document.getElementById("addSnippetBtn");
const backupBtn = document.getElementById("backupBtn");
const restoreBtn = document.getElementById("restoreBtn");
const backupDataArea = document.getElementById("backupData");

const selectAllBtn = document.getElementById("selectAllBtn");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const showAllBtn = document.getElementById("showAllBtn");
const showFavBtn = document.getElementById("showFavBtn");

let clipboardHistory = [];
let snippets = {};
let showFavoritesOnly = false;
let selectedItems = new Set();
let allSelected = false;

// Load clipboard history and snippets
function loadData() {
  browser.storage.local.get(["clipboardHistory", "snippets"]).then((result) => {
    clipboardHistory = Array.isArray(result.clipboardHistory) ? result.clipboardHistory : [];
    snippets = typeof result.snippets === "object" && result.snippets !== null ? result.snippets : {};
    renderHistory(getFilteredHistory());
  }).catch((e) => {
    clipboardHistory = [];
    snippets = {};
    historyContainer.textContent = "Failed to load clipboard history.";
    console.error("Storage get error:", e);
  });
}

// Filter history based on toggle and search
function getFilteredHistory() {
  let data = clipboardHistory;
  if (showFavoritesOnly) {
    data = data.filter(item => item.favorite === true);
  }
  const searchTerm = searchBox.value.toLowerCase();
  if (searchTerm) {
    data = data.filter(item =>
      item.text.toLowerCase().includes(searchTerm) ||
      (item.url && item.url.toLowerCase().includes(searchTerm))
    );
  }
  return data;
}

// Render clipboard items with checkboxes, favorite toggle, and delete button
function renderHistory(history) {
  historyContainer.innerHTML = "";
  selectedItems.clear();
  deleteSelectedBtn.style.display = "none";
  allSelected = false;
  selectAllBtn.textContent = "Select All";

  if (history.length === 0) {
    historyContainer.textContent = "No clipboard history yet.";
    return;
  }

  history.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item";

    const leftDiv = document.createElement("div");
    leftDiv.className = "source-text";

    // Checkbox for multi-select
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.style.marginRight = "8px";
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedItems.add(item.id);
      } else {
        selectedItems.delete(item.id);
      }
      deleteSelectedBtn.style.display = selectedItems.size > 0 ? "inline-block" : "none";

      // Update selectAllBtn text and state
      const totalCheckboxes = historyContainer.querySelectorAll("input[type=checkbox]").length;
      if (selectedItems.size === totalCheckboxes) {
        selectAllBtn.textContent = "Deselect All";
        allSelected = true;
      } else {
        selectAllBtn.textContent = "Select All";
        allSelected = false;
      }
    });
    leftDiv.appendChild(checkbox);

    // Copied text span
    const textSpan = document.createElement("span");
    textSpan.textContent = item.text;
    textSpan.title = new Date(item.timestamp).toLocaleString();
    textSpan.addEventListener("click", () => {
      copyToClipboard(item.text);
    });
    leftDiv.appendChild(textSpan);

    // "jump" link for source URL
    if (item.url) {
      const sourceLink = document.createElement("a");
      sourceLink.href = item.url;
      sourceLink.target = "_blank";
      sourceLink.rel = "noopener noreferrer";
      sourceLink.className = "source-link";
      sourceLink.textContent = "jump";
      sourceLink.title = item.url;
      leftDiv.appendChild(sourceLink);
    }

    // Favorite toggle button with yellow "F"
    const favToggle = document.createElement("button");
    favToggle.textContent = "F";
    favToggle.title = item.favorite ? "Unmark Favorite" : "Mark as Favorite";
    favToggle.className = "favorite-toggle";
    favToggle.style.color = item.favorite ? "#f1c40f" : "#ccc";
    favToggle.addEventListener("click", () => {
      toggleFavorite(item);
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => {
      deleteHistoryItem(item);
    });

    div.appendChild(leftDiv);
    div.appendChild(favToggle);
    div.appendChild(deleteBtn);
    historyContainer.appendChild(div);
  });
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert("Copied to clipboard!");
  }).catch(err => {
    alert("Failed to copy: " + err);
  });
}

// Delete a clipboard item by unique id
function deleteHistoryItem(item) {
  clipboardHistory = clipboardHistory.filter(i => i.id !== item.id);
  browser.storage.local.set({ clipboardHistory }).then(() => {
    renderHistory(getFilteredHistory());
  });
}

// Toggle favorite state
function toggleFavorite(item) {
  const index = clipboardHistory.findIndex(i => i.id === item.id);
  if (index !== -1) {
    clipboardHistory[index].favorite = !clipboardHistory[index].favorite;
    browser.storage.local.set({ clipboardHistory }).then(() => {
      renderHistory(getFilteredHistory());
    });
  }
}

// Select all / deselect all toggle for checkboxes
selectAllBtn.addEventListener("click", () => {
  const checkboxes = Array.from(historyContainer.querySelectorAll("input[type=checkbox]"));
  if (!allSelected) {
    checkboxes.forEach(cb => {
      cb.checked = true;
      cb.dispatchEvent(new Event("change"));
    });
    selectAllBtn.textContent = "Deselect All";
    allSelected = true;
  } else {
    checkboxes.forEach(cb => {
      cb.checked = false;
      cb.dispatchEvent(new Event("change"));
    });
    selectAllBtn.textContent = "Select All";
    allSelected = false;
  }
});

// Delete all selected items by ids
deleteSelectedBtn.addEventListener("click", () => {
  if (selectedItems.size === 0) return;
  clipboardHistory = clipboardHistory.filter(item => !selectedItems.has(item.id));
  browser.storage.local.set({ clipboardHistory }).then(() => {
    selectedItems.clear();
    deleteSelectedBtn.style.display = "none";
    renderHistory(getFilteredHistory());
  });
});

showAllBtn.addEventListener("click", () => {
  showFavoritesOnly = false;
  updateToggleButtons();
  renderHistory(getFilteredHistory());
});

showFavBtn.addEventListener("click", () => {
  showFavoritesOnly = true;
  updateToggleButtons();
  renderHistory(getFilteredHistory());
});

function updateToggleButtons() {
  showFavBtn.classList.toggle("active", showFavoritesOnly);
  showAllBtn.classList.toggle("active", !showFavoritesOnly);
}

searchBox.addEventListener("input", () => {
  renderHistory(getFilteredHistory());
});

// Snippet management
addSnippetBtn.addEventListener("click", () => {
  const key = snippetKeyInput.value.trim();
  const value = snippetValueInput.value.trim();
  if (!key || !value) {
    alert("Please enter both snippet shortcut and text.");
    return;
  }
  snippets[key] = value;
  browser.storage.local.set({ snippets }).then(() => {
    alert(`Snippet ${key} saved.`);
    snippetKeyInput.value = "";
    snippetValueInput.value = "";
  });
});

// Backup and restore
backupBtn.addEventListener("click", () => {
  backupDataArea.value = JSON.stringify(clipboardHistory, null, 2);
  alert("Clipboard history backed up to the text area.");
});

restoreBtn.addEventListener("click", () => {
  try {
    const data = JSON.parse(backupDataArea.value);
    if (!Array.isArray(data)) {
      alert("Invalid backup data format.");
      return;
    }
    clipboardHistory = data;
    browser.storage.local.set({ clipboardHistory }).then(() => {
      alert("Clipboard history restored.");
      renderHistory(getFilteredHistory());
    });
  } catch (e) {
    alert("Failed to parse JSON: " + e.message);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  updateToggleButtons();
});
