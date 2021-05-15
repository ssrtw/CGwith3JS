//canvas大小設定
var width = window.innerWidth * 0.9;
var height = window.innerHeight * 0.9;
$("#canvas").width(width);
$("#canvas").height(height);
//threejs必要
var scene, camera, renderer, skyCamera;
//儀錶板
var dashboard, point, kmH;
//時間差
var clock;
//HUD
var sceneHUD, cameraHUD;
//車子相關
var pos = new THREE.Vector3();
var vel = new THREE.Vector3();
var force = new THREE.Vector3();
var power, angle;
var loadFinish = false;
var carSize = new THREE.Vector3();
var collisionIndex;
//按照演算法的9個判斷結果，0就是沒撞到
//第一個位置1是前方2後方3車子中間，第二個位置1是左方2右方3是中間，3就不給轉
var collision = [0, 0];
//如果要倒車(撞到後要開走)
var reversing = false;
//1：往前 0：倒車
var direction = 1;
//障礙物陣列
var pillars = [];
//鍵盤事件
var keyboard = new KeyboardState();

(function () {
    Math.clamp = function (val, min, max) {
        return Math.min(Math.max(val, min), max);
    }
})();

class Pillar {
    constructor() {
        let pillarTexture = new THREE.TextureLoader().load('vendor/textures/brick.png');
        //障礙物倍率
        let size = Math.ceil(Math.random() * 4);
        //這個圓柱體的半徑
        this.radius = 5 * size;
        //http://jsfiddle.net/jmcjc5u/pLbsaj6v/ --- 組合輪胎
        pillarTexture.wrapS = THREE.RepeatWrapping;
        pillarTexture.wrapT = THREE.RepeatWrapping;
        pillarTexture.repeat.set(4 * size, 2);
        //加上圓柱體
        this.mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(5 * size, 5 * size, 20, 32),
            new THREE.MeshPhongMaterial({
                side: THREE.DoubleSide,
                map: pillarTexture
            })
        );
        //圓柱可在地板顯示陰影
        this.mesh.castShadow = true;
        this.mesh.position.y = 10;

        //空出中間給車子加入場景不一開始就被撞到
        this.mesh.position.x = Math.ceil(Math.random() * 1001) - 500;
        this.mesh.position.z = Math.ceil(Math.random() * 1001) - 500;
        do {
            this.mesh.position.x = Math.ceil(Math.random() * 1001) - 500;
            this.mesh.position.z = Math.ceil(Math.random() * 1001) - 500;
        } while (Math.abs(this.mesh.position.x) <= 50 && Math.abs(this.mesh.position.z) <= 50)
        scene.add(this.mesh);
    }
}
function init() {
    //場景
    scene = new THREE.Scene();
    //cubemap
    let cube = loadCubemap();
    scene.background = cube;


    //攝影機
    camera = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000);
    camera.position.x = 50;
    camera.position.y = 50;
    camera.position.z = 50;
    camera.lookAt(scene.position);


    //鳥瞰攝影機
    skyCamera = new THREE.OrthographicCamera(-500, 500, 500, -500, -10, 600);
    skyCamera.position.y = 50;
    skyCamera.up.set(0, 0, -1);
    skyCamera.lookAt(new THREE.Vector3());

    //renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor('white');
    //陰影
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    //不自動清除畫面
    renderer.autoClear = false;

    $("#canvas").append(renderer.domElement);

    //THREE提供的物件(算時間)
    clock = new THREE.Clock();

    // directional light
    let dLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dLight.position.set(80, 160, -100);
    dLight.castShadow = true;
    dLight.shadow.camera.left = -500;
    dLight.shadow.camera.top = -500;
    dLight.shadow.camera.right = 500;
    dLight.shadow.camera.bottom = 500;
    dLight.shadow.camera.near = 1;
    dLight.shadow.camera.far = 1000;
    dLight.target = scene;
    dLight.shadow.mapSize.width = dLight.shadow.mapSize.height = 1024;
    dLight.shadow.bias = -.01;
    dLight.name = 'dirLight';
    scene.add(dLight);
    let ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);

    //讀取車子
    readModel("Lamborghini_Aventador", 'car');

    //地板
    //https://www.deviantart.com/hhh316/art/Seamless-mountain-rock-183926178
    let planeMat = new THREE.TextureLoader().load('vendor/textures/mountainrock.jpg');
    planeMat.wrapS = THREE.RepeatWrapping;
    planeMat.wrapT = THREE.RepeatWrapping;
    planeMat.repeat.set(15, 15);
    let plane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000, 4, 4),
        new THREE.MeshLambertMaterial({
            side: THREE.DoubleSide, // 雙面材質
            map: planeMat,
            color: 0xF0F0F0,//調整亮度到跟skybox相近
        }));
    plane.rotation.x -= Math.PI / 2;
    //地板可以出現影子
    plane.receiveShadow = true;
    scene.add(plane);

    //車速與轉動角度
    power = 1.0;
    angle = 0.0;

    sceneHUDInit();

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

function sceneHUDInit() {
    let loader = new THREE.TextureLoader();
    //儀錶板
    sceneHUD = new THREE.Scene();
    let dashboardTexture = loader.load('vendor/textures/dashboard.png');
    dashboard = new THREE.Mesh(
        new THREE.PlaneGeometry(550, 550, 1, 1),
        new THREE.MeshBasicMaterial({
            map: dashboardTexture,
            alphaTest: 0.5,
            opacity: 0.9,
            transparent: true,
            depthTest: false
        })
    );
    dashboard.position.x = -700;
    dashboard.position.y = -700;
    sceneHUD.add(dashboard);
    //---------------------------------------------
    //儀錶板指針
    let pointTexture = loader.load('vendor/textures/dashboard_point.png');
    point = new THREE.Mesh(
        new THREE.PlaneGeometry(55, 550, 1, 1),
        new THREE.MeshBasicMaterial({
            map: pointTexture,
            alphaTest: 0.5,
            opacity: 0.9,
            transparent: true,
            depthTest: false
        })
    );
    point.position.x = -700;
    point.position.y = -700;
    sceneHUD.add(point);
    //---------------------------------------------
    //儀錶板時速
    var Text2D = THREE_Text.MeshText2D;
    var textAlign = THREE_Text.textAlign;
    kmH = new Text2D("0", {
        align: textAlign.center,
        font: '80px 微軟正黑體',
        fillStyle: '#000000',
        antialias: false,
        opacity: 1,
    });
    kmH.position.set(-510, -735, 0);
    kmH.scale.set(0.5, 0.5, 0.5);
    sceneHUD.add(kmH);

    cameraHUD = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -10, 100);
    cameraHUD.position.z = 80;
}

function animate() {
    let car;
    //讓localToWorld可以正常使用
    scene.updateMatrixWorld();
    if (scene.getObjectByName("car") !== undefined && loadFinish == false) {
        angle = Math.PI;
        loadFinish = !loadFinish;
        car = scene.getObjectByName('car');
        car.rotation.y = Math.PI;
        ////製作十個圓柱體
        while (pillars.length < 10) {
            pillars.push(new Pillar());
        }
    }
    if (loadFinish) {
        car = scene.getObjectByName("car");
        dirLight = scene.getObjectByName("dirLight");
        //算時間差
        var dt = clock.getDelta();
        update(dt, car);
        // car update
        car.position.copy(pos);
        car.rotation.y = angle;
        cameraPos = car.localToWorld(new THREE.Vector3(-40, 25, 0));
        camera.position.set(cameraPos.x, cameraPos.y, cameraPos.z);
        camera.lookAt(car.position);
    }
    render();

    //儀錶板指針==>轉動
    let speed = vel.length();
    //頂速兩百
    point.rotation.z = speed / 100 * (Math.PI * 1.5) * -1;
    kmH.text = (speed / 100 * 90).toFixed(0);
    requestAnimationFrame(animate);

    //車子快要超出邊界
    //硬是拉回原點
    if (Math.abs(pos.x) >= 450 || Math.abs(pos.z) >= 450) {
        pos.set(0, 0, 0);
    }
}

function update(dt, car) {
    keyboard.update();
    let isKeyDown = false;
    if (vel.length() > 0) {
        angle = Math.atan2(-vel.z, vel.x); // update orientation
    }

    //急殺
    if (keyboard.pressed("space")) {
        power = 0.2;
        vel.multiplyScalar(0.85);
    }

    //穿過去啦！，不太可能，打算改到000初始位置
    if (collision[0] == 3 & collision[1] == 3) {
        vel.set(0, 0, 0);
    }

    //正常狀態
    //油門催蕊
    //如果前方撞上就不能再往前開了
    if (!(reversing && collision[0] == 1) && keyboard.pressed("W")) {
        if (direction == 0) {
            power /= 1.3;
            if (power <= 0.005) {
                direction = 1;
                angle_thrust += Math.PI;
            }
        } else {
            direction = 1;
            power *= 1.3;
        }
        isKeyDown = true;
    }
    //放油門
    if (keyboard.pressed("S")) {
        power /= 1.3;
    }
    //後方撞上就不能再往後開了
    if (!(reversing && collision[0] == 2) && keyboard.pressed("X")) {
        if (power == 0) {
            power = 0.2;
        }
        if (direction) {
            power /= 1.5;
            if (power <= 0.005) {
                direction = 0;
                angle_thrust += Math.PI;
            }
        }
        if (direction == 0) {
            power *= 1.3;
            //倒車不能快QQ
            power = Math.clamp(power, 0, 100);
        }
        isKeyDown = true;
    }

    //跑車跑很快
    power = Math.clamp(power, 0, 200);


    var angle_thrust = angle;
    if (vel.length() > 10) {
        //如果要往左轉，如果沒被撞到，撞到不給轉彎
        if (keyboard.pressed("A") && !(reversing && collision[1] == 1)) {
            if (direction)
                angle_thrust += 0.314;
            else
                angle_thrust -= 0.314;
        }
        //如果要往右轉，如果沒被撞到，撞到不給轉彎
        if (keyboard.pressed("D") && !(reversing && collision[1] == 2))
            if (direction)
                angle_thrust -= 0.314;
            else
                angle_thrust += 0.314;
    }

    var thrust = new THREE.Vector3(1, 0, 0).multiplyScalar(power);

    // compute force
    thrust.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle_thrust);

    force.copy(thrust);
    //阻力
    force.add(vel.clone().multiplyScalar(-2));

    pillars.forEach(function (pillar, index) {
        if (!reversing)
            if (checkInsert(car, carSize, pillar.mesh, pillar.radius)) {
                console.log("撞到惹");
                reversing = true;
                //速度直接歸零
                thrust.set(0, 0, 0);
                vel.set(0, 0, 0);
                force.set(0, 0, 0);
                //只讓駕駛從正確的方向開走
                direction = !direction;
                //取得撞到的那個圓柱的索引值
                collisionIndex = index;
            }
    });
    //基本上一次只撞到一顆
    //如果撞到某一顆，其他顆停止判定，只要管車子是否能往反方向開走，不再管其他顆跟車子的關係
    //如果又撞到別顆，就會用到上面的forEach去判定又撞到了哪一顆。
    if (reversing) {
        if (isKeyDown) {
            console.log("把車開走");
            // eulers
            vel.add(force.clone().multiplyScalar(dt));
            if (direction) {
                pos.add(vel.clone().multiplyScalar(dt));
            } else {
                pos.add(vel.clone().multiplyScalar(dt * -1));
            }
            //沒有再去撞到那顆圓柱
            if (!checkInsert(car, carSize, pillars[collisionIndex].mesh, pillars[collisionIndex].radius)) {
                reversing = false;
            }
        }
    } else {
        reversing = false;
        collision = [0, 0];
        // eulers
        vel.add(force.clone().multiplyScalar(dt));
        if (direction) {
            pos.add(vel.clone().multiplyScalar(dt));
        } else {
            pos.add(vel.clone().multiplyScalar(dt * -1));
        }
    }
}

function checkInsert(rect, rsize, circle, r) {
    /*
        1. 設x’ 為 v方向之單位向量
        z’ = cross (x’, (0,1,0)).normalize()
        2. 座標轉換（以中心點p 為例）
    */
    //
    let halfSize = new THREE.Vector2(rsize.x / 2, rsize.z / 2);

    //取得目前世界座標
    let where = new THREE.Vector3();
    let center = new THREE.Vector3();
    rect.getWorldPosition(where);
    circle.getWorldPosition(center);

    let rx = where.x;
    let rz = where.z;
    let cx = center.x;
    let cz = center.z;

    let turn = -angle;
    let tCos = Math.cos(turn);
    let tSin = Math.sin(turn);

    //轉正
    let newC = new THREE.Vector2(tSin * cz + tCos * cx, tCos * cz - tSin * cx);
    let newR = new THREE.Vector2(tSin * rz + tCos * rx, tCos * rz - tSin * rx);
    //轉正之後，找出兩個對角線上的點
    let max = new THREE.Vector2(newR.x + halfSize.x - newC.x, newR.y + halfSize.y - newC.y);
    let min = new THREE.Vector2(newR.x - halfSize.x - newC.x, newR.y - halfSize.y - newC.y);

    collision = 0;

    /*
       +X
        ^
        |
        |
    --------->+Z
        |
        |
    */
    if (max.x < 0) {
        if (max.y < 0) {
            //車右前方撞到
            collision = [1, 2];
            console.log(1);
            return (max.x * max.x + max.y * max.y < r * r);
        } else if (min.y > 0) {
            //車左前方撞到
            collision = [1, 1];
            console.log(2);
            return (max.x * max.x + min.y * min.y < r * r);
        } else {
            //車中間前面撞上
            collision = [1, 3];
            console.log(3);
            return (Math.abs(max.x) < r);
        }
    } else if (min.x > 0) {
        if (max.y < 0) {
            //車後右後方撞上
            collision = [2, 2];
            console.log(4);
            return (min.x * min.x + max.y * max.y < r * r);
        } else if (min.y > 0) {
            //車子左後撞上
            collision = [2, 1];
            console.log(5);
            return (min.x * min.x + min.y * min.y < r * r);
        } else {
            //車子正後方撞上
            collision = [2, 3];
            console.log(6);
            return (min.x < r);
        }
    } else {
        if (max.y < 0) {
            //車子右側撞到
            collision = [3, 2];
            console.log(7);
            return (Math.abs(max.y) < r);
        } else if (min.y > 0) {
            //車子左側撞到
            collision = [3, 1];
            console.log(8);
            return (min.y < r);
        } else {
            //穿過去啦！
            // collision = [3, 3];
            console.log(9);
            return true;
        }
    }
}

function readModel(modelName, objName = 'OBJ', targetSize = 40) {

    var onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function (xhr) { };

    var mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath('vendor/models/' + modelName + '/');
    mtlLoader.load(modelName + '.mtl', function (materials) {

        materials.preload();

        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('vendor/models/' + modelName + '/');
        objLoader.load(modelName + '.obj', function (object) {
            theObject = unitize(object, targetSize, "OBJ");
            // theObject.add(new THREE.BoxHelper(theObject));
            theObject.name = objName;
            theObject.traverse(function (object) {
                if (object instanceof THREE.Mesh) {
                    object.castShadow = true
                    object.receiveShadow = true
                }
            })
            scene.add(theObject);
            var box3 = new THREE.Box3();
            box3.setFromObject(theObject);
            carSize = new THREE.Vector3().subVectors(box3.max, box3.min);
            console.log(carSize);
            //不須改變軸的方向
            // theObject.setRotationFromEuler(new THREE.Euler(0, Math.PI / 2))

        }, onProgress, onError);

    });

}
////////////////////////////////////////
// wrap an Object3D around the given object
// so that it is centered at +Y axis
//
function unitize(object, targetSize, objName) {

    // find bounding box of 'object'
    var box3 = new THREE.Box3();
    box3.setFromObject(object);
    var size = new THREE.Vector3();
    size.subVectors(box3.max, box3.min);
    var center = new THREE.Vector3();
    center.addVectors(box3.max, box3.min).multiplyScalar(0.5);

    console.log('center: ' + center.x + ', ' + center.y + ', ' + center.z);
    console.log('size: ' + size.x + ', ' + size.y + ', ' + size.z);

    // uniform scaling according to objSize
    var objSize = Math.max(size.x, size.y, size.z);
    var scaleSet = targetSize / objSize;
    var theObject = new THREE.Object3D();
    theObject.add(object);
    object.scale.set(scaleSet, scaleSet, scaleSet);
    object.position.set(-center.x * scaleSet, 0, -center.z * scaleSet);

    object.rotation.y = Math.PI / 2;
    // let axis = new THREE.AxesHelper(10);
    // theObject.add(axis);

    //get now size

    // carSize = size.multiplyScalar(scaleSet);

    return theObject;
}

function loadCubemap() {
    var path = "vendor/textures/cubeMap2/";
    var format = '.png';
    var urls = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];
    var loader = new THREE.CubeTextureLoader();
    var cubeMap = loader.load(urls);
    cubeMap.format = THREE.RGBFormat;
    return cubeMap;
}

function render() {

    renderer.clear();

    renderer.setViewport(0, 0, width / 2, height);
    camera.aspect = width / 2 / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    renderer.render(sceneHUD, cameraHUD);
    renderer.setViewport(width / 2, 0, width / 2, height);
    renderer.render(scene, skyCamera);
}