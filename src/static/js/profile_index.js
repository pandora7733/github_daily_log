// ########## //
// GitHub API //
// ########## //

let user_data  = null;

async function getGitHub(username) {
    const user_res = await fetch(`/api/user/${username}`);
    user_data = await user_res.json();

    user_login();
    user_name();
    user_bio();
    user_id();
}

function user_login() { return user_data.login; };
function user_name() { return user_data.name; };
function user_bio() { return user_data.bio; };
function user_id() { return user_data.id; };

// ######## //
// 프로필 사진 //
// ######## //

const img = document.getElementById("profile-img");
const playDice = document.getElementById("play-dice!");
const githubIMG = document.getElementById("profile-github");

// 이미지 생성 //

function makeProfileImgURL(seed) {
    return `https://api.dicebear.com/10.x/identicon/svg?seed=${seed}`;
};

playDice.addEventListener("click", () => {
    const randomSeed = Math.random().toString(36).substring(2);
    img.src = makeProfileImgURL(randomSeed);
    localStorage.setItem("ProfileSeed", randomSeed)
});

window.addEventListener("load", () => {
    const randomSeed = localStorage.getItem("ProfileSeed")
    if (randomSeed) {
        img.src = makeProfileImgURL(randomSeed);
    }
});

// 깃허브 프로필 사진 //

function githubProfileImgURL(userID) {
    return `https://avatars.githubusercontent.com/u/${userID}`
};

githubIMG.addEventListener("click", () => {
    if (!user_data) return;
    const userID = user_id()
    console.log(userID)
    img.src = githubProfileImgURL(userID);
});

// ############### //
// 리포지토리 카드 추가 //
// ############### //

// 리포지토리 info 더미 데이터 (나중에 실제값을 딕셔너리로 파싱해서 사용)
const repos_info = [
    { name: "Name/repo01", lang: "Python", visi: "Public" },
    { name: "Name/repo02", lang: "C", visi: "Public" },
    { name: "Name/repo03", lang: "C++", visi: "Public" },
    { name: "Name/repo04", lang: "Java, C#", visi: "Public" },
    { name: "Name/repo05", lang: "엄준식", visi: "Public" },
    { name: "Name/repo06", lang: "brain fuck", visi: "Public" },
];

function makeRepoCard(repos) {
    return `
        <div class="repo-box border border-gray-500 rounded-lg p-4 h-30">
            <div class="repo-item flex">
            <span class="repo-names font-medium text-blue-800">
                <a href="#"><span id="repo-name">${repos.name}</span></a>
            </span>
            <span class="repo-labels flex-auto text-right text-gray-500 text-[12px]">
                <span id="repo-label">${repos.visi}</span>
            </span>
            </div>
            <div class="p-4.5"></div>
            <span class="repo-lang text-[12px]">
                ${repos.lang}
            </span>
        </div>

    `;
};

function drawRepoCard(RepoCard) {
    const repoList = document.getElementById("repo-list");
    repoList.innerHTML += RepoCard;
};

for (const repo of repos_info) {
    drawRepoCard(makeRepoCard(repo))
};