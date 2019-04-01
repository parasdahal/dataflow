const regl = require('regl')
const glslify = require('glslify');
const d3 = require('d3');

/**
 * Load CSV and JSON data and return a promise.
 * Load image data and cities scv data asynchronously.
 * @param {int} width 
 * @param {int} height 
 */
function loadData(data_path) {

    // Use d3's csv utility to map over csv.
    const data = d3.csv(data_path).then(function (d) {
        return d;
    }, function (err) {
        console.error(err);
    })
    return data;
}

// wrap d3 color scales so they produce vec3s with values 0-1
// also limit the t value to remove darkest color
function wrapColorScale(scale) {
    const tScale = d3.scaleLinear().domain([0, 1]).range([0.4, 1]);
    return t => {
        const rgb = d3.rgb(scale(tScale(t)));
        return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    };
}


// function to compile a draw points regl func
function createDrawPoints(regl, points) {

    return regl({
        frag: glslify('./shaders/fs.glsl'),
        vert: glslify('./shaders/vs.glsl'),

        attributes: {
            positionStart: points.map(d => [d.sx, d.sy]),
            positionEnd: points.map(d => [d.tx, d.ty]),
            colorStart: points.map(d => d.colorStart),
            colorEnd: points.map(d => d.colorEnd),
            index: d3.range(points.length),
        },

        uniforms: {
            pointWidth: regl.prop('pointWidth'),
            stageWidth: regl.prop('stageWidth'),
            stageHeight: regl.prop('stageHeight'),
            delayByIndex: regl.prop('delayByIndex'),
            duration: regl.prop('duration'),
            numPoints: points.length,
            elapsed: ({
                time
            }, {
                startTime = 0
            }) => (time - startTime) * 1000,
        },

        count: points.length,
        primitive: 'points',
    });
}

// function to start animation loop for each layout (note: time is in seconds)
function animate(regl, points, config, colorScales, startTime, buffer_clear=true) {

    console.log('animating with new layout');

    const drawPoints = createDrawPoints(regl, points);

    // start an animation loop. this loop is for animation of each layout.
    const frameLoop = regl.frame(({
        time
    }) => {
        
        if (startTime === null) {
            startTime = time;
        }

        // clear the buffer
        if(buffer_clear){
            regl.clear({
                // background color (black)
                color: [0, 0, 0, 1],
                depth: 1,
            });
        }

        // draw the points using our created regl func
        // note that the arguments are available via `regl.prop`.
        drawPoints({
            regl,
            pointWidth: config.pointWidth,
            stageWidth: config.width,
            stageHeight: config.height,
            duration: config.duration,
            delayByIndex: config.delayByIndex,
            startTime,
        });

        // how long to stay at a final frame before animating again (in seconds)
        const delayAtEnd = 0.1;

        // if we have exceeded the maximum duration, move on to the next animation
        if (time - startTime > (config.maxDuration / 1000) + delayAtEnd) {
            console.log('done animating, moving to next layout');
            frameLoop.cancel();
            // when restarting at the beginning, come back from the middle again
        }

    });
}

async function stackAnimation(regl, points, config, colorScales, startTime, stack=1){

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    config.duration = 0
    for(i=0;i<points.length/stack;i++){
            
        animate(regl, points.slice(0,i*stack), config, colorScales, startTime, buffer_clear=false);
        await sleep(10);
    }

}

async function render(regl, config, points,layouts,colorScales,event, width,height){

    let currentColorScale = 0;
    let currentLayout = 0;

    // So this is where we add event listeners logic.
    while(true){
        // await sleep(config.duration);
        await event();

        // Make previous end the new beginning.
        points.forEach(d => {
            d.sx = d.tx;
            d.sy = d.ty;
            d.colorStart = d.colorEnd;
        });
        
        // Arrange the points in new layout.
        layouts[currentLayout](points);
        

        points.forEach((d, i) => {
            d.tx = d.x;
            d.ty = d.y;
            d.colorEnd = d.color;
        });
        
        // Copy layout x y to end positions.
        // const colorScale = colorScales[currentColorScale];

        // keep track of start time so we can get time elapsed
        // this is important since time doesn't reset when starting new animations
        let startTime = null; // in seconds
            
        animate(regl, points, config, colorScales, startTime);

        currentLayout = (currentLayout + 1) % layouts.length;
        currentColorScale = (currentColorScale + 1) % colorScales.length;

    }

}

// Expose main function and loadData function.
module.exports = {
    render: render,
    loadData: loadData,
    wrapColorScale: wrapColorScale
}