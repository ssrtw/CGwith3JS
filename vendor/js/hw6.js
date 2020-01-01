import { unitize } from './vendor.js';
import { MMDAnimationHelper } from './MMDAnimationHelper.js';

var miku, mikuPoseHelper, mikuObj;

function onProgress(xhr) {
    if (xhr.lengthComputable) {
        var percentComplete = xhr.loaded / xhr.total * 100;
        console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
}

function loadMiku(scene) {
    mikuPoseHelper = new MMDAnimationHelper();
    var modelFile = "./vendor/models/miku/miku.pmx",
        vpdFile = "./vendor/models/miku/pose.vpd";
    var loader = new THREE.MMDLoader();
    loader.load(modelFile, function(object) {
        mikuObj = object;
        miku = unitize(object, 80);
        //head(6,67.3,18.3);nose(10.5,67.3,17.3)
        //左目
        //object.children[1].children[0].children[0].children[0].children[0].children[0].children[0].children[0].children[2]
        miku.position.set(15, 0, 20);
        miku.rotation.y = Math.PI / 2;
        scene.add(miku);
        loader.loadVPD(vpdFile, false, function(vpd) {
            mikuPoseHelper.pose(object, vpd);
        }, onProgress, null);
    }, onProgress, null);
}

function createDesk() {
    //https://wallpapersafari.com/w/Khy9xa
    let texture = new THREE.TextureLoader().load('vendor/textures/desk.jpg');
    let desk = new THREE.Object3D;
    let desktopmaterial = new THREE.MeshLambertMaterial({
        map: texture
    });
    let cylinderMaterial = new THREE.MeshLambertMaterial({
        color: 0x664200
    });
    let desktop = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 60), desktopmaterial);
    desktop.position.y = 40;
    let c1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 30), cylinderMaterial);
    let c2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 30), cylinderMaterial);
    let c3 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 30), cylinderMaterial);
    let c4 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 30), cylinderMaterial);
    c1.position.set(35, 20, 25);
    c2.position.set(35, 20, -25);
    c3.position.set(-35, 20, -25);
    c4.position.set(-35, 20, 25);
    desk.add(desktop, c1, c2, c3, c4);
    desk.traverse(function(obj) {
        obj.castShadow = true;
        obj.receiveShadow = true;
    });
    return desk;
}

function createWall(rotation, width = 300, height = 200) {
    let wall = new THREE.Mesh(
        new THREE.BoxGeometry(2, height, width),
        new THREE.MeshLambertMaterial({
            polygonOffset: true,
            polygonOffsetFactor: 0.1,
            color: 'beige'
        })
    );
    wall.position.y = height / 2;
    if (rotation) {
        wall.rotation.y = Math.PI / 2;

    }
    wall.receiveShadow = true;
    return wall;
}

function createPenBox() {
    let penBox = new THREE.Object3D();
    let texture = new THREE.TextureLoader().load('vendor/textures/woodcutout.png')
    let material = new THREE.MeshPhongMaterial({ side: THREE.DoubleSide, map: texture, alphaTest: 0.5 });
    let f1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 8, 6.05), material);
    let f2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 8, 6.05), material);
    let f3 = new THREE.Mesh(new THREE.BoxGeometry(6.05, 8, 0.05), material);
    let f4 = new THREE.Mesh(new THREE.BoxGeometry(6.05, 8, 0.05), material);
    let f5 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 6), material);
    f1.position.set(3, 4, 0);
    f2.position.set(-3, 4, 0);
    f3.position.set(0, 4, 3);
    f4.position.set(0, 4, -3);
    penBox.add(f1, f2, f3, f4, f5);
    penBox.traverse(function(obj) {
        obj.castShadow = true;
        obj.receiveShadow = true;
    });
    return penBox;
}

function createFace(one, two, three, index = 0) {
    let face = new THREE.Face3(one, two, three);
    face.materialIndex = index;
    return face;
}

function createTextureMaterial(map, alphaTest = 1) {
    //用Lambert，新鮮屋弄上油墨，不太反光ㄉ
    let material = new THREE.MeshLambertMaterial({
        map: map,
        alphaTest: alphaTest
    });
    return material;
}

function buildModel() {
    let geometry = new THREE.Geometry();
    //斜邊高度
    let sq375 = Math.sqrt(3.75);

    //放入頂點
    geometry.vertices.push(new THREE.Vector3(-3.5, 0, 3.5));
    geometry.vertices.push(new THREE.Vector3(3.5, 0, 3.5));
    geometry.vertices.push(new THREE.Vector3(3.5, 10.5, 3.5));
    geometry.vertices.push(new THREE.Vector3(3.5, 10.5 + sq375, 0));
    geometry.vertices.push(new THREE.Vector3(-3.5, 10.5 + sq375, 0));
    geometry.vertices.push(new THREE.Vector3(-3.5, 10.5, 3.5));

    geometry.vertices.push(new THREE.Vector3(-3.5, 0, -3.5));
    geometry.vertices.push(new THREE.Vector3(3.5, 0, -3.5));
    geometry.vertices.push(new THREE.Vector3(3.5, 10.5, -3.5));
    geometry.vertices.push(new THREE.Vector3(-3.5, 10.5, -3.5));

    //中間一點讓兩邊可以上三角形做開喝飲料的位置
    geometry.vertices.push(new THREE.Vector3(0, 10.5 + sq375, 0));

    //最上面一條橫條黏膠的部分
    geometry.vertices.push(new THREE.Vector3(3.5, 10.5 + sq375 + 1.5, 0));
    geometry.vertices.push(new THREE.Vector3(-3.5, 10.5 + sq375 + 1.5, 0));

    //正面
    geometry.faces.push(createFace(0, 1, 2));
    geometry.faces.push(createFace(0, 2, 5));

    //背面
    geometry.faces.push(createFace(7, 6, 9));
    geometry.faces.push(createFace(7, 9, 8));

    //右面
    geometry.faces.push(createFace(1, 7, 8));
    geometry.faces.push(createFace(1, 8, 2));

    //左面
    geometry.faces.push(createFace(6, 0, 5));
    geometry.faces.push(createFace(6, 5, 9));

    //正面斜邊
    geometry.faces.push(createFace(5, 2, 3));
    geometry.faces.push(createFace(5, 3, 4));

    //背面斜邊
    geometry.faces.push(createFace(8, 9, 4));
    geometry.faces.push(createFace(8, 4, 3));

    //上面橫條
    geometry.faces.push(createFace(4, 3, 11));
    geometry.faces.push(createFace(4, 11, 12));
    //上面橫條後面
    geometry.faces.push(createFace(3, 4, 12));
    geometry.faces.push(createFace(3, 12, 11));

    /*----右面折進去的的三面，同一面----*/
    //靠前的背對的面
    geometry.faces.push(createFace(2, 10, 3));
    //中間的面
    geometry.faces.push(createFace(2, 8, 10));
    // //靠後的正對的面
    geometry.faces.push(createFace(8, 3, 10));

    /*----左面折進去的的三面，同一面----*/
    //靠後的正對的面
    geometry.faces.push(createFace(9, 10, 4));
    //中間的面
    geometry.faces.push(createFace(9, 5, 10));
    //靠前的背對的面
    geometry.faces.push(createFace(5, 4, 10));

    //底部
    geometry.faces.push(createFace(6, 7, 1));
    geometry.faces.push(createFace(6, 1, 0));

    //上材質
    //材質高度幾分之幾
    let h1 = 1035 / 1600; /*1035/1600 底部到斜邊*/
    let h2 = 1445 / 1600; /*1445/1600 斜邊到封條下*/
    let h3 = 7 / 16; /* 底下的正方形*/
    //正面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0.2, h1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.2, h1),
        new THREE.Vector2(0, h1)
    ]);
    //背面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, 0),
        new THREE.Vector2(0.6, 0),
        new THREE.Vector2(0.6, h1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, 0),
        new THREE.Vector2(0.6, h1),
        new THREE.Vector2(0.4, h1)
    ]);
    //右面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0.4, 0),
        new THREE.Vector2(0.4, h1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.2, 0),
        new THREE.Vector2(0.4, h1),
        new THREE.Vector2(0.2, h1)
    ]);
    //左面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.6, 0),
        new THREE.Vector2(0.8, 0),
        new THREE.Vector2(0.8, h1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.6, 0),
        new THREE.Vector2(0.8, h1),
        new THREE.Vector2(0.6, h1)
    ]);
    //正面斜邊
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, h1),
        new THREE.Vector2(0.2, h1),
        new THREE.Vector2(0.2, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, h1),
        new THREE.Vector2(0.2, h2),
        new THREE.Vector2(0, h2)
    ]);
    //背面斜邊
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, h1),
        new THREE.Vector2(0.6, h1),
        new THREE.Vector2(0.6, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, h1),
        new THREE.Vector2(0.6, h2),
        new THREE.Vector2(0.4, h2)
    ]);
    //上面橫條正面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, h2),
        new THREE.Vector2(0.2, h2),
        new THREE.Vector2(0.2, 1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0, h2),
        new THREE.Vector2(0.2, 1),
        new THREE.Vector2(0, 1)
    ]);
    //上面橫條後面
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, h2),
        new THREE.Vector2(0.6, h2),
        new THREE.Vector2(0.6, 1)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, h2),
        new THREE.Vector2(0.6, 1),
        new THREE.Vector2(0.4, 1)
    ]);
    //右邊內凹
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.2, h1),
        new THREE.Vector2(0.3, h2),
        new THREE.Vector2(0.2, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.2, h1),
        new THREE.Vector2(0.4, h1),
        new THREE.Vector2(0.3, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.4, h1),
        new THREE.Vector2(0.4, h2),
        new THREE.Vector2(0.3, h2)
    ]);
    //左邊內凹
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.6, h1),
        new THREE.Vector2(0.7, h2),
        new THREE.Vector2(0.6, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.6, h1),
        new THREE.Vector2(0.8, h1),
        new THREE.Vector2(0.7, h2)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.8, h1),
        new THREE.Vector2(0.8, h2),
        new THREE.Vector2(0.7, h2)
    ]);
    //底部
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.8, 0),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(1, h3)
    ]);
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2(0.8, 0),
        new THREE.Vector2(1, h3),
        new THREE.Vector2(0.8, h3)
    ]);
    //要先計算Face然後再計算頂點，這樣才能知道要光源要怎計算
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    let loader = new THREE.TextureLoader();
    loader.crossOrigin = '';
    let mergeTexture = loader.load('./vendor/textures/TryItTea/tryittea.png');
    let materialArray = [];
    materialArray.push(
        createTextureMaterial(mergeTexture, 0.5)
    );
    return new THREE.Mesh(geometry, materialArray);
}

export { loadMiku, createDesk, createPenBox, createWall, buildModel, miku, mikuPoseHelper, mikuObj }