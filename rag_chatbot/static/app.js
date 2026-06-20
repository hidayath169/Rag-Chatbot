// ── State ─────────────────────────────────────────────────────────────────────
let chatHistory = [];

// ── DOM Elements ─────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const chatMessages = $("#chatMessages");
const chatInput = $("#chatInput");
const sendBtn = $("#sendBtn");
const fileInput = $("#fileInput");
const uploadZone = $("#uploadZone");
const uploadProgress = $("#uploadProgress");
const progressFill = $("#progressFill");
const progressText = $("#progressText");
const documentList = $("#documentList");
const emptyState = $("#emptyState");
const docCount = $("#docCount");
const statDocs = $("#statDocs");
const statChunks = $("#statChunks");
const settingsModal = $("#settingsModal");
const apiKeyInput = $("#apiKeyInput");
const toastContainer = $("#toastContainer");

// ── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Markdown Rendering (lightweight) ─────────────────────────────────────────
function renderMarkdown(text) {
    let html = text
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        // Code blocks
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        // Unordered lists
        .replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>')
        // Numbered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*?<\/li><br>?)+)/g, (match) => {
        return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
    });
    return `<p>${html}</p>`;
}

// ── Chat Functions ───────────────────────────────────────────────────────────
function addMessage(content, role) {
    const div = document.createElement("div");
    div.className = `message ${role === "user" ? "user-message" : "bot-message"}`;

    const avatarSVG = role === "user"
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>';

    const bubbleContent = role === "user" ? escapeHtml(content) : renderMarkdown(content);

    div.innerHTML = `
        <div class="message-avatar">${avatarSVG}</div>
        <div class="message-content">
            <div class="message-bubble">${bubbleContent}</div>
        </div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
}

function showTyping() {
    const div = document.createElement("div");
    div.className = "message bot-message";
    div.id = "typingMsg";
    div.innerHTML = `
        <div class="message-avatar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
            </svg>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator"><span></span><span></span><span></span></div>
            </div>
        </div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById("typingMsg");
    if (el) el.remove();
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    chatInput.style.height = "auto";
    sendBtn.disabled = true;

    addMessage(text, "user");
    chatHistory.push({ role: "user", content: text });
    showTyping();

    try {
        const res = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, history: chatHistory.slice(-10) }),
        });
        const data = await res.json();
        hideTyping();

        if (data.error) {
            addMessage("⚠️ " + data.error, "bot");
        } else {
            addMessage(data.response, "bot");
            chatHistory.push({ role: "assistant", content: data.response });
        }
    } catch (err) {
        hideTyping();
        addMessage("❌ Connection error. Is the server running?", "bot");
    }
    sendBtn.disabled = false;
    chatInput.focus();
}

function sendSuggestion(btn) {
    chatInput.value = btn.textContent;
    sendMessage();
}
// Make it global for inline onclick
window.sendSuggestion = sendSuggestion;

// ── File Upload ──────────────────────────────────────────────────────────────
async function uploadFiles(files) {
    if (!files.length) return;

    const formData = new FormData();
    for (const f of files) formData.append("files", f);

    uploadProgress.style.display = "block";
    uploadZone.style.display = "none";
    progressFill.style.width = "30%";
    progressText.textContent = `Processing ${files.length} file(s)...`;

    try {
        progressFill.style.width = "60%";
        const res = await fetch("/upload", { method: "POST", body: formData });
        const data = await res.json();
        progressFill.style.width = "100%";

        if (data.error) {
            showToast(data.error, "error");
        } else {
            const msg = `✅ ${data.added} resume(s) indexed successfully`;
            showToast(msg, "success");
            if (data.errors && data.errors.length) {
                data.errors.forEach(e => showToast(e, "error"));
            }
            loadDocuments();
        }
    } catch (err) {
        showToast("Upload failed: " + err.message, "error");
    }

    setTimeout(() => {
        uploadProgress.style.display = "none";
        uploadZone.style.display = "";
        progressFill.style.width = "0%";
    }, 800);
}

// ── Document List ────────────────────────────────────────────────────────────
async function loadDocuments() {
    try {
        const res = await fetch("/documents");
        const data = await res.json();

        // Update stats
        statDocs.textContent = data.stats.total_documents;
        statChunks.textContent = data.stats.total_chunks;
        docCount.textContent = data.stats.total_documents;

        // Build list
        documentList.innerHTML = "";
        if (!data.documents.length) {
            documentList.innerHTML = `<div class="empty-state">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <polyline points="13 2 13 9 20 9"/>
                </svg>
                <p>No resumes uploaded yet</p></div>`;
            return;
        }

        data.documents.forEach(doc => {
            const ext = doc.filename.split(".").pop().toLowerCase();
            const iconClass = ext === "pdf" ? "pdf" : ext === "txt" ? "txt" : "docx";
            const date = new Date(doc.uploaded_at).toLocaleDateString();

            const item = document.createElement("div");
            item.className = "doc-item";
            item.innerHTML = `
                <div class="doc-icon ${iconClass}">${ext.toUpperCase()}</div>
                <div class="doc-info">
                    <div class="doc-name" title="${doc.filename}">${doc.filename}</div>
                    <div class="doc-meta">${doc.chunks} chunks · ${date}</div>
                </div>
                <button class="btn-delete" title="Delete" onclick="deleteDoc('${doc.filename}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-2 14H7L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>`;
            documentList.appendChild(item);
        });
    } catch (err) {
        console.error("Failed to load documents:", err);
    }
}

async function deleteDoc(filename) {
    if (!confirm(`Delete "${filename}" from the index?`)) return;
    try {
        const res = await fetch(`/documents/${encodeURIComponent(filename)}`, { method: "DELETE" });
        const data = await res.json();
        if (data.error) showToast(data.error, "error");
        else {
            showToast(`Deleted ${filename}`, "success");
            loadDocuments();
        }
    } catch (err) {
        showToast("Delete failed", "error");
    }
}
window.deleteDoc = deleteDoc;

// ── Event Listeners ──────────────────────────────────────────────────────────
// Send message
sendBtn.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
// Auto-resize textarea
chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
});

// File upload - browse
$("#browseBtn").addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
uploadZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => { if (fileInput.files.length) uploadFiles(fileInput.files); fileInput.value = ""; });

// Drag & drop
uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});

// Settings modal
$("#settingsBtn").addEventListener("click", () => settingsModal.classList.add("active"));
$("#closeSettings").addEventListener("click", () => settingsModal.classList.remove("active"));
settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) settingsModal.classList.remove("active"); });

$("#saveSettingsBtn").addEventListener("click", async () => {
    const key = apiKeyInput.value.trim();
    if (!key) { showToast("Please enter an API key", "error"); return; }
    try {
        const res = await fetch("/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: key }),
        });
        const data = await res.json();
        if (data.error) showToast(data.error, "error");
        else { showToast("API key saved!", "success"); settingsModal.classList.remove("active"); }
    } catch (err) { showToast("Failed to save settings", "error"); }
});

// Toggle key visibility
$("#toggleKeyVis").addEventListener("click", () => {
    apiKeyInput.type = apiKeyInput.type === "password" ? "text" : "password";
});

// Mobile sidebar toggle
$("#sidebarToggle").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
});

// ── Init ─────────────────────────────────────────────────────────────────────
loadDocuments();
