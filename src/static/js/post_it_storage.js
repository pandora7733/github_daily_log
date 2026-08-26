(() => {
    const postItList = document.getElementById("memo-list-postit");
    const contextMenu = document.getElementById("memo-context-menu");

    if (!postItList || !contextMenu) {
        return;
    }

    function isPostItCard(card) {
        return card && card.classList.contains("memo-card--post-it");
    }

    function createPostItCard(postit) {
        const card = createMemoCard("post-it");
        card.dataset.postitId = postit.id;

        const textarea = card.querySelector(".memo-input");
        if (textarea) {
            textarea.value = postit.content || "";
            resizeTextarea(textarea);
        }

        return card;
    }

    async function savePostIt(card) {
        const textarea = card.querySelector(".memo-input");
        if (!textarea || !textarea.value.trim()) {
            return false;
        }

        try {
            const response = await fetch("/api/postits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: textarea.value,
                }),
            });

            if (!response.ok) {
                throw new Error(`post-it 저장 실패: ${response.status}`);
            }

            const result = await response.json();
            if (result.postit?.id) {
                card.dataset.postitId = result.postit.id;
            }
            return true;
        } catch (error) {
            console.error(error);
            alert("post-it 저장에 실패했습니다.");
            return false;
        }
    }

    contextMenu.addEventListener("click", async (event) => {
        const actionButton = event.target.closest("[data-action]");
        const card = typeof activeMemoCard === "undefined"
            ? null
            : activeMemoCard;

        if (
            !actionButton ||
            !isPostItCard(card) ||
            actionButton.dataset.action !== "create"
        ) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const hasContent = Boolean(card.querySelector(".memo-input")?.value.trim());
        const isSavedPostIt = Boolean(card.dataset.postitId);
        closeContextMenu();

        if (hasContent && !isSavedPostIt && !(await savePostIt(card))) {
            return;
        }

        createMemo(card);
    }, true);

    fetch("/api/postits")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`post-it 조회 실패: ${response.status}`);
            }
            return response.json();
        })
        .then((postits) => {
            const renderedIds = new Set(
                Array.from(postItList.querySelectorAll("[data-postit-id]"))
                    .map((card) => card.dataset.postitId)
            );

            postits.forEach((postit) => {
                if (!renderedIds.has(postit.id)) {
                    postItList.appendChild(createPostItCard(postit));
                }
            });
        })
        .catch((error) => {
            console.error(error);
        });
})();
