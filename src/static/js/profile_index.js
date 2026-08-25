const img = document.getElementById("profile-img");
const playDice = document.getElementById("play-dice!");


function makeProfileImgURL(seed) {
    return `https://api.dicebear.com/10.x/identicon/svg?seed=${seed}`;
};

playDice.addEventListener("click", () => {
    const randomSeed = Math.random().toString(36).substring(2);
    console.log(randomSeed)
    img.src = makeProfileImgURL(randomSeed);
    localStorage.setItem("ProfileSeed", randomSeed)
});

window.addEventListener("load", () => {
    const randomSeed = localStorage.getItem("ProfileSeed")
    if (randomSeed) {
        img.src = makeProfileImgURL(randomSeed);
    }
});