import { readModel, unitize, onProgress } from './vendor.js';
import { createDesk, createWall, createPenBox, buildModel } from './roomObj.js';
import * as Shader from './shaderHw6.js';
import { MMDAnimationHelper } from 'https://cdn.jsdelivr.net/npm/three@0.113.0/examples/jsm/animation/MMDAnimationHelper.js';

//載入時先有一個物件比較有FU
var sceneLoad, cameraLoad, loadCube, loadCubeMat, loadCnt = 0, countText;

//必要全域變數
//場景有三個，灰色的、影像處理的與彩色的
var sceneGrey, scene0, sceneColor;
//攝影機有兩台，一台照實際場景，另一台只照上了tenderTarget的板子
var camera, camera0, renderer;

//茶壺用
var teapot, teapotClone, planeXX;
//1
var scene1, camera1;
//RTT
var sceneRTT, cameraRTT, material_shh, renderTarget1;
//regular
var sceneRegular, renderTarget_whole;

//海報用
var shaderMaterialNormal;
var texSwapRenderTarget, sceneTexSwap, cameraTexSwap, which = 0;
var sceneSobel, sobelRenderTarget, cameraSobel;
var fWidth = 150, fHeight = 170;
//point light
var pLight, pAngle = 0, r = 1;

//miku
var renderTargetMosaic, sceneMosaic, materialMosaic, cameraMosaic;

//招牌
var sign, clock;

//歐逼康輟
var controls;
//拿去上材質用
var renderTarget;
//視窗大小
var width = window.innerWidth;// * 0.9;
var height = window.innerHeight;// * 0.9;
//檢查load狀態
var loadFinish = false;
var objNameList = [];
var teapot;

var miku, mikuPoseHelper, mikuObj;

function loadMiku(scene) {
    mikuPoseHelper = new MMDAnimationHelper();
    var modelFile = "./vendor/models/miku/miku.pmx",
        vpdFile = "./vendor/models/miku/pose.vpd";
    var loader = new THREE.MMDLoader();
    loader.load(modelFile, function (object) {
        mikuObj = object;
        miku = unitize(object, 80);
        //head(6,67.3,18.3);nose(10.5,67.3,17.3)
        //左目
        //object.children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[2]
        miku.position.set(15, 0, 20);
        miku.rotation.y = Math.PI / 2;
        scene.add(miku);
        loader.loadVPD(vpdFile, false, function (vpd) {
            mikuPoseHelper.pose(object, vpd);
        }, onProgress, null);
    }, onProgress, null);
}

var debug = false;
//載入時先有一個物件比較有FU
var sceneLoad, cameraLoad, loadCube, loadCubeMat, loadCnt = 0, countText;

//必要全域變數
//場景有三個，灰色的、影像處理的與彩色的
var sceneGrey, scene0, sceneColor;
//攝影機有兩台，一台照實際場景，另一台只照上了tenderTarget的板子
var camera, camera0, renderer;

//茶壺用
var teapot, teapotClone, planeXX;
//1
var scene1, camera1;
//RTT
var sceneRTT, cameraRTT, material_shh, renderTarget1;
//regular
var sceneRegular, renderTarget_whole;

//海報用
var shaderMaterialNormal;
var texSwapRenderTarget, sceneTexSwap, cameraTexSwap, which = 0;
var sceneSobel, sobelRenderTarget, cameraSobel;
var fWidth = 150, fHeight = 170;
//point light
var pLight, pAngle = 0, r = 1;

//miku
var renderTargetMosaic, sceneMosaic, materialMosaic, cameraMosaic;

//招牌
var sign, clock;

//歐逼康輟
var controls;
//拿去上材質用
var renderTarget;
//視窗大小
var width = window.innerWidth;// * 0.9;
var height = window.innerHeight;// * 0.9;
//檢查load狀態
var loadFinish = false;
var objNameList = [];
var teapot;

function init() {
    sceneGrey = new THREE.Scene();
    $("#canvas").width(width);
    $("#canvas").height(height);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor('black');
    //陰影
    renderer.shadowMap.enabled = true;
    //2=PCFSoftShadowMap
    renderer.shadowMap.type = 2;
    $('#canvas').append(renderer.domElement);
    camera = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000
    );
    camera.position.set(0, 115, -70);

    sceneLoadInit();

    ////////////////////////////////////////////////////////////////////////
    sceneTexSwapInit();
    sceneSobelInit();
    paintingInit();
    ////////////////////////////////////////////////////////////////////////

    scene1Init();
    sceneRTTInit();
    sceneRegularInit();

    sceneGreyInit();
    scene0Init();
    seneColorInit();

    sceneMosaicInit();
    //歐逼康啜
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    window.controls = controls;
    controls.target = new THREE.Vector3(0, 60, 0);
    camera.lookAt(new THREE.Vector3(0, 60, 0));
    // 禁用方向鍵調整歐逼康輟位置
    controls.enableKeys = false;

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

function sceneLoadInit() {
    sceneLoad = new THREE.Scene();
    cameraLoad = new THREE.PerspectiveCamera(
        80,
        width / height,
        1,
        1000
    );
    cameraLoad.position.set(0, 0, 50);
    loadCubeMat = new THREE.MeshPhongMaterial({
        color: 'white'
    });
    loadCube = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), loadCubeMat);
    let loadPlight = new THREE.PointLight(0xffffff);
    loadPlight.position.set(10, 10, 10);
    //載入數量顯示
    var Text2D = THREE_Text.MeshText2D;
    var textAlign = THREE_Text.textAlign;
    countText = new Text2D(loadCnt + " / " + objNameList.length, {
        align: textAlign.center,
        font: '15px 微軟正黑體',
        fillStyle: '#ffffff',
        antialias: true,
        opacity: 1,
    });
    countText.position.set(0, -15, 0);
    countText.scale.set(0.5, 0.5, 0.5);
    sceneLoad.add(loadPlight, loadCube, countText);
}

function sceneTexSwapInit() {
    texSwapRenderTarget = new THREE.WebGLRenderTarget(fWidth, fHeight);
    sceneTexSwap = new THREE.Scene();
    //照比例顯示圖片的大小
    cameraTexSwap = new THREE.OrthographicCamera(fWidth / -2, fWidth / 2, fHeight / 2, fHeight / -2, -10, 100);
    var uniforms = {
        texture: {
            type: 't',
            value: null
        },
        which: {
            type: 'i',
            value: 0
        }
    };

    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: Shader.vs_texSwap,
        fragmentShader: Shader.fs_texSwap
    });
    // to get texture image size:
    // https://stackoverflow.com/questions/49111431/how-to-get-texture-dimensions-with-three-js

    let loader = new THREE.TextureLoader();
    loader.crossOrigin = '';
    let myface = './vendor/textures/myface.png';
    let texture = loader.load(myface, function (tex) {
        texture.wrapS = THREE.RepeatWrapping;
        console.log(tex.image.width + ', ' + tex.image.height);
        shaderMaterial.uniforms.texture.value = tex;
    });

    let plane = new THREE.Mesh(new THREE.PlaneGeometry(150, 170), shaderMaterial);
    sceneTexSwap.add(plane);

    function incWhich() {
        which += 1;
        shaderMaterial.uniforms.which.value = which;
        setTimeout(incWhich, 500);
    }
    setTimeout(incWhich, 0);
}

function sceneSobelInit() {
    sceneSobel = new THREE.Scene();
    //照比例顯示圖片的大小
    cameraSobel = new THREE.OrthographicCamera(fWidth / -2, fWidth / 2, fHeight / 2, fHeight / -2, -10, 100);

    var uniforms = {
        imageSize: {
            type: 'v2',
            value: new THREE.Vector2(256, 256)
        },
        texture: {
            type: 't',
            value: texSwapRenderTarget.texture
        },
    };

    let material_shader = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: Shader.vs_sobel,
        fragmentShader: Shader.fs_sobel,
        side: THREE.DoubleSide
    });

    var geometry = new THREE.PlaneGeometry(fWidth, fHeight);
    var mesh = new THREE.Mesh(geometry, material_shader);
    sceneSobel.add(mesh)
    sobelRenderTarget = new THREE.WebGLRenderTarget(fWidth, fHeight);
}

function sceneGreyInit() {
    //讓海報有光源做變化
    pLight = new THREE.PointLight(0xffffff, 0.8, 100);
    sceneGrey.add(pLight);
    var pointLightHelper = new THREE.PointLightHelper(pLight, 1);
    sceneGrey.add(pointLightHelper);
    //環境光源
    let aLight = new THREE.AmbientLight(0xffffff, 0.8);
    sceneGrey.add(aLight);

    //純喫茶
    let tryittea = buildModel();
    tryittea.castShadow = true;
    tryittea.receiveShadow = true;
    tryittea.position.set(-115, 41, 65);
    tryittea.rotation.y = -Math.PI / 6;
    sceneGrey.add(tryittea);
    if (!debug) {
        //讀取 MacBookPro
        readModel("mpm_f21__Apple_MacBook_Pro_15", 'MacBookPro', 30, sceneGrey);
        objNameList.push('MacBookPro');

        //讀取椅子
        readModel("Chair", 'Chair', 55, sceneGrey);
        objNameList.push('Chair');

        //讀取床
        readModel("bed", 'bed', 110, sceneGrey, 'Y');
        objNameList.push('bed');

        /////////////////////////////////////////////

        //讀取檯燈
        readModel("Lamp", 'lamp', 30, sceneGrey, 'Z');
        objNameList.push('lamp');

        /////////////////////////////////////////////

        //讀取吊燈
        readModel("Brass_Freak", 'ceilLamp', 60, sceneGrey);
        objNameList.push('ceilLamp');
    }

    let dLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dLight.position.set(0, 100, 0);
    dLight.castShadow = true;
    dLight.shadow.camera.left = -280;
    dLight.shadow.camera.top = -260;
    dLight.shadow.camera.right = 280;
    dLight.shadow.camera.bottom = 200;
    dLight.shadow.camera.near = 1;
    dLight.shadow.camera.far = 400;
    dLight.target = sceneGrey;
    dLight.shadow.mapSize.width = dLight.shadow.mapSize.height = 1024;
    dLight.shadow.bias = -.01;
    sceneGrey.add(dLight);

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
    sceneGrey.add(plane);
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
        wall.receiveShadow = true;
        sceneGrey.add(wall);
    });
    //桌子
    let desk = createDesk();
    desk.position.set(-85, 0, 70);
    sceneGrey.add(desk);
    //天花板
    let ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(250, 2, 200),
        new THREE.MeshLambertMaterial({
            color: 'beige'
        })
    );
    ceiling.position.y = 201;
    sceneGrey.add(ceiling);

    //筆筒
    let penBox = new THREE.Object3D();
    readModel('Pen', 'pen', 10, penBox);
    readModel('Pen', 'pen1', 10, penBox, undefined, 'Pen1');
    objNameList.push('pen', 'pen1');
    let box = createPenBox();
    penBox.add(box);

    penBox.position.set(-110, 41, 85);
    sceneGrey.add(penBox);
}

function scene0Init() {
    scene0 = new THREE.Scene();

    //左 右 上 下 near far
    camera0 = new THREE.OrthographicCamera(0, width, height, 0, -10, 100);
    // full-size RT
    renderTarget = new THREE.WebGLRenderTarget(width, height);
    let greyPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.ShaderMaterial({
            uniforms: {
                imageSize: {
                    type: 'v2',
                    value: new THREE.Vector2(width, height)
                },
                texture: {
                    type: 't',
                    value: renderTarget.texture
                }
            },
            vertexShader: Shader.vs_default,
            fragmentShader: Shader.fs_mono,
            depthTest: false,  // no depth test
            depthWrite: false  // do not write depth buffer
        })
    );
    greyPlane.position.set(width / 2, height / 2, 0);
    scene0.add(greyPlane);
}

function seneColorInit() {
    sceneColor = new THREE.Scene();
    let alight = new THREE.AmbientLight(0xffffff);
    sceneColor.add(alight);
    let cutoutShaderMat = new THREE.ShaderMaterial({
        uniforms: {
            texture: { type: 't', value: renderTarget_whole.texture }
        },
        vertexShader: Shader.vs_default,
        fragmentShader: Shader.fs_Cut
    });
    //虛擬房間的招牌
    //茶壺
    planeXX = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), cutoutShaderMat);
    planeXX.position.set(-60, 47, 60);
    sceneColor.add(planeXX);
    loadMiku(sceneColor);
    //招牌相關
    clock = new THREE.Clock();
    createSign();
}

function scene1Init() {
    var material_shh_normal = new THREE.ShaderMaterial({
        vertexShader: Shader.vs_Normal,
        fragmentShader: Shader.fs_Normal
    });

    // scene1: contains a torusKnot with shaderMaterial (for outline)
    // camera1: ortho camera

    scene1 = new THREE.Scene();
    teapot = new THREE.Mesh(new THREE.TeapotBufferGeometry(5),
        material_shh_normal);
    scene1.add(teapot);
    camera1 = new THREE.OrthographicCamera(-20, 20, 20, -20, -200, 200);
}

function sceneRTTInit() {
    renderTarget1 = new THREE.WebGLRenderTarget(512, 512);

    var uniforms = {
        imageSize: {
            type: 'i',
            value: renderTarget1.width
        },
        texture: {
            type: 't',
            value: renderTarget1.texture
        }
    };

    material_shh = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: Shader.vs_default,
        fragmentShader: Shader.fs_Filter
    });

    // sceneRTT: 用plane做外框
    sceneRTT = new THREE.Scene();
    cameraRTT = new THREE.OrthographicCamera(-50, 50, 50, -50, -10, 10);
    var bs = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), material_shh);
    sceneRTT.add(bs);
}

function sceneRegularInit() {
    // 這裡放我要的彩色茶壺
    sceneRegular = new THREE.Scene();
    var geometry = new THREE.TeapotBufferGeometry(5);
    var material = new THREE.ShaderMaterial({
        uniforms: {
            lightpos: { type: 'v3', value: new THREE.Vector3() },
            shading: { type: 'i', value: 1 },
            coordinate: { type: 'i', value: 0 },
            uniColor: { type: 'v3', value: new THREE.Vector3(161, 37, 13).multiplyScalar(1 / 255) }
        },
        vertexShader: Shader.vs_toon,
        fragmentShader: Shader.fs_toon
    });
    teapotClone = teapot.clone();
    teapotClone.material = material;
    sceneRegular.add(teapotClone);

    teapotClone.material.uniforms.lightpos.value.set(-60, 100, 60);
    //////////////////////
    renderTarget_whole = new THREE.WebGLRenderTarget(512, 512);
}

function paintingInit() {
    //顯示在房間中的圖片大小，用15比17去算倍率
    var geometry = new THREE.PlaneBufferGeometry(30, 34);
    THREE.BufferGeometryUtils.computeTangents(geometry);

    var uniforms = {
        imageSize: {
            type: 'v2',
            value: 512
        },
        tNormal: {
            type: 't',
            value: sobelRenderTarget.texture
        },
        lightpos: {
            type: 'v3',
            value: new THREE.Vector3()
        }

    };

    shaderMaterialNormal = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: Shader.vs_normalmap,
        fragmentShader: Shader.fs_normalmap
    });
    let mesh = new THREE.Mesh(geometry, shaderMaterialNormal);
    sceneGrey.add(mesh);
    //貼牆的話是125，會切到所以往前拉
    mesh.position.set(-123, 60, -10);
    mesh.rotation.y = Math.PI / 2;
}

function sceneMosaicInit() {
    sceneMosaic = new THREE.Scene();
    renderTargetMosaic = new THREE.WebGLRenderTarget(width, height);//256,256); 
    var uniforms = {
        headNDC: {
            type: 'v2',
            value: null
        },
        headSize: {
            type: 'f',
            value: 0
        },
        texture: {
            type: 't',
            value: renderTargetMosaic.texture
        },
        gran: {
            type: 'f',
            value: 0
        },
        front: {
            type: 'b',
            value: false
        }
    };

    materialMosaic = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: Shader.vs_default,
        fragmentShader: Shader.fs_mosaic
    });
    //設為跟螢幕一樣大
    let mosaicPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), materialMosaic);
    //照mosaicPlane的
    cameraMosaic = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, -500, 1000);
    sceneMosaic.add(mosaicPlane);
}

function animate() {
    //原本是做loadingAnimate的動作
    loadingAnimate();
    requestAnimationFrame(animate);
}

function initPosition() {
    let MacBookPro = sceneGrey.getObjectByName('MacBookPro');
    MacBookPro.position.set(-90, 41, 60);
    MacBookPro.rotation.y = Math.PI / 2;
    let pen = sceneGrey.getObjectByName('pen');
    pen.position.set(0.5, 3, -0.5);
    pen.rotation.x = Math.PI / 7.5;
    let pen1 = sceneGrey.getObjectByName('pen1');
    pen1.position.set(-1.7, 3, 0.6);
    pen1.rotation.y = Math.PI * 3 / 2;
    pen1.rotation.z = Math.PI / 3.5
    let ceilLamp = sceneGrey.getObjectByName('ceilLamp');
    ceilLamp.position.y = 200;
    let deskLamp = sceneGrey.getObjectByName('lamp');
    deskLamp.position.set(-50, 41, 80);
    deskLamp.rotation.y = Math.PI * 3 / 4;
    let chair = sceneGrey.getObjectByName('Chair');
    chair.position.set(-90, 0, 40);
    chair.rotation.y = -Math.PI / 2;
    let bed = sceneGrey.getObjectByName('bed');
    bed.position.set(135, -0.5, 110.5);
    bed.rotation.y = Math.PI / 2;
}

function render() {
    paintingRender();
    //換去渲染plane的tex
    renderer.setRenderTarget(renderTarget);
    renderer.clear();
    //這次要上色，要讓板子能夠有畫面出來
    sceneGrey.traverse(function (obj) {
        if (obj instanceof THREE.Mesh) {
            if (obj.material instanceof Array) {
                obj.material.forEach(function (mat) {
                    mat.colorWrite = true;
                });
            } else {
                obj.material.colorWrite = true;
            }
        }
    });

    renderer.render(sceneGrey, camera);

    material_shh.uniforms.imageSize.value = 128;
    // this value can alter the width of silhouette !!
    // 1024: original width
    // 512, 256, 128, ...: wider silhouette

    // scene0: torusKnot with shaderMaterial (draw eyeNormal)
    renderer.setRenderTarget(renderTarget1);
    renderer.setClearColor(0x000000);
    renderer.render(scene1, camera1);  // produce eyeNormal plot of subject

    // sceneRTT: fullQuad + filter (discard "near black" fragments)
    renderer.setRenderTarget(renderTarget_whole);
    renderer.setClearColor(0x00ff00);  // yellow "magic" background ... to be cutout
    renderer.render(sceneRTT, cameraRTT);  // produce outline

    // overlay the lit torusKnot
    renderer.render(sceneRegular, camera1); // camera0: the same as eyeNormal plot

    ///////// final texture completed (except boundary removal)
    let pz = new THREE.Vector3(0, 0, 1);
    let py = new THREE.Vector3(0, 1, 0);
    let point = camera.position.clone().sub(planeXX.position).projectOnPlane(py);
    let angle = point.angleTo(pz);
    let test = new THREE.Vector3().crossVectors(pz, point);
    if (test.y > 0) {
        angle = -angle;
    }
    teapot.rotation.y = angle;
    teapotClone.rotation.y = angle;
    planeXX.lookAt(camera.position.x, 47, camera.position.z);

    //從渲染螢幕改為渲染成要處理馬賽克的RT
    renderer.setRenderTarget(renderTargetMosaic);
    //渲染板子出來
    renderer.render(scene0, camera0);

    //這次渲染只做depth test(只看z-buffer)
    sceneGrey.traverse(function (obj) {
        if (obj instanceof THREE.Mesh) {
            if (obj.material instanceof Array) {
                obj.material.forEach(function (mat) {
                    mat.colorWrite = false;
                });
            } else {
                obj.material.colorWrite = false;
            }
        }
    });
    renderer.render(sceneGrey, camera);

    renderer.render(sceneColor, camera);
    //再來去渲染螢幕
    renderer.setRenderTarget(null);
    renderer.render(sceneMosaic, cameraMosaic);

    //要清空原本的
    renderer.setRenderTarget(renderTarget1);
    renderer.clear();
    renderer.setRenderTarget(renderTarget_whole);
    renderer.clear();
    renderer.setRenderTarget(renderTargetMosaic);
    renderer.clear();
}

function paintingRender() {
    //先渲染切換的圖像
    renderer.setRenderTarget(texSwapRenderTarget);
    renderer.render(sceneTexSwap, cameraTexSwap);
    //再做成sobel的影像
    renderer.setRenderTarget(sobelRenderTarget);
    renderer.render(sceneSobel, cameraSobel);
}

function headCompute() {
    // compute headNDC
    //人頭正中心
    var headCenter = new THREE.Vector3(6, 68, 18.3);
    miku.localToWorld(headCenter);
    //頭頂，設一個高處
    var headTop = new THREE.Vector3(6, 73, 18.3);
    miku.localToWorld(headTop);
    //找到鼻子在物件中的位置
    //我原本找10.5,67.3,17.3
    //可是人頭比較往下看，所以要在往更前面找
    var noseTip = new THREE.Vector3(10.5, 68, 17.3);
    miku.localToWorld(noseTip);

    //找到頭中心點、鼻子和頭頂的gl_position
    headCenter.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    //頭的標準化設備座標(x,y)
    //要+1/2是因為NDC是從0~1，而headCenter原本是-1~1
    materialMosaic.uniforms.headNDC.value = new THREE.Vector2((headCenter.x + 1) / 2, (headCenter.y + 1) / 2);
    noseTip.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    headTop.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
    //往正z方向是越靠前，所以鼻子的z比頭中心的z近，則是看的到臉惹
    //上面這句話跟我的code有衝突QQ
    //更換條件，如果
    window.headCenter = headCenter;
    if (noseTip.z - headCenter.z < 0 && headCenter.z <= 1)
        materialMosaic.uniforms.front.value = true;
    else
        materialMosaic.uniforms.front.value = false;
    materialMosaic.uniforms.gran.value = 0.01;
    //除以2是為了座標轉換，距離剩一半，本來-1~1剩下0~1
    materialMosaic.uniforms.headSize.value = 1.2 * headTop.distanceTo(headCenter) / 2;
}

function createSign() {
    let tex = new THREE.TextureLoader().load('./vendor/textures/room_sign.png');
    let material = new THREE.ShaderMaterial({
        // side: THREE.DoubleSide,
        uniforms: {
            terms: {
                type: 'i',
                value: 5
            },
            time: {
                type: 'f',
                value: 1.0
            },
            scale: {
                type: 'v2',
                value: new THREE.Vector2(1, 1)
            },
            offset: {
                type: 'v2',
                value: new THREE.Vector2(0, 0)
            },
            mask: {
                type: 't',
                value: tex
            }
        },
        vertexShader: Shader.vs_perlin,
        fragmentShader: Shader.fs_perlin,
    });
    sign = new THREE.Mesh(new THREE.PlaneGeometry(100, 50), material);
    sign.position.set(-5, 120, 98);
    sign.rotation.y = Math.PI;
    sceneColor.add(sign);
}

function loadingAnimate() {
    let isOK = true, nowCnt = 0;
    objNameList.forEach(function (name, index) {
        if (sceneGrey.getObjectByName(name) === undefined) {
            isOK = false;
        } else {
            //計算obj已加載數量
            nowCnt++;
        }
    });
    //如果miku也沒有load進來
    if (mikuObj === undefined) isOK = false;

    renderer.render(sceneLoad, cameraLoad);
    loadCube.rotation.x += 0.1;
    loadCube.rotation.y -= 0.1;
    //如果有載入任何新物件，loadCube換個顏色
    if (loadCnt != nowCnt) {
        //有載入新的就隨機上色
        loadCubeMat.color = new THREE.Color(Math.random(), Math.random(), Math.random());
    }
    //更新已載入數量
    loadCnt = nowCnt;
    countText.text = loadCnt + " / " + objNameList.length;
    if (isOK) {
        //先把該做的初始化與放入FPS檢查做完
        //如果debug模式不用管位置
        if (!debug) initPosition();
        //不自動清除畫面
        renderer.autoClear = false;
        window.miku = miku;

        //做完所有初始化之後，過了一秒開始做場景animate
        setTimeout(function () {
            //改寫animate函數，減少每次更新畫面的判斷
            animate = function () {
                //用於perlin noise算時間差
                var delta = clock.getDelta();
                sign.material.uniforms.time.value += delta / 15;
                headCompute();
                render();
                requestAnimationFrame(animate);
                if (Math.abs(pAngle) > Math.PI / 2) r = -r;
                pAngle += 0.01 * r;
                let v3 = new THREE.Vector3(-123 + Math.cos(pAngle) * 20, 60, -10 + Math.sin(pAngle) * 20);
                pLight.position.copy(v3);
                shaderMaterialNormal.uniforms.lightpos.value.copy(v3);
            }
        }, 1000);
    }
}
export { init, animate }