const img = document.getElementById("profile-img");
const githubLink = document.getElementById("github-link");
const githubName = document.getElementById("github-name");
const githubBio = document.getElementById("github-bio");

const githubActiveDate = document.getElementById("active-date")
const githubJoinDate = document.getElementById("join-date")

async function getGitHubUser() {
    const res = await fetch(`/api/user`);
    const data = await res.json();

    const login = data.login
    const name  = data.name
    const bio   = data.bio
    const id    = data.id
    const joinD = new Date(data.created_at)
    const actiD = new Date(data.updated_at)

    if (name === null) {
        githubName.value = login
    } else {
        githubName.value = name
    }

    githubJoinDate.textContent = joinD.toLocaleDateString("ko-KR");

    githubActiveDate.textContent = actiD.toLocaleDateString("ko-KR");

    githubBio.value = bio

    const savedUrl = localStorage.getItem("ProfileUrl")
    if (savedUrl) {
        const url = `https://avatars.githubusercontent.com/u/${id}`
        img.src = url
        localStorage.setItem("ProfileUrl", url)
    }

    githubLink.addEventListener("click", () => {
        window.open(`https://github.com/${login}`, "_blank")
    });
}
getGitHubUser()

async function getGitHubRepos() {
    const res = await fetch(`/api/repos`);
    const data = await res.json();

    function makeRepoCard(repos) {
        return `
            <div class="repo-box border border-gray-500 rounded-lg p-4 h-30">
                <div class="repo-item flex">
                <span class="repo-names font-medium text-blue-800">
                    <a href="${repos.url}"><span id="repo-name">${repos.full_name}</span></a>
                </span>
                <span class="repo-labels flex-auto text-right text-gray-500 text-[12px]">
                    <span id="repo-label">${repos.private ? "Private" : "Public"}</span>
                </span>
                </div>
                <div class="p-4.5"></div>
                <span class="repo-lang text-[12px]">
                    ${repos.language}
                </span>
            </div>

        `;
    };

    function drawRepoCard(RepoCard) {
        const repoList = document.getElementById("repo-list");
        repoList.innerHTML += RepoCard;
    };

    for (const repo of data) {
        drawRepoCard(makeRepoCard(repo))
    };
}
getGitHubRepos()