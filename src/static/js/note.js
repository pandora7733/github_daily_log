(() => {
    const contentArea = document.getElementById("content");

    if (!contentArea) {
        return;
    }

    const saveTimers = new WeakMap();
    const saveRequests = new WeakMap();
    const commitsData = document.getElementById("commits-by-date-data");
    const commitsByDate = commitsData
        ? JSON.parse(commitsData.textContent)
        : {};
    let selectedCommitDate = null;

    function refreshNoteVisibility() {
        document.querySelectorAll(".memo-card--note").forEach((card) => {
            const isSavedNote = Boolean(card.dataset.retrospectiveId);
            const matchesSelectedDate =
                selectedCommitDate &&
                card.dataset.commitDate === selectedCommitDate;

            card.hidden = isSavedNote && !matchesSelectedDate;
        });
    }

    function isNoteCard(card) {
        return card && card.classList.contains("memo-card--note");
    }

    function renderCommitDate(card, date) {
        if (!date) {
            return;
        }

        card.dataset.commitDate = date;
    }

    function getCommitSnapshot(card) {
        const commitDate = card.dataset.commitDate;
        return (commitsByDate[commitDate] || []).map((commit) => ({
            ...commit,
            commitDate,
        }));
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

        card.appendChild(title);
        card.append(textarea, menuButton);
        card.dataset.retrospectiveId = note.id;
        renderCommitDate(card, note.commit_date);
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
        const payload = {
            title: "Note",
            content,
        };

        payload.commits_snapshot = getCommitSnapshot(card);

        card.dataset.saving = "true";
        const request = (async () => {
            try {
                const response = await fetch(url, {
                    method: isUpdate ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error(`노트 저장 실패: ${response.status}`);
                }

                const result = await response.json();
                if (!isUpdate && result.retrospective?.id) {
                    card.dataset.retrospectiveId = result.retrospective.id;
                    if (result.retrospective.commit_date) {
                        renderCommitDate(card, result.retrospective.commit_date);
                    }
                }
                refreshNoteVisibility();
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

    function editNote(card) {
        const textarea = card.querySelector(".memo-input");
        card.classList.add("is-editing");
        textarea?.focus();
    }

    document.querySelectorAll(".commit-day-btn").forEach((button) => {
        button.addEventListener("click", () => {
            selectedCommitDate = button.dataset.date || null;
            refreshNoteVisibility();
        });
    });
    refreshNoteVisibility();

    const contextMenu = document.getElementById("memo-context-menu");
    if (contextMenu) {
        contextMenu.addEventListener("click", async (event) => {
            const actionButton = event.target.closest("[data-action]");
            const card = typeof activeMemoCard === "undefined"
                ? null
                : activeMemoCard;

            if (!actionButton || !isNoteCard(card)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();

            const action = actionButton.dataset.action;
            if (action === "edit") {
                closeContextMenu();
                editNote(card);
                return;
            }

            if (action === "delete") {
                const retrospectiveId = card.dataset.retrospectiveId;
                closeContextMenu();

                if (!retrospectiveId) {
                    card.remove();
                    return;
                }

                try {
                    const response = await fetch(
                        `/api/retrospectives/${retrospectiveId}`,
                        { method: "DELETE" }
                    );
                    if (!response.ok) {
                        throw new Error(`노트 삭제 실패: ${response.status}`);
                    }
                    card.remove();
                } catch (error) {
                    console.error(error);
                    alert("노트 삭제에 실패했습니다.");
                }
                return;
            }

            if (action !== "create") {
                return;
            }

            const textarea = card.querySelector(".memo-input");
            const hasContent = Boolean(textarea?.value.trim());
            const isExistingNote = Boolean(card.dataset.retrospectiveId);
            const commitDate = card.dataset.commitDate || selectedCommitDate;

            if (hasContent && !isExistingNote && !commitDate) {
                alert("먼저 왼쪽에서 커밋 날짜를 선택해 주세요.");
                return;
            }

            if (hasContent && !isExistingNote) {
                renderCommitDate(card, commitDate);
            }
            refreshNoteVisibility();

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
    });

    contentArea.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") {
            return;
        }

        const textarea = event.target.closest(".memo-input");
        const card = textarea?.closest(".memo-card");

        if (!isNoteCard(card)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const hasContent = Boolean(textarea.value.trim());
        const isExistingNote = Boolean(card.dataset.retrospectiveId);
        const commitDate = card.dataset.commitDate || selectedCommitDate;

        if (hasContent && !isExistingNote && !commitDate) {
            alert("먼저 왼쪽에서 커밋 날짜를 선택해 주세요.");
            return;
        }

        if (hasContent && !isExistingNote) {
            renderCommitDate(card, commitDate);
        }

        saveNote(card).then((saved) => {
            if (saved) {
                card.classList.remove("is-editing");
            }
        });
    }, true);

    fetch("/api/retrospectives")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`노트 조회 실패: ${response.status}`);
            }
            return response.json();
        })
        .then((retrospectives) => {
            const renderedIds = new Set(
                Array.from(contentArea.querySelectorAll("[data-retrospective-id]"))
                    .map((card) => card.dataset.retrospectiveId)
            );

            retrospectives.forEach((retrospective) => {
                if (!renderedIds.has(retrospective.id)) {
                    contentArea.appendChild(createNoteCard(retrospective));
                }
            });
            refreshNoteVisibility();
        })
        .catch((error) => {
            console.error(error);
        });
})();
