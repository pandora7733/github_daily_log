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

    async function updatePostIt(card) {
        const postitId = card.dataset.postitId;
        const textarea = card.querySelector(".memo-input");
        if (!postitId || !textarea || !textarea.value.trim()) {
            return false;
        }

        try {
            const response = await fetch(`/api/postits/${postitId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: textarea.value,
                }),
            });

            if (!response.ok) {
                throw new Error(`post-it 수정 실패: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error(error);
            alert("post-it 수정에 실패했습니다.");
            return false;
        }
    }

    async function deletePostIt(card) {
        const postitId = card.dataset.postitId;
        if (!postitId) {
            card.remove();
            return;
        }

        try {
            const response = await fetch(`/api/postits/${postitId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`post-it 삭제 실패: ${response.status}`);
            }
            card.remove();
        } catch (error) {
            console.error(error);
            alert("post-it 삭제에 실패했습니다.");
        }
    }

    function editPostIt(card) {
        const textarea = card.querySelector(".memo-input");
        card.classList.add("is-editing");
        textarea?.focus();
    }

    contextMenu.addEventListener("click", async (event) => {
        const actionButton = event.target.closest("[data-action]");
        const card = typeof activeMemoCard === "undefined"
            ? null
            : activeMemoCard;

        if (!actionButton || !isPostItCard(card)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        const action = actionButton.dataset.action;
        if (action === "edit") {
            closeContextMenu();
            editPostIt(card);
            return;
        }

        if (action === "delete") {
            closeContextMenu();
            await deletePostIt(card);
            return;
        }

        if (action !== "create") {
            return;
        }

        const hasContent = Boolean(card.querySelector(".memo-input")?.value.trim());
        const isSavedPostIt = Boolean(card.dataset.postitId);
        closeContextMenu();

        if (hasContent && !isSavedPostIt && !(await savePostIt(card))) {
            return;
        }

        createMemo(card);
    }, true);

    postItList.addEventListener("keydown", async (event) => {
        if (event.key !== "Escape") {
            return;
        }

        const textarea = event.target.closest(".memo-input");
        const card = textarea?.closest(".memo-card");
        if (!isPostItCard(card) || !card.dataset.postitId || !card.classList.contains("is-editing")) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (await updatePostIt(card)) {
            card.classList.remove("is-editing");
        }
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
