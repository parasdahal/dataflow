const regl = require('regl')
const glslify = require('glslify');
const d3 = require('d3');
const {loadData, geoLayout, barsLayout, areaLayout} = require('./utils.js');


const width = window.innerWidth;
const height = window.innerHeight;

function main(regl, csvData) {
    
    const numPoints = 1521;
    const pointWidth = 4;
    const pointMargin = 1;
    const duration = 1500;
    const delayByIndex = 500 / numPoints;
    const maxDuration = duration + delayByIndex * numPoints; // include max delay in here

    const toGeo = (points) => geoLayout(points, width, height, csvData);
    const toBars = (points) => barsLayout(points, width, height, csvData);
    const toArea = (points) => areaLayout(points, width, height, csvData);
    
    const toMiddle = (points) => {
        points.forEach((d, i) => {
            d.x = width / 2;
            d.y = height / 2;
            d.color = [0, 0, 0];
        });
    }
    const toBlack = (points) => {
        points.forEach((d, i) => {
            d.color = [0, 0, 0];
        });
    }

    const layouts = [toGeo];
    let currentLayout = 0;

    // wrap d3 color scales so they produce vec3s with values 0-1
    // also limit the t value to remove darkest color
    function wrapColorScale(scale) {
        const tScale = d3.scaleLinear().domain([0, 1]).range([0.4, 1]);
        return t => {
            const rgb = d3.rgb(scale(tScale(t)));
            return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
        };
    }

    const colorScales = [
        d3.scaleSequential(d3.interpolateViridis),
        d3.scaleSequential(d3.interpolateMagma),
        d3.scaleSequential(d3.interpolateInferno),
        d3.scaleSequential(d3.interpolateCool),
    ].map(wrapColorScale);

    let currentColorScale = 0;

    // function to compile a draw points regl func
    function createDrawPoints(points) {

        const drawPoints = regl({
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
                numPoints: numPoints,
                elapsed: ({ time }, { startTime = 0 }) => (time - startTime) * 1000,
            },

            count: points.length,
            primitive: 'points',
        });

        return drawPoints;
    }

    // function to start animation loop (note: time is in seconds)
    function animate(layout, points) {
        console.log('animating with new layout');
        // make previous end the new beginning
        points.forEach(d => {
            d.sx = d.tx;
            d.sy = d.ty;
            d.colorStart = d.colorEnd;
        });
        console.log('DrawPoints')
        // layout points
        layout(points);

        // copy layout x y to end positions
        const colorScale = colorScales[currentColorScale];
        points.forEach((d, i) => {
            d.tx = d.x;
            d.ty = d.y;
            // d.colorEnd = colorScale(i / points.length)
            d.colorEnd = d.color;
        });

        // create the regl function with the new start and end points
        const drawPoints = createDrawPoints(points);
        
        // start an animation loop
        let startTime = null; // in seconds
        const frameLoop = regl.frame(({ time }) => {
            // keep track of start time so we can get time elapsed
            // this is important since time doesn't reset when starting new animations
            if (startTime === null) {
                startTime = time;
            }

            // clear the buffer
            regl.clear({
                // background color (black)
                color: [0, 0, 0, 1],
                depth: 1,
            });
            
            // draw the points using our created regl func
            // note that the arguments are available via `regl.prop`.
            drawPoints({
                pointWidth,
                stageWidth: width,
                stageHeight: height,
                duration,
                delayByIndex,
                startTime,
            });

            // how long to stay at a final frame before animating again (in seconds)
            const delayAtEnd = 0.1;

            // if we have exceeded the maximum duration, move on to the next animation
            if (time - startTime > (maxDuration / 1000) + delayAtEnd) {
                console.log('done animating, moving to next layout');

                frameLoop.cancel();
                currentLayout = (currentLayout + 1) % layouts.length;
                currentColorScale = (currentColorScale + 1) % colorScales.length;

                // when restarting at the beginning, come back from the middle again
                if (currentLayout === 0) {
                    points.forEach((d, i) => {
                        d.tx = width / 2;
                        d.ty = height / 2;
                        d.colorEnd = [0, 0, 0];
                    });
                }

                animate(layouts[currentLayout], points);
            }
        });
    }


    // create initial set of points
    const points = d3.range(numPoints).map(d => ({}));

    points.forEach((d, i) => {
        d.tx = width / 2;
        d.ty = height / 2;
        d.colorEnd = [0, 0, 0];
    });

    // start animation loop
    animate(layouts[currentLayout], points);
}


loadData('./data/data_geo.csv').then((data) => {
    console.log('data has loaded. initializing regl...');
    // initialize regl
    console.log(data)
    regl({
        // callback when regl is initialized
        onDone: (err, regl) => {
            if (err) {
                console.error('Error initializing regl', err);
                return;
            }
            main(regl, data);
        },
    });
});
