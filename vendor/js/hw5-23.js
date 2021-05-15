import { vs_toon, fs_toon, vs_sem, fs_sem, vs_gooch, fs_gooch } from './shaderHw5.js';
const perlin = new Perlin();
var scene, renderer, camera;
var width, height;
//////////////////////
var terrain;
var teapots = [];
var raycaster;
var mouse = new THREE.Vector2();
var pickables = [];
var clock;
//////////////////////
//新建茶壺的位置方向使用
var poi = new THREE.Vector3();
var n = new THREE.Vector3();
var la = new THREE.Vector3();
var isDragging = false;
//////////////////////
var kd, byab;
var pointLight;
/////////////////////////////////////////////////////////////////
class MyTeaPot {
    //預設每秒轉45度
    static speed = Math.PI * 12;
    static subLife = 0.1;
    static count = 0;

    constructor(point, material) {
        this.mesh = new THREE.Object3D();
        this.mesh.position.copy(point);
        this.mesh.class = "teapot";
        //放入茶壺
        this.teapot = this.createTeapot(material);
        this.mesh.add(this.teapot);
        //////////////////////////////////////////////////
        this.lifeText = this.createLifeText();
        MyTeaPot.count++;
    }

    createLifeText() {
        let Text2D = THREE_Text.MeshText2D;
        let textAlign = THREE_Text.textAlign;

        let lifeText = new Text2D(this.teapot.life, {
            align: textAlign.center,
            font: '15px Arial',
            fillStyle: '#3a8be8',
            antialias: true
        });
        return lifeText;
    }

    createTeapot(material) {
        let teapotGeom = new THREE.TeapotBufferGeometry(5);
        teapotGeom.translate(0, 0.5, 0);
        //做旋轉，三軸方向已改變
        teapotGeom.rotateX(Math.PI * 0.5);
        //往上-Z，往前+Y，X不變
        ///////////////////////////////////////////////
        let teapot = new THREE.Mesh(teapotGeom, material);
        let box3 = new THREE.Box3();
        box3.setFromObject(teapot);
        let teapotSize = new THREE.Vector3().subVectors(box3.max, box3.min);
        teapot.position.z = teapotSize.z / 2;
        teapot.life = 1;
        return teapot;
    }

    activeTeapot(deltaTime, light) {
        this.teapot.life -= MyTeaPot.subLife * deltaTime;
        this.teapot.rotation.z -= MyTeaPot.speed * deltaTime * this.teapot.life;
        this.teapot.material.uniforms.opacity.value = this.teapot.life;
        this.lifeText.text = (this.teapot.life * 100).toFixed(0);
        if (this.teapot.life >= 0.75)
            this.lifeText.fillStyle = "#3a8be8";
        else if (this.teapot.life < 0.75 && this.teapot.life >= 0.5)
            this.lifeText.fillStyle = "#ff00ff";
        else if (this.teapot.life < 0.5)
            this.lifeText.fillStyle = "#ff0000";
        if (this.teapot.material.lightNeed) {
            this.teapot.material.uniforms.lightpos.value = light.position;
        }
    }

    deadTest() {
        if (this.teapot.life <= 0)
            return true;
        else
            return false;
    }
}

function init() {
    clock = new THREE.Clock();
    width = window.innerWidth;
    height = window.innerHeight;

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x888888);
    $('#canvas').append(renderer.domElement);

    scene = new THREE.Scene();
    let cube = loadCubemap("vendor/textures", "cubeMap3");
    scene.background = cube;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 200, 500);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    /////////////////////////////////////////////////////////////////
    pointLight = new THREE.PointLight(0xffffff, 1.1);
    pointLight.angle = 0;
    scene.add(pointLight);
    scene.add(new THREE.PointLightHelper(pointLight, 5));
    // directional light
    let dLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dLight.position.set(0, 500, 0);
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
    var ambientLight = new THREE.AmbientLight(0xaaaaaa);
    scene.add(ambientLight);
    /////////////////////////////////////////////////////////////////
    terrain = createTerrain();
    terrain.class = "terrain";
    scene.add(terrain);
    pickables.push(terrain);
    /////////////////////////////////////////////////////////////////
    kd = new THREE.Vector3(163, 113, 5).multiplyScalar(1 / 255);
    byab = {
        blue: 0.4,
        yellow: 0.4,
        alpha: 0.2,
        beta: 0.6
    }
    /////////////////////////////////////////////////////////////////
    raycaster = new THREE.Raycaster();
    document.getElementById("canvas").addEventListener('mousedown', onDocumentMouseDown, false);
    document.getElementById("canvas").addEventListener('mousemove', onDocumentMouseMove, false);
    document.getElementById("canvas").addEventListener('mouseup', onDocumentMouseUp, false);

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

function createTerrain() {
    //演算法來源：http://www.stephanbaker.com/post/perlinterrain/
    //影片：https://www.youtube.com/watch?v=Or19ilef4wE&t=198s
    let map = new THREE.TextureLoader().load('vendor/textures/grasslight.jpg');
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(20, 20);
    var geometry = new THREE.PlaneBufferGeometry(800, 800, 256, 256);
    var terrainMaterial = new THREE.MeshLambertMaterial({ map: map });
    let terrain = new THREE.Mesh(geometry, terrainMaterial);
    terrain.rotation.x = -Math.PI / 2;
    //峰值
    var peak = 50;
    //平滑化
    var smoothing = 180;
    var vertices = terrain.geometry.attributes.position.array;
    for (var i = 0; i <= vertices.length; i += 3) {
        vertices[i + 2] = peak * perlin.noise(
            (vertices[i]) / smoothing,
            (vertices[i + 1]) / smoothing
        );
    }
    terrain.geometry.computeVertexNormals();
    return terrain;
}

function animate() {
    turnPointLight(200, 100, 0.01);
    teapotAnimate();
    render();
}

function turnPointLight(radius, height, speed) {
    pointLight.position.set(radius * Math.cos(pointLight.angle), height, radius * Math.sin(pointLight.angle));
    pointLight.angle += speed;
}

function teapotAnimate() {
    let groundShadow = camera.position.clone();
    groundShadow.y = 0;
    ///////////////////////
    //取得目前的時間差，看每個得夠要轉多少角度
    let delta = clock.getDelta();
    teapots.forEach(function (obj, index) {
        //做旋轉與減少生命的動作
        obj.activeTeapot(delta, pointLight);
        obj.lifeText.lookAt(groundShadow);
        if (obj.deadTest()) {
            //從場景中移除物件
            scene.remove(obj.lifeText);
            scene.remove(obj.mesh);
            //從陣列中移除物件
            teapots.splice(index, 1);
            //從pickalbes移除得夠
            pickables.forEach(function (pickObj, index) {
                if (pickObj === obj.mesh) {
                    pickables.splice(index, 1);
                }
            });
            MyTeaPot.count--;
            $('#survive').text(MyTeaPot.count);
        }
    })
}

function render() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

//抓來用...
function onDocumentMouseUp(event) {
    // PICKING DETAILS: 
    // convert mouse.xy = [-1,1]^2 (NDC)
    // unproject (mouse.xy, 1) to a point on the far plane (in world coordinate)
    // set raycaster (origin, direction)
    // find intersection objects, (closest first) 
    // each record as
    // [ { distance, point, face, faceIndex, object }, ... ]

    event.preventDefault();

    //檢查是否只是轉動場景
    let wasDragging = isDragging;
    isDragging = false;
    //如果是單純點下去才繼續執行
    if (wasDragging) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // find intersections
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
        let picked = intersects[0];
        if (picked.object.class == "terrain") {
            //////////////////////////////
            let obj = picked.object;
            poi.copy(picked.point);
            //法線向量(單位向量)
            n.copy(picked.face.normal);
            n.transformDirection(terrain.matrixWorld);
            la.copy(poi).add(n);
            let shader = $('#shader').val();
            let newTeaPot = new MyTeaPot(poi, createNewShader(shader));
            newTeaPot.mesh.lookAt(la);
            //////////////////////////////
            teapots.push(newTeaPot);
            pickables.push(newTeaPot.mesh);
            scene.add(newTeaPot.mesh);
            scene.add(newTeaPot.lifeText);
            newTeaPot.lifeText.position.set(poi.x, poi.y + 30, poi.z);
            $('#survive').text(MyTeaPot.count);
        } else {
            //沒有點到山脈就是點到茶壺
            //這邊的object就是茶壺本身
            picked.object.life = 1;
        }
    }
}

//這個也抓來直接用...
function onDocumentMouseMove(event) {
    event.preventDefault();  // may not be necessary
    isDragging = true;
    mouse.x = (event.clientX / width) * 2 - 1;
    mouse.y = -(event.clientY / height) * 2 + 1;

    // find intersections
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pickables, true);
    if (intersects.length > 0) {
        document.body.style.cursor = 'pointer';
    }
    else {
        document.body.style.cursor = 'auto';
    }
}

function onDocumentMouseDown(event) {
    isDragging = false;
}

function loadCubemap(path, folderName) {
    var path = path + "/" + folderName + "/";
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

function createNewShader(type) {
    let material;
    switch (type) {
        case "cartoon":
            //cartoonShader
            material = new THREE.ShaderMaterial({
                uniforms: {
                    lightpos: { type: 'v3', value: new THREE.Vector3(0, 30, 20) },
                    shading: { type: 'i', value: 1 },
                    coordinate: { type: 'i', value: 0 },
                    opacity: { type: 'f', value: 1.0 }
                },
                vertexShader: vs_toon,
                fragmentShader: fs_toon,
                transparent: true // important!
            });
            material.lightNeed = true;
            break;
        case "matcap":
            let loader = new THREE.TextureLoader();
            let matcapTex = loader.load('vendor/textures/matcap.jpg');
            //matcapShader
            material = new THREE.ShaderMaterial({
                uniforms: {
                    tMatCap: { type: 't', value: matcapTex },
                    opacity: { type: 'f', value: 1.0 }
                },
                vertexShader: vs_sem,
                fragmentShader: fs_sem,
                flatShading: THREE.SmoothShading,
                transparent: true // important!
            });
            material.lightNeed = false;
            break;
        case "gooch":
            let kblue = new THREE.Vector3(0, 0, byab.blue);
            let kyellow = new THREE.Vector3(byab.yellow, byab.yellow, 0);
            let kcool = kd.clone().multiplyScalar(byab.alpha).add(kblue);
            let kwarm = kd.clone().multiplyScalar(byab.beta).add(kyellow);
            material = new THREE.ShaderMaterial({
                uniforms: {
                    lightpos: { type: 'v3', value: new THREE.Vector3() },
                    kcool: { type: 'v3', value: kcool },
                    kwarm: { type: 'v3', value: kwarm },
                    opacity: { type: 'f', value: 1.0 }
                },
                vertexShader: vs_gooch,
                fragmentShader: fs_gooch,
                transparent: true // important!
            });
            material.lightNeed = true;
    }
    return material;
}
export { init, animate }