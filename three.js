const THREE = require('THREE');
const TWEEN = require('@tweenjs/tween.js');
const OrbitControls = require('three-orbitcontrols')

const {
    loadData,
    wrapColorScale
} = require('./flow.js');
const {
    geoLayout,
    barsLayout,gridLayout
} = require('./data.js')
const d3 = require('d3');

let container;
let camera, renderer, controls;
let scene, mesh, geometry, material;
let points;
let width, height;
let data;

function createCamera() {

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 2000);

    // Helper for viewing camera frustrum.
    // var camhelper = new THREE.CameraHelper(camera);
    // scene.add(camhelper);

    camera.position.set(0, 0, 800);

    controls = new OrbitControls(camera, window);
    controls.target.set(0, 5, 0);
    controls.update();

}

function createMesh() {

    geometry = new THREE.BufferGeometry();
    var sprite = new THREE.TextureLoader().load('https://blog.fastforwardlabs.com/images/2018/02/circle_aa-1518730700478.png');
    
    points = d3.range(data.length).map(d => ({}));

    // let vertices = geoLayout(points, width, height, data);

    // let vertices = barsLayout(points, width, height, data);
    [vertices, colors] = geoLayout(points, width, height, data);
    [vertices2, colors2] = barsLayout(points, width, height, data);
    [vertices3, colors3] = gridLayout(points, width, height, data);

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(colors, 3));

    // Orientation of the layout.
    geometry.rotateZ(180 * (Math.PI / 180));
    geometry.rotateY(180 * (Math.PI / 180));
    geometry.translate(-350, 200, 0)

    material = new THREE.PointsMaterial({
        size: 2,
        sizeAttenuation: false,
        map: sprite,
        alphaTest: 0.5,
        transparent: true,
        vertexColors:colors
    });

    mesh = new THREE.Points(geometry, material);

    scene.add(mesh);

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

    loadData('./data/data_geo.csv').then((csv) => {
        
        data = csv;
        scene = new THREE.Scene();
        // scene.fog = new THREE.FogExp2(0x000000, 0.001);
        createCamera()
        createLight()
        createMesh()
        
        createRenderer()
        setupTween()
        
        renderer.setAnimationLoop(() => {
            controls.update();
            update();
            render();
            TWEEN.update();

        });

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


function setupTween()
{	
    var userOpts = {
        duration	: 2500,
        delay		: 200,
    };
    
	var update	= function(){

        geometry.addAttribute('position', new THREE.Float32BufferAttribute(current, 3));
        geometry.rotateZ(180 * (Math.PI / 180));
        geometry.rotateY(180 * (Math.PI / 180));
        geometry.translate(-350, 200, 0)

    }

    TWEEN.removeAll();

    // Copy the current vertices to create new target that wil
    // be modified by tween.
    var current = vertices.slice();
    var cur_color = colors.slice();

	var tweenHead	= new TWEEN.Tween(current)
        .to(vertices2, userOpts.duration)
		.delay(userOpts.delay)
		.easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(update)
        .onStart(()=>{
            new TWEEN.Tween(cur_color)
            .to(colors2, userOpts.duration)
            .onUpdate(()=>{
                geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(cur_color, 3));
            })
            .start();   
        })
        
	var tweenBack	= new TWEEN.Tween(current)
        .to(vertices3, userOpts.duration)
		.delay(userOpts.delay)
		.easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(update)
        .onStart(()=>{
            new TWEEN.Tween(cur_color)
            .to(colors3, userOpts.duration)
            .onUpdate(()=>{
                geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(cur_color, 3));
            })
            .start();   
        
        })

    var tweenBack2	= new TWEEN.Tween(current)
        .to(vertices, userOpts.duration)
		.delay(userOpts.delay)
		.easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(update)
        .onStart(()=>{
            new TWEEN.Tween(cur_color)
            .to(colors, userOpts.duration)
            .onUpdate(()=>{
                geometry.addAttribute( 'color', new THREE.Float32BufferAttribute(cur_color, 3));
            })
            .start();   
        
        })
        
    tweenHead.chain(tweenBack2);
    tweenBack2.chain(tweenBack);
	tweenBack.chain(tweenHead);
    
    tweenHead.start();

    // var timeline = new TWEEN.Timeline(); //create the Timeline
    // timeline.addTween(tweenHead, tweenBack); // add some tweens
    // timeline.setPaused(false); // pause all tweens 
    // // timeline.setPosition(300); // set position on all tweens ...
    // timeline.start();
}