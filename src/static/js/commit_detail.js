document.addEventListener("DOMContentLoaded", () => {
    const INITIAL_VISIBLE_COUNT = 3;

    const dataEl = document.getElementById("commits-by-date-data");
    const panel = document.getElementById("commit-detail");
    const title = document.getElementById("commit-detail-title");
    const list = document.getElementById("commit-detail-list");
    const moreButton = document.getElementById("commit-detail-more");
    const dayButtons = document.querySelectorAll(".commit-day-btn");

    if (!dataEl || !panel || !title || !list || !moreButton) {
        return;
    }

    const commitsByDate = JSON.parse(dataEl.textContent);
    let activeButton = null;
    let currentCommits = [];
    let expanded = false;

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatDateTime(dateStr) {
        const date = new Date(dateStr);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function setActiveButton(button) {
        if (activeButton) {
            activeButton.classList.remove("bg-gray-200");
            activeButton.setAttribute("aria-pressed", "false");
        }

        activeButton = button;

        if (activeButton) {
            activeButton.classList.add("bg-gray-200");
            activeButton.setAttribute("aria-pressed", "true");
        }
    }

    function renderCommitItem(commit, index, commits) {
        const sha = (commit.sha || "").slice(0, 7);
        const author = commit.author || "Unknown";
        const commitUrl = commit.url || "#";
        const repoUrl = commit.repo_url || commitUrl;
        const formattedDate = formatDateTime(commit.date);
        const isHidden = index >= INITIAL_VISIBLE_COUNT && !expanded;
        const lastVisibleIndex = expanded
            ? commits.length - 1
            : Math.min(commits.length, INITIAL_VISIBLE_COUNT) - 1;
        const isLastVisible = index === lastVisibleIndex;

        return `
            <li class="commit-timeline__item${isHidden ? " commit-timeline__item--hidden" : ""}${isLastVisible ? " is-last-visible" : ""}">
                <span class="commit-timeline__marker" aria-hidden="true"></span>
                <p class="commit-timeline__meta">
                    <span class="commit-timeline__author">${escapeHtml(author)}</span>
                    committed to
                    <a
                        href="${escapeHtml(repoUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="commit-timeline__repo"
                    >
                        ${escapeHtml(commit.repo_name)}
                    </a>
                    <span class="commit-timeline__time">
                        ${formattedDate ? `· ${escapeHtml(formattedDate)}` : ""}
                    </span>
                </p>
                <p class="commit-timeline__message">
                    <a
                        href="${escapeHtml(commitUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="commit-timeline__message-link"
                    >
                        ${escapeHtml(commit.title)}
                    </a>
                    <code class="commit-timeline__sha">${escapeHtml(sha)}</code>
                </p>
            </li>
        `;
    }

    function updateMoreButton() {
        const hiddenCount = currentCommits.length - INITIAL_VISIBLE_COUNT;

        if (hiddenCount <= 0) {
            moreButton.classList.add("hidden");
            moreButton.setAttribute("aria-expanded", "false");
            return;
        }

        moreButton.classList.remove("hidden");
        moreButton.setAttribute("aria-expanded", String(expanded));
        moreButton.textContent = expanded
            ? "접기"
            : `더보기 (${hiddenCount}개)`;
    }

    function renderCommitList() {
        if (currentCommits.length === 0) {
            list.innerHTML = `
                <li class="commit-timeline__empty">
                    이 날짜에 커밋이 없습니다.
                </li>
            `;
            moreButton.classList.add("hidden");
            return;
        }

        list.innerHTML = currentCommits
            .map((commit, index) => renderCommitItem(commit, index, currentCommits))
            .join("");

        updateMoreButton();
    }

    function renderCommits(date, displayDate) {
        currentCommits = commitsByDate[date] || [];
        expanded = false;

        title.textContent = `Commits on ${displayDate}`;
        renderCommitList();

        panel.classList.remove("hidden");
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    moreButton.addEventListener("click", () => {
        expanded = !expanded;
        renderCommitList();
    });

    dayButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const date = button.dataset.date;
            const displayDate = button.dataset.dateDisplay || date;

            setActiveButton(button);
            renderCommits(date, displayDate);
        });
    });
});
