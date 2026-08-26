document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("toggle");
    const view2d = document.getElementById("contribution-2d");
    const view3d = document.getElementById("contribution-3d");

    if (!toggle || !view2d || !view3d) {
        return;
    }

    function setView(is3d) {
        view2d.classList.toggle("hidden", is3d);
        view3d.classList.toggle("hidden", !is3d);

        if (is3d) {
            window.dispatchEvent(new CustomEvent("contribution-3d-show"));
        }
    }

    toggle.addEventListener("change", () => {
        setView(toggle.checked);
    });

    setView(toggle.checked);
});
