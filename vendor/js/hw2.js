var width = window.innerWidth * 0.9;
var height = window.innerHeight * 0.9;
$("#canvas").width(width);
$("#canvas").height(height);
//必要全域變數
var scene, camera, renderer;
//一個clock計算砲彈的拋物線deltaT
var clock;
//坦克車
var tank, parts;
//砲彈陣列
var balls = [];
// 標靶陣列
var targets = [];
//視角切換First-person perspective第一人稱視角
var FPP = false;
//用於切換視角，將orbitcontrols設為全域
var controls;
//鍵盤事件
var keyboard = new KeyboardState();

class Ball {
    constructor(x = 0, y = 0, z = 0, vx, vz, vy) {
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 20),
            new THREE.MeshPhongMaterial({
                color: 0x412722,
            }));;
        //砲彈在空中出現陰影於地面
        this.mesh.castShadow = true;
        scene.add(this.mesh);
        this.pos = new THREE.Vector3(x, y, z);  // 初始位置
        this.vel = new THREE.Vector3(vx, vy, vz); // 初速
        this.force = new THREE.Vector3(0, -20, 0); // 重力
        this.m = 1;
        this.remove = false;
    }
    update(dt) {
        this.vel.add(this.force.clone().multiplyScalar(dt / this.m));
        this.pos.add(this.vel.clone().multiplyScalar(dt));
        if (this.pos.y <= 0) {
            // remove from scene (自己做)
            //回傳true則通知forEach移除這個砲彈物件
            this.remove = true;
        }
        this.mesh.position.copy(this.pos);
    }
}

class Target {
    constructor() {
        //http://clipart-library.com/clipart/BcgAdxKc8.htm
        let targetTexture = new THREE.TextureLoader().load('vendor/textures/target.png');
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(10, 10, 10),
            new THREE.MeshPhongMaterial({
                color: 0xF0F0F0,
                map: targetTexture,
            })
        );
        //標靶能顯現陰影
        this.mesh.castShadow = true;
        //看要產生在哪裡
        //整片地板長寬400
        //先得到0~400.xxx然後取地板函數得到0~400然後-200可以抓到-200~200的位置
        //抓坦克的位置，別讓標靶出現在坦克的附近
        //坦克長度至少有50(車身+砲管)，抓個半徑50內不能有標靶
        //取得標靶的隨機座標值
        let x, z;
        let tankX = tank.position.x, tankZ = tank.position.z;
        let planeSize = 400, distance = 30;
        do {
            x = Math.floor(Math.random() * (planeSize + 1)) - planeSize / 2;
            z = Math.floor(Math.random() * (planeSize + 1)) - planeSize / 2;
        } while ((Math.abs(tankX - x) <= distance) && (Math.abs(tankZ - z) <= distance));
        //將得到的隨機位置寫入mesh
        this.mesh.position.x = x;
        //同x
        this.mesh.position.z = z;
        //+5讓高度至少到地面
        this.mesh.position.y = Math.floor(Math.random() * 20) + 5;
        //隨機角度
        this.mesh.rotation.y = Math.random() * Math.PI;
        scene.add(this.mesh);
    }
}

function init() {
    scene = new THREE.Scene();
    //弄一個外圍場景
    let cubeMap = loadCubemap();
    scene.background = cubeMap;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor('white');
    //陰影
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    $('#canvas').append(renderer.domElement);
    camera = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000);
    camera.position.x = 100;
    camera.position.y = 55;
    camera.position.z = 85;
    //算時間差
    clock = new THREE.Clock();
    //把坦克部件抓出來
    parts = bulidPart();
    //坦克放入場景
    tank = buildTank();
    tank.name = 'tank';
    //坦克車陰影,traverse所有tank的geometry
    tank.traverse(function (object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true
            object.receiveShadow = true
        }
    })
    scene.add(tank);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.name = 'controls';
    // 禁用方向鍵調整歐逼康輟位置
    controls.enableKeys = false;
    camera.lookAt(scene.position);
    //做一片地板
    //https://www.deviantart.com/hhh316/art/Seamless-desert-sand-texture-183159331
    let planeMat = new THREE.TextureLoader().load('vendor/textures/desert.png');
    planeMat.wrapS = THREE.RepeatWrapping;
    planeMat.wrapT = THREE.RepeatWrapping;
    planeMat.repeat.set(3, 3);
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 4, 4),
        new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide, // 雙面材質
            map: planeMat,
            color: 0xF0F0F0,//調整亮度到跟skybox相近
        }));
    plane.rotation.x -= Math.PI / 2;
    //地板可以出現影子
    plane.receiveShadow = true;
    scene.add(plane);

    //需要有光源，不然Phong會全黑...
    //環境光源
    let ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);

    // directional light
    dLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dLight.position.set(80, 160, -100);
    dLight.castShadow = true;
    dLight.shadow.camera.left = -280;
    dLight.shadow.camera.top = -260;
    dLight.shadow.camera.right = 280;
    dLight.shadow.camera.bottom = 200;
    dLight.shadow.camera.near = 1;
    dLight.shadow.camera.far = 400;
    dLight.target = scene;
    dLight.shadow.mapSize.width = dLight.shadow.mapSize.height = 1024;
    scene.add(dLight);
    dLight.shadow.bias = -.01;

    window.addEventListener('resize', (function onWindowResize() {
        width = window.innerWidth * 0.9;
        height = window.innerHeight * 0.9;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        $("#canvas").width(width);
        $("#canvas").height(height);
    }), false);
}

function loadCubemap() {

    var path = "vendor/textures/cubeMaps/";
    var format = '.png';
    var urls = [
        path + 'px' + format, path + 'nx' + format,
        path + 'py' + format, path + 'ny' + format,
        path + 'pz' + format, path + 'nz' + format
    ];
    var loader = new THREE.CubeTextureLoader();
    var cubeMap = loader.load(urls);
    cubeMap.format = THREE.RGBFormat;
    return cubeMap;

}

function bulidPart() {
    let loader = new THREE.TextureLoader();
    //https://www.1001freedownloads.com/free-clipart/desert-camo-print
    texture = loader.load('vendor/textures/camouflage.svg');
    texture.minFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    //預設材質
    let mat = new THREE.MeshPhongMaterial({
        map: texture,
    });
    let parts = [];
    //車身
    let base = new THREE.Mesh(new THREE.BoxGeometry(40, 10, 20), mat);
    parts.push(base);
    //砲塔
    let turret = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 10, 30), mat);
    parts.push(turret);
    //砲管
    let cannon = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 30), mat);
    parts.push(cannon);
    //砲軸
    let turn = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 10, 30), mat);
    parts.push(turn);
    return parts;
}
function buildTank() {
    //坦克車集合
    let tank = new THREE.Object3D();

    let base = parts[0];
    base.position.set(-10, 5, 0);
    //車體名稱
    base.name = 'base';
    tank.add(base);

    let turret = parts[1];
    turret.position.set(0, 15, 0);
    //砲塔名稱
    turret.name = 'turret';
    tank.add(turret);

    let turn = parts[2];
    turn.position.x = 10;
    turn.rotation.x = Math.PI / 2;
    //轉動軸名稱
    turn.name = 'turn';
    turret.add(turn);

    let cannon = parts[3];
    cannon.rotation.z = Math.PI / 2;
    cannon.position.set(5, 0, 0);
    //砲管名稱
    cannon.name = 'cannon';
    turn.add(cannon);
    return tank;
}
function ballsAnimate() {
    let dt = clock.getDelta();
    balls.forEach(function (b, bi) {
        b.update(dt);
        //去抓b的remove屬性，如果是該被移除，就從陣列丟出
        if (b.remove) {
            //從場景中移除這顆砲彈
            scene.remove(b.mesh);
            //從陣列中移除砲彈
            balls.splice(bi, 1);
        }
        targets.forEach(function (t, ti) {
            let bx = b.pos.x;
            let by = b.pos.y;
            let bz = b.pos.z;
            let tx = t.mesh.position.x;
            let ty = t.mesh.position.y;
            let tz = t.mesh.position.z;
            /*
                球的半徑為0.5，標靶的厚度為10(從中心點往兩側算都是5)
                所以如果球跟標靶的位置相差小於5.5(0.5+5)
                意味著砲彈打中了標靶
                標靶為正方形，中心點離三軸長度為5，球半徑0.5
                5+0.5=5.5，球與標靶的距離於5.5以內就是擊中目標，三軸都是5.5
            */
            let CollisionBox = 5.3;
            if (Math.abs(bx - tx) < CollisionBox && Math.abs(bz - tz) < CollisionBox && Math.abs(by - ty) < CollisionBox) {
                //從場景中移除這個標靶
                scene.remove(t.mesh);
                //從陣列中移除這個標靶
                targets.splice(ti, 1);
                //從場景中移除這顆砲彈
                scene.remove(b.mesh);
                //從陣列中移除砲彈
                balls.splice(bi, 1);
            }
        })
    });
}

function keyboardEvent(tankRotation = 0.01, tankSpeed = 0.2, turretRotation = 0.02) {
    keyboard.update();
    if (keyboard.pressed("W")) {
        if (keyboard.pressed("shift")) {
            tank.position.x += 2 * tankSpeed * Math.cos(tank.rotation.y);
            tank.position.z -= 2 * tankSpeed * Math.sin(tank.rotation.y);
        } else {
            tank.position.x += tankSpeed * Math.cos(tank.rotation.y);
            tank.position.z -= tankSpeed * Math.sin(tank.rotation.y);
        }
    }
    if (keyboard.pressed("S")) {
        //按下shift催油門
        if (keyboard.pressed("shift")) {
            tank.position.x -= 2 * tankSpeed * Math.cos(tank.rotation.y);
            tank.position.z += 2 * tankSpeed * Math.sin(tank.rotation.y);
        } else {
            tank.position.x -= tankSpeed * Math.cos(tank.rotation.y);
            tank.position.z += tankSpeed * Math.sin(tank.rotation.y);
        }
    }
    if (keyboard.pressed("A")) {
        tank.rotation.y += tankRotation;
    }
    if (keyboard.pressed("D")) {
        tank.rotation.y -= tankRotation;
    }
    if (keyboard.pressed("I")) {
        //只能往上到60度，不然會穿模
        if (parts[2].rotation.y < Math.PI / 3)
            parts[2].rotation.y += turretRotation;
        $("#angle").text((parts[2].rotation.y / Math.PI * 180).toFixed(2));
    }
    if (keyboard.pressed("K")) {
        //只能往下到-20度，不然會穿模
        if (parts[2].rotation.y > -Math.PI / 9)
            parts[2].rotation.y -= turretRotation;
        $("#angle").text((parts[2].rotation.y / Math.PI * 180).toFixed(2));
    }
    //左旋轉砲塔
    if (keyboard.pressed("J")) {
        parts[1].rotation.y += turretRotation;
    }
    //右旋轉砲塔
    if (keyboard.pressed("L")) {
        parts[1].rotation.y -= turretRotation;
    }
    if (keyboard.down("space")) {
        //抓出砲塔
        let turret = parts[1];
        //抓出旋轉軸
        let turn = parts[2];
        //抓出砲管
        let cannon = parts[3];
        let tGPW = new THREE.Vector3(), cGPW = new THREE.Vector3();
        //取得旋轉軸的位置
        turn.getWorldPosition(tGPW);
        //取得砲管的位置
        cannon.getWorldPosition(cGPW);
        //砲彈的初始位置會是砲管中心位置的兩倍減去轉動軸的位置
        //旋轉軸的y軸旋轉度數會等於要射出砲彈的方向，砲彈是斜拋...
        //固定速度：40
        //固定速度是某個方向，所以還要拆水平跟垂直分力，然後用旋轉度數取正餘弦函數*速度
        //水平分力要再計算xz分量，開在x軸上的話，分量就計算砲塔的旋轉角度的sin cos去分別給x,z分量
        //坦克開出x軸的話，旋轉角度就要多算坦克本身與砲塔相加
        let speed = 40;
        balls.push(new Ball(2 * cGPW.x - tGPW.x, 2 * cGPW.y - tGPW.y, 2 * cGPW.z - tGPW.z
            , Math.cos((tank.rotation.y + turret.rotation.y) * -1) * Math.cos(turn.rotation.y) * speed
            , Math.sin((tank.rotation.y + turret.rotation.y) * -1) * Math.cos(turn.rotation.y) * speed
            , Math.sin(turn.rotation.y) * speed));
    }
}

function animate() {
    //第一人稱視角
    if (FPP) {
        //車身
        let base = new THREE.Vector3(), cannon = new THREE.Vector3();
        parts[0].getWorldPosition(base);
        camera.position.set(base.x, base.y + 30, base.z);
        //砲管
        parts[3].getWorldPosition(cannon);
        camera.lookAt(cannon.x, cannon.y + 10, cannon.z);
    }
    //砲彈動作(含拋物線與打擊標靶)
    ballsAnimate();
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    //偵測鍵盤事件
    keyboardEvent();
}
$("#newTargetBtn").click(function () {
    targets.push(new Target());
});

$("#changeBtn").click(function () {
    if (FPP) {
        $("#changeBtn").text("第一人稱");
        //上帝視角用orbitcontrols
        controls.enabled = true;
        camera.position.set(100, 55, 85);
        camera.lookAt(scene.position);
    } else {
        $("#changeBtn").text("上帝視角");
        //把orbitcontrols關掉不給用
        controls.enabled = false;
    }
    FPP = !FPP;
});