import { readModel } from './vendor.js';
import { createDesk, createWall, createPenBox, buildModel } from './roomObj.js';
//必要全域變數
var scene, camera, renderer;
//視窗大小
var width = window.innerWidth;// * 0.9;
var height = window.innerHeight;// * 0.9;
var aLight, RoomLight, spotLight, pLight;
var aLightIntensity = 1, RoomLightIntensity = 0.2, pLightIntensity = 1.2;
//己查load狀態
var finish = false;
var objNameList = [];

//檯燈開關
var lampToggle;
//兩個室內燈開關物件
var ceilLampToggles = [];
var lightevent;

//滑鼠互動變數
var raycaster;
var mouse = new THREE.Vector2();
var pickables = [];
//室內燈開關
class CeilLampToggle {
    static globalPower = true;
    static count = 0;
    static RoomLightevent = [];
    constructor() {
        this.mesh = new THREE.Object3D();
        //讀取開關
        readModel("switch", 'switch', 8, this.mesh);
        objNameList.push('switch');
        readModel("toggleBtn", 'toggleBtn' + CeilLampToggle.count, 2.2, this.mesh);
        objNameList.push('toggleBtn' + CeilLampToggle.count++);
    }
    toggleChangePosition() {
        let btn = this.mesh.getObjectByName('switchBtn');
        if (btn.position.y == 0)
            btn.position.y = -2;
        else
            btn.position.y = 0;
    }
    //先傳入一個toggles陣列把所有toggle都改變顏色，然後找到傳入的要改變的燈光
    static lightControl(toggles, ...settings) {
        if (CeilLampToggle.globalPower) {
            //切到關燈
            toggles.forEach(function (toggle) {
                let btn = toggle.mesh.getObjectByName('switchBtn');
                btn.material.emissive = new THREE.Color('orange');
                btn.material.emissiveIntensity = 1;
            })
            CeilLampToggle.RoomLightevent.forEach(function (event) {
                clearInterval(event);
            });
            CeilLampToggle.RoomLightevent = [];
            settings.forEach(function (setting, index) {
                CeilLampToggle.RoomLightevent[index] =
                    setInterval(function () {
                        if (setting.light.intensity >= 0) {
                            setting.light.intensity -= 0.02;
                        } else {
                            clearInterval(CeilLampToggle.RoomLightevent[index]);
                        }
                    }, 20);
            });
        } else {
            //切到開燈
            toggles.forEach(function (toggle) {
                let btn = toggle.mesh.getObjectByName('switchBtn');
                btn.material.emissive = new THREE.Color(0, 0, 0);
                btn.material.emissiveIntensity = 0;
            })
            CeilLampToggle.RoomLightevent.forEach(function (event) {
                clearInterval(event);
            });
            CeilLampToggle.RoomLightevent = [];
            settings.forEach(function (setting, index) {
                CeilLampToggle.RoomLightevent[index] =
                    setInterval(function () {
                        if (setting.light.intensity <= setting.intensity) {
                            setting.light.intensity += 0.02;
                        } else {
                            clearInterval(CeilLampToggle.RoomLightevent[index]);
                        }
                    }, 20);
            });
        }
    }
}

//檯燈開關
class LampToggle {
    constructor() {
        this.powerON = false;
        this.mesh = new THREE.Object3D();
        let btnBox = new THREE.Mesh(
            new THREE.BoxGeometry(3, 1, 2),
            new THREE.MeshLambertMaterial({
                color: 0xdddddd
            })
        );
        this.mesh.add(btnBox);
        this.btn = new THREE.Mesh(
            new THREE.BoxGeometry(2, 0.75, 1),
            new THREE.MeshLambertMaterial({
                color: 'beige'
            })
        );
        //預設關燈
        this.btn.material.emissive = new THREE.Color('orange');
        this.btn.material.emissiveIntensity = 1;
        //給個名字
        this.btn.name = 'deskLampBtn';
        this.btn.rotation.z = -Math.PI / 12;
        this.btn.position.set(0, 0.4, 0);
        this.mesh.add(this.btn);
    }
    switchToggle(light) {
        if (this.powerON) {
            //切到關燈
            light.shadow.mapSize = { x: 0, y: 0 };
            this.btn.material.emissive = new THREE.Color('orange');
            this.btn.material.emissiveIntensity = 1;
            this.btn.rotation.z = -Math.PI / 12;
            //防止重複開關出BUG
            clearInterval(lightevent);
            lightevent = setInterval(function () {
                if (light.intensity >= 0) {
                    light.intensity -= pLightIntensity / 15;
                    if (light.intensity < 0) {
                        light.intensity = 0;
                    }
                } else {
                    light.castShadow = false;
                    //結束繼續呼叫
                    clearInterval(lightevent);
                }
            }, 20);
        } else {
            //切到開燈
            this.btn.material.emissive = new THREE.Color(0, 0, 0);
            this.btn.material.emissiveIntensity = 0;
            this.btn.rotation.z = Math.PI / 12;
            //防止重複開關出BUG
            clearInterval(lightevent);
            lightevent = setInterval(function () {
                if (light.intensity < pLightIntensity) {
                    light.intensity += pLightIntensity / 15;
                    if (light.intensity > pLightIntensity / 4) {
                        light.shadow.mapSize = { x: 512, y: 512 };
                        light.castShadow = true;
                    }
                } else {
                    light.intensity = pLightIntensity;
                    //結束繼續呼叫
                    clearInterval(lightevent);
                }
            }, 20);
        }
        this.powerON = !this.powerON;
    }
}

function init() {
    scene = new THREE.Scene();
    $("#canvas").width(width);
    $("#canvas").height(height);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor('black');
    //陰影
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = 2;
    $('#canvas').append(renderer.domElement);
    camera = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000);
    camera.position.x = 0;
    camera.position.y = 80;
    camera.position.z = -100;
    ////////////////////////////////////////////////////////////////

    //環境光源
    aLight = new THREE.AmbientLight(0xdddddd, aLightIntensity);
    scene.add(aLight);

    //純喫茶
    let tryittea = buildModel();
    tryittea.castShadow = true;
    tryittea.receiveShadow = true;
    tryittea.position.set(-115, 41, 65);
    tryittea.rotation.y = -Math.PI / 6;
    scene.add(tryittea);

    //室內燈開關
    ceilLampToggles[0] = new CeilLampToggle();
    ceilLampToggles[0].mesh.position.set(-125, 60, 20);
    scene.add(ceilLampToggles[0].mesh);
    // 床的旁邊也要有一個
    ceilLampToggles[1] = new CeilLampToggle();
    ceilLampToggles[1].mesh.position.set(125, 55, 60);
    ceilLampToggles[1].mesh.rotation.y = Math.PI;
    scene.add(ceilLampToggles[1].mesh);

    //讀取 MacBookPro
    readModel("mpm_f21__Apple_MacBook_Pro_15", 'MacBookPro', 30, scene);
    objNameList.push('MacBookPro');

    //讀取椅子
    readModel("Chair", 'Chair', 55, scene);
    objNameList.push('Chair');

    //讀取床
    readModel("bed", 'bed', 110, scene, 'Y');
    objNameList.push('bed');

    /////////////////////////////////////////////

    //檯燈與檯燈的光
    let deskLamp = new THREE.Object3D();
    //讀取檯燈
    readModel("Lamp", 'lamp', 30, deskLamp, 'Z');
    objNameList.push('lamp');
    //檯燈光源
    pLight = new THREE.PointLight(0xffffff, 0);
    pLight.position.set(4, 13, -11);
    pLight.shadow.bias = -.001;
    pLight.shadow.mapSize.width = pLight.shadow.mapSize.height = 1024;
    deskLamp.add(pLight);

    //檯燈光源
    // var sphereSize = 1;
    lampToggle = new LampToggle();
    lampToggle.mesh.position.set(-12, 0.75, -11);
    deskLamp.add(lampToggle.mesh);
    deskLamp.position.set(-50, 41, 80);
    deskLamp.rotation.y = Math.PI * 3 / 4;
    scene.add(deskLamp);

    pickables.push(lampToggle.btn);

    /////////////////////////////////////////////

    //吊燈與室內燈源
    let ceilLamp = new THREE.Object3D();
    //讀取吊燈
    readModel("Brass_Freak", 'ceilLamp', 60, ceilLamp);
    objNameList.push('ceilLamp');

    RoomLight = new THREE.PointLight(0xffffff, RoomLightIntensity);
    RoomLight.position.y = -105;
    RoomLight.castShadow = true;
    RoomLight.shadow.mapSize.width = RoomLight.shadow.mapSize.height = 2048;
    RoomLight.shadow.bias = -.001;

    // //把方向光加進吊燈組裡
    ceilLamp.add(RoomLight);
    ceilLamp.position.y = 200;
    scene.add(ceilLamp);

    //地板
    //https://www.3dxo.com/textures/4961_wood_8
    let planeMat = new THREE.TextureLoader().load('vendor/textures/wood.jpg');
    planeMat.wrapS = THREE.RepeatWrapping;
    planeMat.wrapT = THREE.RepeatWrapping;
    planeMat.repeat.set(15, 12);
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(250, 200, 4, 4),
        new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide, // 雙面材質
            map: planeMat,
            color: 0xF0F0F0,
        }));
    plane.rotation.x -= Math.PI / 2;
    //地板可以出現影子
    plane.receiveShadow = true;
    scene.add(plane);
    //牆壁
    let walls = [
        createWall(true, 250),
        createWall(true, 250),
        createWall(false, 200),
        createWall(false, 200)
    ];
    walls[0].position.z = 101;
    walls[1].position.z = -101;
    walls[2].position.x = 126;
    walls[3].position.x = -126;
    walls.forEach(function (wall) {
        // wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    });
    //桌子
    let desk = createDesk();
    desk.position.set(-85, 0, 70);
    scene.add(desk);
    //天花板
    let ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(250, 2, 200),
        new THREE.MeshLambertMaterial({
            color: 'beige'
        })
    );
    ceiling.position.y = 201;
    scene.add(ceiling);

    //筆筒
    let penBox = new THREE.Object3D();
    readModel('Pen', 'pen', 10, penBox);
    readModel('Pen', 'pen1', 10, penBox, undefined, 'Pen1');
    objNameList.push('pen', 'pen1');
    let box = createPenBox();
    penBox.add(box);

    penBox.position.set(-110, 41, 85);
    scene.add(penBox);

    //歐逼康啜
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.name = 'controls';
    // 禁用方向鍵調整歐逼康輟位置
    controls.enableKeys = false;

    raycaster = new THREE.Raycaster();
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mousemove', onDocumentMouseOver, false);

    window.addEventListener('resize', (function onWindowResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        $("#canvas").width(width);
        $("#canvas").height(height);
    }), false);
}

function animate() {
    if (!finish) {
        let isOK = true;
        objNameList.forEach(function (name) {
            if (scene.getObjectByName(name) === undefined) {
                isOK = false;
            }
        });
        if (isOK) {
            //loading結束
            document.getElementById("loading").style.display = "none";
            $("#info").show();
            //室內燈開關
            //開關中間那條載入完成，要放入pickables
            ceilLampToggles.forEach(function (ceilLampToggle, index) {
                let ceilBtn = ceilLampToggle.mesh.getObjectByName('switchBtn');
                ceilBtn.material = new THREE.MeshLambertMaterial({
                    color: 0xfff4f2
                });
                ceilBtn.index = index;
                let btnShell = ceilLampToggle.mesh.getObjectByName('switch');
                btnShell.material = new THREE.MeshLambertMaterial({
                    color: 0xf9dd9a
                });
                ceilBtn.position.x = -0.38;
                pickables.push(scene.getObjectByName('toggleBtn' + index));
            })
            ///////////////////////////////////
            let MacBookPro = scene.getObjectByName('MacBookPro');
            MacBookPro.position.set(-90, 41, 60);
            MacBookPro.rotation.y = Math.PI / 2;
            let pen = scene.getObjectByName('pen');
            pen.position.set(0.5, 3, -0.5);
            pen.rotation.x = Math.PI / 7.5;
            let pen1 = scene.getObjectByName('pen1');
            pen1.position.set(-1.7, 3, 0.6);
            pen1.rotation.y = Math.PI * 3 / 2;
            pen1.rotation.z = Math.PI / 3.5
            let chair = scene.getObjectByName('Chair');
            chair.position.set(-90, 0, 40);
            chair.rotation.y = -Math.PI / 2;
            let bed = scene.getObjectByName('bed');
            bed.position.set(135, -0.5, 110.5);
            // bed.rotation.y = Math.PI / 2;
            //初始化完畢
            finish = !finish;
        }
    } else {
        renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
}

//抓來用...
function onDocumentMouseDown(event) {
    // PICKING DETAILS: 
    // convert mouse.xy = [-1,1]^2 (NDC)
    // unproject (mouse.xy, 1) to a point on the far plane (in world coordinate)
    // set raycaster (origin, direction)
    // find intersection objects, (closest first) 
    // each record as
    // [ { distance, point, face, faceIndex, object }, ... ]

    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // find intersections
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
        console.log("GET!");
        let picked = intersects[0].object;
        if (picked.name == 'deskLampBtn') {
            lampToggle.switchToggle(pLight);
        } else if (picked.name == 'switchBtn') {
            let index = picked.index;
            ceilLampToggles.forEach(function (toggle, i) {
                if (index == i) {
                    toggle.toggleChangePosition();
                }
                CeilLampToggle.lightControl(
                    ceilLampToggles,
                    { light: RoomLight, intensity: RoomLightIntensity },
                    { light: aLight, intensity: aLightIntensity }
                );
            });
            CeilLampToggle.globalPower = !CeilLampToggle.globalPower;
        }
    }
}

//這個也抓來直接用...
function onDocumentMouseOver(event) {
    event.preventDefault();  // may not be necessary
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;

    // find intersections
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    } else {
        document.body.style.cursor = 'auto';
    }

}
export { init, animate }