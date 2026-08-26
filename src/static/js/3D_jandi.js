import * as THREE from "three";

import { OrbitControls }
    from "three/addons/controls/OrbitControls.js";
/*
|--------------------------------------------------------------------------
| GitHub Contribution Data
|--------------------------------------------------------------------------
*/

const calendarDataEl = document.getElementById("calendar-weeks-data");

if (!calendarDataEl) {
    throw new Error("calendar-weeks-data element not found");
}

const contributionWeeks = JSON.parse(calendarDataEl.textContent);


/*
|--------------------------------------------------------------------------
| Container
|--------------------------------------------------------------------------
*/

const container =
    document.getElementById("github-3d-grass");

if (!container) {
    throw new Error("github-3d-grass element not found");
}


/*
|--------------------------------------------------------------------------
| Scene
|--------------------------------------------------------------------------
*/

const scene = new THREE.Scene();

scene.background = new THREE.Color(0xf8fafc);


/*
|--------------------------------------------------------------------------
| Camera
|--------------------------------------------------------------------------
*/

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

camera.position.set(
    18,
    16,
    25
);


/*
|--------------------------------------------------------------------------
| Renderer
|--------------------------------------------------------------------------
*/

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    container.clientWidth,
    container.clientHeight
);

container.appendChild(renderer.domElement);


/*
|--------------------------------------------------------------------------
| Camera Controls
|--------------------------------------------------------------------------
*/

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.08;

controls.minDistance = 8;

controls.maxDistance = 70;

controls.maxPolarAngle = Math.PI / 2.05;


/*
|--------------------------------------------------------------------------
| Lights
|--------------------------------------------------------------------------
*/

const ambientLight =
    new THREE.AmbientLight(
        0xffffff,
        2
    );

scene.add(ambientLight);


const directionalLight =
    new THREE.DirectionalLight(
        0xffffff,
        2
    );

directionalLight.position.set(
    10,
    20,
    10
);

scene.add(directionalLight);


/*
|--------------------------------------------------------------------------
| Contribution Settings
|--------------------------------------------------------------------------
*/

const CELL_SIZE = 0.65;

const CELL_GAP = 0.15;

const HEIGHT_SCALE = 0.35;


/*
|--------------------------------------------------------------------------
| Grass Group
|--------------------------------------------------------------------------
*/

const grassGroup =
    new THREE.Group();

scene.add(grassGroup);


/*
|--------------------------------------------------------------------------
| Color
|--------------------------------------------------------------------------
*/

function getContributionColor(count) {

    if (count === 0) {
        return 0xebedf0;
    }

    if (count <= 2) {
        return 0x9be9a8;
    }

    if (count <= 5) {
        return 0x40c463;
    }

    if (count <= 9) {
        return 0x30a14e;
    }

    return 0x216e39;
}


/*
|--------------------------------------------------------------------------
| Create Contribution Block
|--------------------------------------------------------------------------
*/

function createContributionBlock(
    day,
    weekIndex,
    dayIndex
) {

    const count =
        day.contributionCount || 0;


    /*
    * 높이 계산
    */

    const height =
        count === 0
            ? 0.15
            : Math.max(
                0.2,
                count * HEIGHT_SCALE
            );


    /*
    * Geometry
    */

    const geometry =
        new THREE.BoxGeometry(
            CELL_SIZE,
            height,
            CELL_SIZE
        );


    /*
    * Material
    */

    const material =
        new THREE.MeshStandardMaterial({
            color: getContributionColor(count),
            roughness: 0.75,
            metalness: 0.05
        });


    /*
    * Mesh
    */

    const cube =
        new THREE.Mesh(
            geometry,
            material
        );


    /*
    |--------------------------------------------------------------------------
    | Position
    |--------------------------------------------------------------------------
    */

    const x =
        weekIndex *
        (CELL_SIZE + CELL_GAP);


    const z =
        dayIndex *
        (CELL_SIZE + CELL_GAP);


    cube.position.set(
        x,
        height / 2,
        z
    );


    /*
    |--------------------------------------------------------------------------
    | Store GitHub data
    |--------------------------------------------------------------------------
    */

    cube.userData = {

        date: day.date,

        count: count

    };


    grassGroup.add(cube);

}


/*
|--------------------------------------------------------------------------
| Create Entire Contribution Graph
|--------------------------------------------------------------------------
*/

contributionWeeks.forEach(
    (week, weekIndex) => {

        week.contributionDays.forEach(
            (day, dayIndex) => {

                createContributionBlock(
                    day,
                    weekIndex,
                    dayIndex
                );

            }
        );

    }
);


/*
|--------------------------------------------------------------------------
| Center Graph
|--------------------------------------------------------------------------
*/

const box =
    new THREE.Box3().setFromObject(
        grassGroup
    );


const center =
    box.getCenter(
        new THREE.Vector3()
    );


grassGroup.position.x =
    -center.x;

grassGroup.position.z =
    -center.z;


/*
|--------------------------------------------------------------------------
| Ground
|--------------------------------------------------------------------------
*/

const groundGeometry =
    new THREE.PlaneGeometry(
        50,
        20
    );


const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 1
    });


const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );


ground.rotation.x =
    -Math.PI / 2;


ground.position.y =
    -0.01;


scene.add(ground);


/*
|--------------------------------------------------------------------------
| Raycaster
|--------------------------------------------------------------------------
*/

const raycaster =
    new THREE.Raycaster();


const mouse =
    new THREE.Vector2();


/*
|--------------------------------------------------------------------------
| Tooltip
|--------------------------------------------------------------------------
*/

const tooltip =
    document.createElement("div");


tooltip.style.position =
    "absolute";

tooltip.style.padding =
    "6px 10px";

tooltip.style.background =
    "rgba(0, 0, 0, 0.8)";

tooltip.style.color =
    "white";

tooltip.style.fontSize =
    "12px";

tooltip.style.borderRadius =
    "6px";

tooltip.style.pointerEvents =
    "none";

tooltip.style.display =
    "none";

tooltip.style.zIndex =
    "100";


container.style.position =
    "relative";


container.appendChild(
    tooltip
);


/*
|--------------------------------------------------------------------------
| Mouse Move
|--------------------------------------------------------------------------
*/

renderer.domElement.addEventListener(
    "mousemove",
    (event) => {

        const rect =
            renderer.domElement.getBoundingClientRect();


        mouse.x =
            ((event.clientX - rect.left)
                / rect.width) * 2 - 1;


        mouse.y =
            -((event.clientY - rect.top)
                / rect.height) * 2 + 1;


        raycaster.setFromCamera(
            mouse,
            camera
        );


        const intersects =
            raycaster.intersectObjects(
                grassGroup.children
            );


        if (intersects.length > 0) {

            const object =
                intersects[0].object;


            const data =
                object.userData;


            tooltip.innerHTML =
                `${data.date}<br>${data.count} contributions`;


            tooltip.style.left =
                `${event.clientX - rect.left + 10}px`;


            tooltip.style.top =
                `${event.clientY - rect.top + 10}px`;


            tooltip.style.display =
                "block";


            renderer.domElement.style.cursor =
                "pointer";

        } else {

            tooltip.style.display =
                "none";


            renderer.domElement.style.cursor =
                "default";

        }

    }
);


/*
|--------------------------------------------------------------------------
| Click
|--------------------------------------------------------------------------
*/

renderer.domElement.addEventListener(
    "click",
    (event) => {

        const rect =
            renderer.domElement.getBoundingClientRect();


        mouse.x =
            ((event.clientX - rect.left)
                / rect.width) * 2 - 1;


        mouse.y =
            -((event.clientY - rect.top)
                / rect.height) * 2 + 1;


        raycaster.setFromCamera(
            mouse,
            camera
        );


        const intersects =
            raycaster.intersectObjects(
                grassGroup.children
            );


        if (intersects.length === 0) {
            return;
        }


        const object =
            intersects[0].object;


        const data =
            object.userData;


        console.log(
            "Selected contribution:",
            data
        );


        /*
        * 여기에서 나중에
        * 해당 날짜의 Commit API를 호출하면 된다.
        */

        // 예:
        //
        // location.href =
        //     `/github/commits?date=${data.date}`;

    }
);


/*
|--------------------------------------------------------------------------
| Resize
|--------------------------------------------------------------------------
*/

function resize() {

    const width =
        container.clientWidth;

    const height =
        container.clientHeight;


    camera.aspect =
        width / height;


    camera.updateProjectionMatrix();


    renderer.setSize(
        width,
        height
    );

}


window.addEventListener(
    "resize",
    resize
);

window.addEventListener(
    "contribution-3d-show",
    () => {
        requestAnimationFrame(resize);
    }
);


/*
|--------------------------------------------------------------------------
| Animation
|--------------------------------------------------------------------------
*/

function animate() {

    requestAnimationFrame(
        animate
    );


    controls.update();


    renderer.render(
        scene,
        camera
    );

}


animate();
