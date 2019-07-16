const THREE = require('THREE');
const TWEEN = require('@tweenjs/tween.js');
const OrbitControls = require('three-orbitcontrols')
const {
    loadData,
    wrapColorScale
} = require('./flow.js');
const {
    geoLayout,
    barsLayout
} = require('./data.js')
const d3 = require('d3');

let container;
let camera, renderer;
let scene, mesh, geometry, vertices;
let points;
let width, height;
let data;

var userOpts	= {
	range		: 800,
	duration	: 2500,
	delay		: 200,
	easing		: 'Elastic.EaseInOut'
};


function createCamera() {

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 2000);

    // Helper for viewing camera frustrum.
    var camhelper = new THREE.CameraHelper(camera);
    scene.add(camhelper);

    camera.position.set(0, 0, 800);

    const controls = new OrbitControls(camera, window);
    controls.target.set(0, 5, 0);
    controls.update();

}

function loadLayout() {


    // loadData('./data/data_geo.csv').then((data) => {

        
    // });    

}

function createMesh() {

    geometry = new THREE.BufferGeometry();
    var sprite = new THREE.TextureLoader().load('https://blog.fastforwardlabs.com/images/2018/02/circle_aa-1518730700478.png');

    loadData('./data/data_geo.csv').then((d) => {
        data = d;
        let numPoints = data.length;

        points = d3.range(numPoints).map(d => ({}));

        // let vertices = geoLayout(points, width, height, data);

        // let vertices = barsLayout(points, width, height, data);
        vertices = geoLayout(points, width, height, data);

        geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        // Orientation of the layout.
        geometry.rotateZ(180 * (Math.PI / 180));
        geometry.rotateY(180 * (Math.PI / 180));
        geometry.translate(-350, 200, 0)

        var material = new THREE.PointsMaterial({
            size: 2,
            sizeAttenuation: false,
            map: sprite,
            alphaTest: 0.5,
            transparent: true
        });

        material.color.setHSL(1.0, 0.3, 0.7);
        mesh = new THREE.Points(geometry, material);

        scene.add(mesh);

    })

}

function createRenderer() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
}

function createLight() {
    var light = new THREE.PointLight(0xffffff, 2.0, 1000);
    light.target = mesh;
    scene.add(light);
}

function init() {
    container = document.querySelector('#scene-container');
    width = window.innerWidth - 10;
    height = window.innerHeight - 10;

    scene = new THREE.Scene();
    // scene.fog = new THREE.FogExp2(0x000000, 0.001);
    createCamera()
    createLight()
    createMesh()
    setupTween()
    createRenderer()
    camera.lookAt(scene.position)
    renderer.setAnimationLoop(() => {
        // controls.update();
        update();
        render();
        TWEEN.update();
    });
}

function update() {

    // let vertices = barsLayout(points, width, height, data);
    // geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

}

function render() {

    // camera.lookAt(mesh.points.position)
    // THREE.Quaternion.slerp( q1, q2, mesh.quaternion,0.5 );
    renderer.render(scene, camera);

}

init();

// var interval = setInterval(function() {
//     setPoints();
// }, 5000)

function setPoints() {

    var positions = mesh.geometry.attributes.position.array;

    
    vertices = barsLayout(points, width, height, data);

    let steps = data.length;
    let idx = 0;
    for ( var i =0; i <steps; i ++ ) {
            positions[idx] = vertices[idx]
            positions[idx+1] = vertices[idx+1]
            positions[idx+2] = vertices[idx+2]
            idx += 3;
    }
    geometry.rotateZ(180 * (Math.PI / 180));
    geometry.rotateY(180 * (Math.PI / 180));
    geometry.translate(-350, 200, 0)

    mesh.geometry.attributes.position.needsUpdate = true;   
    mesh.geometry.setDrawRange( 0, data.length);  
    renderer.render(scene, camera);

}
function setupTween()
{	
	var update	= function(){
		geometry.position.x = current.x;
	}
	var current	= { x: -userOpts.range };
// remove previous tweens if needed

	TWEEN.removeAll();
	
// convert the string from dat-gui into tween.js functions

	var easing	= TWEEN.Easing['Elastic']['EaseInOut'];
// ¶
// build the tween to go ahead

	var tweenHead	= new TWEEN.Tween(current)
		.to({x: +userOpts.range}, userOpts.duration)
		.delay(userOpts.delay)
		.easing(easing)
		.onUpdate(update);
// ¶
// build the tween to go backward

	var tweenBack	= new TWEEN.Tween(current)
		.to({x: -userOpts.range}, userOpts.duration)
		.delay(userOpts.delay)
		.easing(easing)
		.onUpdate(update);
// ¶
// after tweenHead do tweenBack

	tweenHead.chain(tweenBack);
// ¶
// after tweenBack do tweenHead, so it is cycling

	tweenBack.chain(tweenHead);
// ¶
// start the first

	tweenHead.start();
}