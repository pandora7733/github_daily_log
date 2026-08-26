(() => {
    const contentArea = document.getElementById("content");

    if (!contentArea) {
        return;
    }

    const saveTimers = new WeakMap();
    const saveRequests = new WeakMap();

    function isNoteCard(card) {
        return card && card.classList.contains("memo-card--note");
    }

    function createNoteCard(note) {
        const card = document.createElement("div");
        card.className =
            "memo-card memo-card--note relative w-340 min-h-65 bg-gray-100 p-4 " +
            "shadow-[4px_6px_12px_rgba(0,0,0,0.15)] overflow-hidden mb-8";

        const title = document.createElement("span");
        title.className = "memo-title text-xl block font-bold text-gray-800 mb-3";
        title.textContent = note.title || "Note";

        const textarea = document.createElement("textarea");
        textarea.className =
            "memo-input w-full bg-transparent outline-none resize-none " +
            "overflow-hidden text-gray-700 placeholder-gray-500";
        textarea.name = "memo";
        textarea.rows = 1;
        textarea.placeholder = "메모를 입력하세요";
        textarea.value = note.content || "";

        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className =
            "memo-menu-btn absolute bottom-0 right-0 w-10 h-10 bg-gray-300 " +
            "hover:bg-gray-400 transition-colors " +
            "[clip-path:polygon(100%_0,0_100%,100%_100%)] cursor-pointer";
        menuButton.setAttribute("aria-label", "메모 메뉴");
        menuButton.setAttribute("aria-haspopup", "menu");

        card.append(title, textarea, menuButton);
        card.dataset.retrospectiveId = note.id;
        resizeTextarea(textarea);

        if (typeof bindMemoCard === "function") {
            bindMemoCard(card);
        }

        return card;
    }

    function resizeTextarea(textarea) {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }

    async function saveNote(card) {
        const textarea = card.querySelector(".memo-input");
        if (!textarea || !textarea.value.trim()) {
            return false;
        }

        const content = textarea.value;
        const previousRequest = saveRequests.get(card);

        if (previousRequest) {
            const saved = await previousRequest.promise;
            if (textarea.value !== previousRequest.content) {
                return saveNote(card);
            }
            return saved;
        }

        const retrospectiveId = card.dataset.retrospectiveId;
        const isUpdate = Boolean(retrospectiveId);
        const url = isUpdate
            ? `/api/retrospectives/${retrospectiveId}`
            : "/api/retrospectives";

        card.dataset.saving = "true";
        const request = (async () => {
            try {
                const response = await fetch(url, {
                    method: isUpdate ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: "Note",
                        content,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`노트 저장 실패: ${response.status}`);
                }

                const result = await response.json();
                if (!isUpdate && result.retrospective?.id) {
                    card.dataset.retrospectiveId = result.retrospective.id;
                }
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        })();
        saveRequests.set(card, { promise: request, content });

        try {
            return await request;
        } finally {
            delete card.dataset.saving;
            if (saveRequests.get(card)?.promise === request) {
                saveRequests.delete(card);
            }

            if (textarea.value !== content) {
                scheduleSave(card);
            }
        }
    }

    function scheduleSave(card, delay = 700) {
        const previousTimer = saveTimers.get(card);
        if (previousTimer) {
            clearTimeout(previousTimer);
        }

        const timer = setTimeout(() => {
            saveTimers.delete(card);
            saveNote(card);
        }, delay);
        saveTimers.set(card, timer);
    }

    const contextMenu = document.getElementById("memo-context-menu");
    if (contextMenu) {
        contextMenu.addEventListener("click", async (event) => {
            const actionButton = event.target.closest("[data-action]");
            const card = typeof activeMemoCard === "undefined"
                ? null
                : activeMemoCard;

            if (!actionButton || !isNoteCard(card) || actionButton.dataset.action !== "create") {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            const textarea = card.querySelector(".memo-input");
            const hasContent = Boolean(textarea?.value.trim());
            const pendingTimer = saveTimers.get(card);
            if (pendingTimer) {
                clearTimeout(pendingTimer);
                saveTimers.delete(card);
            }

            closeContextMenu();

            const saved = await saveNote(card);
            if (hasContent && !saved) {
                return;
            }

            createMemo(card);
        }, true);
    }

    contentArea.addEventListener("input", (event) => {
        const textarea = event.target.closest(".memo-input");
        const card = textarea?.closest(".memo-card");

        if (!isNoteCard(card)) {
            return;
        }

        resizeTextarea(textarea);
        scheduleSave(card);
    });

    contentArea.addEventListener("blur", (event) => {
        const textarea = event.target.closest(".memo-input");
        const card = textarea?.closest(".memo-card");

        if (isNoteCard(card) && textarea.value.trim()) {
            scheduleSave(card, 0);
        }
    }, true);

    fetch("/api/retrospectives")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`노트 조회 실패: ${response.status}`);
            }
            return response.json();
        })
        .then((retrospectives) => {
            retrospectives.forEach((retrospective) => {
                contentArea.appendChild(createNoteCard(retrospective));
            });
        })
        .catch((error) => {
            console.error(error);
        });
})();
