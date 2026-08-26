const contextMenu = document.getElementById("memo-context-menu");
const postItList = document.getElementById("memo-list-postit");
const contentArea = document.getElementById("content");

let activeMemoCard = null;

const MEMO_TEMPLATES = {
    note: `
        <span class="memo-title text-xl block font-bold text-gray-800 mb-3">Note</span>
        <textarea
          class="memo-input w-full bg-transparent outline-none resize-none overflow-hidden text-gray-700 placeholder-gray-500"
          name="memo"
          rows="1"
          placeholder="메모를 입력하세요"
        ></textarea>
        <button
          type="button"
          class="memo-menu-btn absolute bottom-0 right-0 w-10 h-10 bg-gray-300 hover:bg-gray-400 transition-colors [clip-path:polygon(100%_0,0_100%,100%_100%)] cursor-pointer"
          aria-label="메모 메뉴"
          aria-haspopup="menu"
        ></button>
    `,
    "post-it": `
        <span class="memo-title block font-semibold text-gray-700 mb-3">memo</span>
        <textarea
          class="memo-input w-full bg-transparent outline-none resize-none overflow-hidden text-gray-700 placeholder-gray-500"
          name="memo"
          rows="1"
          placeholder="메모를 입력하세요"
        ></textarea>
        <button
          type="button"
          class="memo-menu-btn absolute bottom-0 right-0 w-10 h-10 bg-yellow-300 hover:bg-yellow-400 transition-colors [clip-path:polygon(100%_0,0_100%,100%_100%)] cursor-pointer"
          aria-label="메모 메뉴"
          aria-haspopup="menu"
        ></button>
    `,
};

const MEMO_CARD_CLASSES = {
    note: "memo-card memo-card--note relative w-340 min-h-65 bg-gray-100 p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden mb-8",
    "post-it": "memo-card memo-card--post-it relative w-92 min-h-60 bg-yellow-200 p-4 shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden mb-8",
};

function resizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function bindTextarea(textarea) {
    textarea.addEventListener("input", () => {
        resizeTextarea(textarea);
    });
    resizeTextarea(textarea);
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

function getMemoVariant(card) {
    return card.classList.contains("memo-card--note") ? "note" : "post-it";
}

function getMemoContainer(variant) {
    return variant === "note" ? contentArea : postItList;
}

function createMemoCard(variant) {
    const card = document.createElement("div");
    card.className = MEMO_CARD_CLASSES[variant];
    card.innerHTML = MEMO_TEMPLATES[variant];
    bindMemoCard(card);
    return card;
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

function editMemo(card) {
    const textarea = card.querySelector(".memo-input");
    const title = card.querySelector(".memo-title");

    card.classList.add("is-editing");

    if (title) {
        title.contentEditable = "true";
        title.focus();
    } else if (textarea) {
        textarea.focus();
    }
}

function deleteMemo(card) {
    card.remove();
}

function createMemo(sourceCard) {
    const variant = getMemoVariant(sourceCard);
    const container = getMemoContainer(variant);
    const newCard = createMemoCard(variant);

    container.appendChild(newCard);

    const textarea = newCard.querySelector(".memo-input");
    if (textarea) {
        textarea.focus();
    }
}

document.querySelectorAll(".memo-card").forEach(bindMemoCard);

contextMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || !activeMemoCard) {
        return;
    }

    const action = actionButton.dataset.action;
    const card = activeMemoCard;

    closeContextMenu();

    if (action === "edit") {
        editMemo(card);
        return;
    }

    if (action === "delete") { 
        deleteMemo(card);
        return;
    }

    if (action === "create") {
        createMemo(card);
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
