function onProgress(xhr) {
    if (xhr.lengthComputable) {
        var percentComplete = xhr.loaded / xhr.total * 100;
        console.log(Math.round(percentComplete, 2) + '% downloaded');
    }
}

function readModel(modelName, objName = 'OBJ', targetSize = 40, parent, turn = undefined, mtlName = undefined) {
    var onError = function(xhr) {};

    var mtlLoader = new THREE.MTLLoader();

    let mtl = modelName;
    if (mtlName !== undefined) {
        mtl = mtlName;
    }
    mtlLoader.setPath('vendor/models/' + modelName + '/');
    mtlLoader.load(mtl + '.mtl', function(materials) {

        materials.preload();

        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('vendor/models/' + modelName + '/');
        objLoader.load(modelName + '.obj', function(object) {
            console.log("model name:" + modelName);
            let theObject = unitize(object, targetSize);
            // theObject.add(new THREE.BoxHelper(theObject));
            theObject.name = objName;
            theObject.traverse(function(object) {
                    if (object instanceof THREE.Mesh) {
                        object.castShadow = true
                        object.receiveShadow = true
                    }
                })
                //把這個model放入父層
            parent.add(theObject);
            //不須改變軸的方向
            if (turn !== undefined) {
                if (turn.toUpperCase() == 'X') {
                    theObject.setRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
                    console.log("----" + modelName + ' to turn ' + turn);
                } else if (turn.toUpperCase() == 'Y') {
                    theObject.setRotationFromEuler(new THREE.Euler(0, Math.PI / 2, 0))
                    console.log("----" + modelName + ' to turn ' + turn);
                } else if (turn.toUpperCase() == 'Z') {
                    theObject.setRotationFromEuler(new THREE.Euler(0, 0, Math.PI / 2))
                    console.log("----" + modelName + ' to turn ' + turn);
                }
            }
        }, onProgress, onError);

    });
}

////////////////////////////////////////
// wrap an Object3D around the given object
// so that it is centered at +Y axis
//
function unitize(object, targetSize) {

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

export { unitize, readModel };