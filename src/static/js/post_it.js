const contextMenu = document.getElementById("memo-context-menu");
const noteList = document.getElementById("memo-list-note");
const postItList = document.getElementById("memo-list-postit");

let activeMemoCard = null;

const MEMO_CARD_CLASSES = {
    note: "memo-card memo-card--note relative w-340 min-h-65 bg-gray-100 p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden mb-8",
    "post-it": "memo-card memo-card--post-it relative w-92 min-h-60 bg-yellow-200 p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden mb-8",
};

const MENU_BUTTON_CLASSES = {
    note: "memo-menu-btn absolute bottom-0 right-0 w-10 h-10 bg-gray-300 hover:bg-gray-400 transition-colors [clip-path:polygon(100%_0,0_100%,100%_100%)] cursor-pointer",
    "post-it": "memo-menu-btn absolute bottom-0 right-0 w-10 h-10 bg-yellow-300 hover:bg-yellow-400 transition-colors [clip-path:polygon(100%_0,0_100%,100%_100%)] cursor-pointer",
};

function getMemoVariant(card) {
    return card.classList.contains("memo-card--note") ? "note" : "post-it";
}

function getMemoContainer(variant) {
    return variant === "note" ? noteList : postItList;
}

function getCardValues(card) {
    const titleEl = card.querySelector(".memo-title");
    const textarea = card.querySelector(".memo-input");

    return {
        title: titleEl ? titleEl.textContent.trim() || "Note" : "Note",
        content: textarea ? textarea.value : "",
    };
}

function resizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function setReadonly(card, readonly) {
    const title = card.querySelector(".memo-title");
    const textarea = card.querySelector(".memo-input");

    if (title) {
        title.contentEditable = readonly ? "false" : "true";
    }

    if (textarea) {
        if (readonly) {
            textarea.setAttribute("readonly", "readonly");
        } else {
            textarea.removeAttribute("readonly");
        }
    }
}

function bindTextarea(textarea) {
    textarea.addEventListener("input", () => {
        resizeTextarea(textarea);
    });
    resizeTextarea(textarea);
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "요청에 실패했습니다.");
    }

    return data;
}

function buildMemoCard(variant, data = {}, draft = false) {
    const card = document.createElement("div");
    card.className = MEMO_CARD_CLASSES[variant];

    if (draft) {
        card.dataset.draft = "true";
    } else if (data.id) {
        card.dataset.id = data.id;
    }

    const titleText = variant === "note" ? (data.title || "Note") : "memo";
    const titleClass = variant === "note"
        ? "memo-title text-xl block font-bold text-gray-800 mb-3"
        : "memo-title block font-semibold text-gray-700 mb-3";

    card.innerHTML = `
        <span class="${titleClass}"></span>
        <textarea
          class="memo-input w-full bg-transparent outline-none resize-none overflow-hidden text-gray-700 placeholder-gray-500"
          name="memo"
          rows="1"
          placeholder="메모를 입력하세요"
          readonly
        ></textarea>
        <button
          type="button"
          class="${MENU_BUTTON_CLASSES[variant]}"
          aria-label="메모 메뉴"
          aria-haspopup="menu"
        ></button>
    `;

    card.querySelector(".memo-title").textContent = titleText;
    const textarea = card.querySelector(".memo-input");
    textarea.value = data.content || "";

    bindMemoCard(card);
    return card;
}

function bindMemoCard(card) {
    const textarea = card.querySelector(".memo-input");
    const menuButton = card.querySelector(".memo-menu-btn");

    if (textarea) {
        bindTextarea(textarea);
    }

    if (menuButton) {
        menuButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openContextMenu(card, menuButton);
        });
    }
}

function ensureDraftCard(container, variant) {
    const hasCard = container.querySelector(".memo-card");
    if (!hasCard) {
        container.appendChild(buildMemoCard(variant, {}, true));
    }
}

async function saveMemo(card) {
    const variant = getMemoVariant(card);
    const { title, content } = getCardValues(card);
    const memoId = card.dataset.id;

    if (variant === "note") {
        if (memoId) {
            await requestJson(`/api/notes/${memoId}`, {
                method: "PUT",
                body: JSON.stringify({ title, content }),
            });
            return;
        }

        const created = await requestJson("/api/notes", {
            method: "POST",
            body: JSON.stringify({ title, content }),
        });

        card.dataset.id = created.id;
        delete card.dataset.draft;
        return;
    }

    if (memoId) {
        await requestJson(`/api/postits/${memoId}`, {
            method: "PUT",
            body: JSON.stringify({ content }),
        });
        return;
    }

    const created = await requestJson("/api/postits", {
        method: "POST",
        body: JSON.stringify({ content }),
    });

    card.dataset.id = created.id;
    delete card.dataset.draft;
}

function finishEditing(card) {
    card.classList.remove("is-editing");
    setReadonly(card, true);
}

async function editMemo(card) {
    const title = card.querySelector(".memo-title");
    const textarea = card.querySelector(".memo-input");

    card.classList.add("is-editing");
    setReadonly(card, false);

    const handleSave = async () => {
        title?.removeEventListener("blur", handleSave);
        textarea?.removeEventListener("blur", handleSave);

        try {
            await saveMemo(card);
        } catch (error) {
            alert(error.message);
            return;
        }

        finishEditing(card);
    };

    if (title && getMemoVariant(card) === "note") {
        title.focus();
        title.addEventListener("blur", handleSave);
    } else if (textarea) {
        textarea.focus();
    }

    textarea?.addEventListener("blur", handleSave);
}

async function deleteMemo(card) {
    const variant = getMemoVariant(card);
    const container = getMemoContainer(variant);
    const memoId = card.dataset.id;

    if (memoId) {
        try {
            const endpoint = variant === "note"
                ? `/api/notes/${memoId}`
                : `/api/postits/${memoId}`;

            await requestJson(endpoint, { method: "DELETE" });
        } catch (error) {
            alert(error.message);
            return;
        }
    }

    card.remove();
    ensureDraftCard(container, variant);
}

async function createMemo(sourceCard) {
    const variant = getMemoVariant(sourceCard);
    const container = getMemoContainer(variant);

    try {
        const endpoint = variant === "note" ? "/api/notes" : "/api/postits";
        const payload = variant === "note"
            ? { title: "Note", content: "" }
            : { content: "" };

        const created = await requestJson(endpoint, {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const newCard = buildMemoCard(variant, created);
        container.appendChild(newCard);

        const textarea = newCard.querySelector(".memo-input");
        if (textarea) {
            await editMemo(newCard);
        }
    } catch (error) {
        alert(error.message);
    }
}

function openContextMenu(card, button) {
    activeMemoCard = card;

    contextMenu.classList.remove("hidden");
    contextMenu.setAttribute("aria-hidden", "false");

    const rect = button.getBoundingClientRect();
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;

    let left = rect.right - menuWidth;
    let top = rect.top - menuHeight - 6;

    if (left < 8) {
        left = 8;
    }

    if (top < 8) {
        top = rect.bottom + 6;
    }

    contextMenu.style.left = `${left}px`;
    contextMenu.style.top = `${top}px`;
}

function closeContextMenu() {
    contextMenu.classList.add("hidden");
    contextMenu.setAttribute("aria-hidden", "true");
    activeMemoCard = null;
}

document.querySelectorAll(".memo-card").forEach(bindMemoCard);

contextMenu.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || !activeMemoCard) {
        return;
    }

    const action = actionButton.dataset.action;
    const card = activeMemoCard;

    closeContextMenu();

    if (action === "edit") {
        await editMemo(card);
        return;
    }

    if (action === "delete") {
        await deleteMemo(card);
        return;
    }

    if (action === "create") {
        await createMemo(card);
    }
});

document.addEventListener("click", (event) => {
    if (
        contextMenu.classList.contains("hidden") ||
        contextMenu.contains(event.target) ||
        event.target.closest(".memo-menu-btn")
    ) {
        return;
    }

    closeContextMenu();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeContextMenu();
    }
});
