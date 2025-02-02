//場景、渲染器、相機
var scene, renderer, camera;
//指針,背板,扇形,轉動軸
var secHand, backplane, circle, bearing;
//啟動前一次的時間點
var preTime = Date.now();
//紀錄上次暫停時的角度
var preAngle = 0;
//鍵盤事件
var keyboard = new KeyboardState();
/*
    是否要轉動；
    選擇用什麼方式運作,0是連續,1是跳動；
    計算方式,0是時間,1是FPS；
    扇形或指針,0扇形,1指針；
    變成一個現實中的時鐘；
*/
var isTurn = false, mode = 0, calc = 0, style = 0, clock = false;

//時鐘所需物件：分針 時針
var minHand, hrHand;

//扇形角度
var circleAngle = Math.PI / 2;

function init() {
    scene = new THREE.Scene();

    // var width = window.innerWidth;
    // var height = window.innerHeight;
    var width = 600;
    var height = 450;
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(width, height);
    renderer.setClearColor('darkgray');
    $("#canvas").append(renderer.domElement);

    camera = new THREE.PerspectiveCamera(
        50,
        width / height,
        10,
        1000
    );
    //看著場景的中心點(0,0,0)
    camera.lookAt(scene.position);
    //擺放位置
    camera.position.set(0, 0, 50);

    //背板
    backplane = new THREE.Mesh(new THREE.CircleGeometry(20, 64),
        new THREE.MeshBasicMaterial({
            color: 0xDADDDD
        }));
    scene.add(backplane);

    //做個轉動軸
    bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 48),
        new THREE.MeshBasicMaterial({
            color: 0x000000
        }));
    bearing.rotation.x += Math.PI / 2;
    //旋轉之後還是Z軸朝前面?
    bearing.position.z = 3;
    scene.add(bearing);

    /*---------------秒針開始---------------*/
    //完整指針
    secHand = new THREE.Group();
    //指針柄
    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12, 0.5),
        new THREE.MeshBasicMaterial({
            color: "gray"
        }));
    handle.position.set(0, 5, 0.5);
    secHand.add(handle);
    //箭頭
    var arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 5, 64),
        new THREE.MeshBasicMaterial({
            color: 0x727D82
        }));
    //10+2.5
    arrow.position.set(0, 12.5, 0.5);
    //指針箭頭
    secHand.add(arrow);

    //放入秒針
    scene.add(secHand);
    /*---------------秒針結束---------------*/
    /*---------------分針開始---------------*/
    //完整指針
    minHand = new THREE.Group();
    //指針柄
    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, 0.5),
        new THREE.MeshBasicMaterial({
            color: 0x789DA8
        }));
    handle.position.set(0, 6, 1);
    minHand.add(handle);

    //放入分針
    scene.add(minHand);
    /*---------------分針結束---------------*/
    /*---------------時針開始---------------*/
    //完整指針
    hrHand = new THREE.Group();
    //指針柄
    var handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 0.5),
        new THREE.MeshBasicMaterial({
            color: 0x15737D
        }));
    handle.position.set(0, 3, 1.5);
    hrHand.add(handle);

    //放入時針
    scene.add(hrHand);
    /*---------------時針結束---------------*/

    //先不顯示背板、三根針跟轉動軸
    bearing.visible = false;
    backplane.visible = false;
    secHand.visible = false;
    minHand.visible = false;
    hrHand.visible = false;

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
    //渲染畫面
    renderer.render(scene, camera);
    //時鐘模式
    if (clock) {
        runClock();
    }
    //一般模式
    else {
        //鍵盤事件
        //一般模式下才讓Z鍵發揮作用
        keyboard.update();
        if (keyboard.down("Z")) {
            if (!isTurn) {
                $("#turnbtn").text("暫停");
                //恢復轉動時，要將目前的時間當作起點時間
                preTime = Date.now();
            } else {
                $("#turnbtn").text("轉動");
            }
            isTurn = !isTurn;
        }
        if (isTurn) {
            //style 0 是扇形，1 是指針
            if (style) {
                //模式
                if (mode) {
                    jump();
                } else {
                    turn();
                }
            } else {
                //模式
                if (mode) {
                    //跳動
                    jumpCircle();
                } else {
                    //轉動
                    turnCircle();
                }
            }
        }
    }
    requestAnimationFrame(animate);
}

function runClock() {
    var now = new Date();
    var sec = now.getSeconds();
    var min = now.getMinutes();
    var hr = now.getHours();
    //秒針旋轉角度 now/60(sec)=x/(2*PI)
    secHand.rotation.z = -(sec / 60 * Math.PI * 2);
    //分針旋轉角度 now/60(min)=x/(2*PI)
    minHand.rotation.z = -(min / 60 * Math.PI * 2);
    //時針旋轉角度 now/60(min)=x/(2*PI)
    /*
        一小時時針會走(1/6)*PI,一小時60分鐘,每分鐘會讓時針多走0.5度也就是(1/360)*PI
        所以當前分鐘*(1/360)*PI會是現在分鐘讓時針多走的角度
        
        或是分針當下旋轉角度/12好像也是時針所增加的角度
    */
    hrHand.rotation.z = -(hr / 12 * Math.PI * 2 + min * Math.PI / 360);
}

//扇形函式
/*
    circleAngle從PI/2的位置慢慢減少
    扇形的角度會是從circleAngle的位置往PI/2
    所以角度會是PI/2-circleAngle
*/
function turnCircle() {
    var now = Date.now();
    //每次要畫新的扇形就把舊的刪除掉
    scene.remove(circle);
    //計算模式
    //以FPS60做計算
    if (calc) {
        circleAngle -= Math.PI * 2 / 60 / 60;
    }
    //以時間差做計算
    else {
        circleAngle -= Math.PI * 2 / 60000 * (now - preTime);
        //每次計算完當前時間差，把preTime改到now
    }
    //當扇形轉滿一圈之後讓起始角度改回PI/2的位置重新跑
    if (circleAngle <= (-Math.PI * 3 / 2)) {
        circleAngle += Math.PI * 2;
    }
    circle = new THREE.Mesh(new THREE.CircleGeometry(20, 64, circleAngle, Math.PI / 2 - circleAngle),
        new THREE.MeshBasicMaterial({
            color: 0x727D82
        }));
    scene.add(circle);
    preTime = now;
}

function jumpCircle() {
    var now = Date.now();
    var difference = now - preTime;
    if (difference >= 1000) {
        //每次要畫新的扇形就把舊的刪除掉
        scene.remove(circle);
        //計算模式
        //以FPS60做計算
        if (calc) {
            circleAngle -= Math.PI * 2 / 60;
        }
        //以時間差做計算
        else {
            circleAngle -= Math.PI * 2 / 60000 * difference;
        }
        //當扇形轉滿一圈之後讓起始角度改回PI/2的位置重新跑
        if (circleAngle <= (-Math.PI * 3 / 2)) {
            circleAngle += Math.PI * 2;
        }
        circle = new THREE.Mesh(new THREE.CircleGeometry(20, 64, circleAngle, Math.PI / 2 - circleAngle),
            new THREE.MeshBasicMaterial({
                color: 0x727D82
            }));
        scene.add(circle);
        preTime = now;
    }
}

function jump() {
    var now = Date.now();
    var difference = now - preTime;
    //至少一秒過後才轉動(跳動)一次
    if (difference >= 1000) {
        //FPS運算直接2PI/60(秒)
        if (calc) {
            var angle = Math.PI * 2 / 60;
        }
        //每幀的時間差算出角度
        else {
            var angle = Math.PI * 2 / 60000 * difference - preAngle;
        }
        secHand.rotation.z -= angle;
        preTime = now;
    }
}

function turn() {
    var now = Date.now();
    //2PI/60秒/FPS60
    //Math.PI * 2 / 60 / 60
    if (calc) {
        var angle = Math.PI * 2 / 60 / 60;
    }
    //時間差做角度計算
    //1min=1*60sec=60*1000ms=60000ms
    //   PI*2          目前要轉的角度
    //----------  =  -----------------
    // 60000毫秒      每次animate時間差
    else {
        var difference = now - preTime;
        //補上preAngle的角度才吻合暫停後再開始的樣子
        var angle = Math.PI * 2 / 60000 * (difference) - preAngle;
    }
    secHand.rotation.z -= angle;
    preTime = now;
}

//這邊如同按下Z鍵一樣的做法
$("#turnbtn").click(function () {
    if (!isTurn) {
        $("#turnbtn").text("暫停");
        //恢復轉動時，要將目前的時間當作起點時間
        preTime = Date.now();
    } else {
        $("#turnbtn").text("轉動");
    }
    isTurn = !isTurn;
});

$("#modebtn").click(function () {
    //改成跳動
    if (mode == 0) {
        $("#modebtn").text("連續");
        mode = 1;
    }
    //改成連續
    else {
        $("#modebtn").text("跳動");
        mode = 0;
    }
});

$("#calcbtn").click(function () {
    //改成跳動
    if (calc == 0) {
        $("#calcbtn").text("時間運算");
        calc = 1;
    }
    //改成連續
    else {
        $("#calcbtn").text("60FPS運算");
        calc = 0;
    }
});

$("#stylebtn").click(function () {
    //指針轉扇形
    if (style) {
        $("#stylebtn").text("指針");
        style = 0;
        //把轉動軸、背板與指針隱藏
        bearing.visible = false;
        backplane.visible = false;
        secHand.visible = false;
        //歸零
        circleAngle = Math.PI / 2;
    }
    //扇形轉指針
    else {
        $("#stylebtn").text("扇形");
        style = 1;
        //需要remove circle以免跟backplane重疊
        scene.remove(circle);
        //把轉動軸、背板與指針顯示
        bearing.visible = true;
        backplane.visible = true;
        secHand.visible = true;
        //歸零
        secHand.rotation.z = 0;
        preTime = Date.now();
        preAngle = 0;
    }
});

$("#clockbtn").click(function () {
    //改回一般模式
    if (clock) {
        $("#turnbtn").prop("disabled", false);
        $("#modebtn").prop("disabled", false);
        $("#calcbtn").prop("disabled", false);
        $("#stylebtn").prop("disabled", false);
        //如果是指針模式，只隱藏，不隱藏背板、秒針和轉動軸
        if (style) {
            minHand.visible = false;
            hrHand.visible = false;
        }
        //在扇形模式就把針、背板和轉動軸都隱藏
        else {
            minHand.visible = false;
            hrHand.visible = false;
            backplane.visible = false;
            secHand.visible = false;
            bearing.visible = false;
        }
        //切換回去要將紀錄時間變成現在與先前角度歸零
        preTime = Date.now();
        preAngle = 0;
        //扇形角度
        circleAngle = Math.PI / 2;
    }
    //變成時鐘
    else {
        $("#turnbtn").prop("disabled", true);
        $("#modebtn").prop("disabled", true);
        $("#calcbtn").prop("disabled", true);
        $("#stylebtn").prop("disabled", true);
        //移除扇形
        scene.remove(circle);
        //背板、轉動軸、秒針不管是否本來就在指針模式都再設定一次是否顯示
        bearing.visible = true;
        backplane.visible = true;
        secHand.visible = true;
        //顯示時針分針
        minHand.visible = true;
        hrHand.visible = true;
    }
    clock = !clock;
});