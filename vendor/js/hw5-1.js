import { myVertexShader, myFragmentShader } from './shaderHw5.js';

$('#coords').change(function () {
    console.log($(this).val());
    let objType = $(this).val();
    if (objType === 'obj') {
        teapotMaterial.uniforms.coordinate.value = 0;
    } else if (objType === 'world') {
        teapotMaterial.uniforms.coordinate.value = 1;
    } else if (objType === 'eye') {
        teapotMaterial.uniforms.coordinate.value = 2;
    }
});

$('#shading').change(function () {
    console.log($(this).val());
    let objType = $(this).val();
    if (objType === 'perVertex') {
        teapotMaterial.uniforms.shading.value = 0;
    } else if (objType === 'perPixel') {
        teapotMaterial.uniforms.shading.value = 1;
    }
});

var scene, renderer, camera;
var movingTeapot;
var angle = 0;
var teapotMaterial;

function init() {
    var width = window.innerWidth;
    var height = window.innerHeight;

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(width, height);
    renderer.setClearColor(0x888888);
    $('#canvas').append(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 50, 200);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    let controls = new THREE.OrbitControls(camera, renderer.domElement);

    var gridXZ = new THREE.GridHelper(200, 20, 'red', 'white');
    scene.add(gridXZ);

    let pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(200, 300, 200);
    scene.add(pointLight);
    var ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);
    /////////////////////////////////////////////////////////////////
    teapotMaterial = new THREE.ShaderMaterial({
        uniforms: {
            lightpos: { type: 'v3', value: new THREE.Vector3(0, 30, 20) },
            shading: { type: 'i', value: 0 },
            coordinate: { type: 'i', value: 0 },
        },
        vertexShader: myVertexShader,
        fragmentShader: myFragmentShader
    });

    movingTeapot = new THREE.Mesh(new THREE.TeapotBufferGeometry(10), teapotMaterial);
    let staticTeapot = new THREE.Mesh(
        new THREE.TeapotBufferGeometry(10),
        new THREE.MeshPhongMaterial({
            color: 0x333333
        })
    );
    scene.add(movingTeapot, staticTeapot);
}
function animate() {
    angle += 0.01;
    // update the uniform variable
    if (movingTeapot !== undefined) {
        movingTeapot.position.set(70 * Math.cos(angle), 0, 70 * Math.sin(angle));
    }
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

export { init, animate }