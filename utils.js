const d3 = require("d3");
const d3q = require('d3-queue')


/**
 * Load CSV and JSON data and return a promise.
 * Load image data and cities scv data asynchronously.
 * @param {int} width 
 * @param {int} height 
 */
function loadData(data_path) {

    // Use d3's csv utility to map over csv.
    const data = d3.csv(data_path).then( function (d) {
        return d
    }, function(err){
        console.error(err)
    })  // This is error callback.
    return data
}

/**
 * Calculate color of datapoints per continent.
 * @param {array} data 
 * @param {array} csvData 
 * 
 */
function colorData(data, csvData) {

    // Create a color scale for each continent.
    var colorScale = d3.scaleOrdinal().domain([0,1,2]).range(
        d3.range(0, 1, 1 / 6).concat(1).map(d3.scaleSequential(d3.interpolateCool))
    );
    // Change lightness of each dot.
    var varyLightness = function (color) {
        var hsl = d3.hsl(color);
        hsl.l *= .1 + Math.random();
        return hsl.toString()
    };
    // Convert to vector color.
    function toVectorColor(colorStr) {
        var rgb = d3.rgb(colorStr);
        return [rgb.r / 255, rgb.g / 255, rgb.b / 255]
    }

    // Create color for each datapoint.
    data.forEach(function (d, i) {
        d.color = toVectorColor(varyLightness(colorScale(csvData[i]['IncidentOutcome'])))
    })
}

/**
 * Convert geoJSON to x,y coordinates and provide color to the points.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
function geoLayout(points, width, height, csvData) {

    /**
     * Project from lat/long to x,y coordinates
     * @param {array} data 
     */
    function projectData(data) {
        
        // Find the extent (min and max) of latitude.
        // Reference: https://github.com/d3/d3-array#extent
        var latExtent = d3.extent(csvData, function (d) {
            return d.lat
        });

        // Find the extent (min and max) of longitude.
        var lngExtent = d3.extent(csvData, function (d) {
            return d.lon
        });

        // Create extent geoJSON object.
        var extentGeoJson = {
            type: "LineString",
            coordinates: [
                [lngExtent[0], latExtent[0]],
                [lngExtent[1], latExtent[1]]
            ]
        };

        // Create Mercator projection top-left corner as [0,0].
        // Extent array [[x₀, y₀], [x₁, y₁]], where x₀ is the left side of the bounding box,
        // y₀ is the top, x₁ is the right and y₁ is the bottom.
        // Reference: https://github.com/d3/d3-geo#projection_fitExtent
        var projection = d3.geoMercator().fitSize([width, height], extentGeoJson);
        
        // Store X and Y from the projection.
        data.forEach(function (d, i) {
            var city = csvData[i];
            var location = projection([city.lon, city.lat]);
            d.x = location[0];
            d.y = location[1];
        })

    }
    projectData(points);
    colorData(points, csvData)
}


/**
 * Make bars with different width and color them.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
function barsLayout(points, width, height, csvData) {
    
    var pointWidth = width / 800;
    var pointMargin = 1;
    
    // Create a nested object by continent and filter.
    // Reference: https://github.com/d3/d3-collection#nest
    var byContinent = d3.nest().key(function (d) {
        return d.Gender
    }).entries(csvData);

    /* Calculate the bar margin and width */
    var binMargin = pointWidth * 10;
    var numBins = byContinent.length;
    var minBinWidth = width / (numBins * 2.5);
    var totalExtraWidth = width - binMargin * (numBins - 1) - minBinWidth * numBins;

    /* Calculate bar width and return array for each -- more data, thicker bar */
    var binWidths = byContinent.map(function (d) {
        return Math.ceil(d.values.length / csvData.length * totalExtraWidth) + minBinWidth
    });

    console.log(binWidths);
    // Keep track of points and bin width from left.
    var increment = pointWidth + pointMargin;
    var cumulativeBinWidth = 0;
    
    // Calculate bin widths and positions.
    var binsArray = binWidths.map(function (binWidth, i) {
        var bin = {
            continent: byContinent[i].key,
            binWidth: binWidth,
            binStart: cumulativeBinWidth + i * binMargin, // position of bin start
            binCount: 0,
            binCols: Math.floor(binWidth / increment) // num of cols reqd for the binns
        };
        cumulativeBinWidth += binWidth - 1;
        return bin
    });

    // nest the above bin array for each continent.
    var bins = d3.nest().key(function (d) {
        return d.Gender
    }).rollup(function (d) {
        return d[0]
    }).object(binsArray); 

    console.log("got bins", bins);
    colorData(points, csvData);

    // Iterate over data points.
    var arrangement = points.map(function (d, i) {

        // Get continet of the data point, and it's bin information.
        var continent = csvData[i].continent;
        var bin = bins[continent];

        if (!bin) {
            return {
                x: d.x,
                y: d.y,
                color: [0, 0, 0]
            }
        }
        // Get bin's display related variables.
        var binWidth = bin.binWidth;
        var binCount = bin.binCount;
        var binStart = bin.binStart;
        var binCols = bin.binCols;
        var row = Math.floor(binCount / binCols);
        var col = binCount % binCols;
        var x = binStart + col * increment;
        var y = -row * increment + height;
        bin.binCount += 1;
        return {
            x: x,
            y: y,
            color: d.color
        }
    });

    // Apply x,y and color data for each point.
    arrangement.forEach(function (d, i) {
        Object.assign(points[i], d)
    });

    console.log("points[0]=", points[0])
}


/**
 * Draw area chart from the points.
 * @param {array} points An array of objects each representing a point in data.
 * @param {int} width width of the canvas
 * @param {int} height height of the canvas
 * @param {array} csvData Array containing csv loaded data.
 */
function areaLayout(points, width, height, csvData) {

    colorData(points, csvData);
    
    var rng = d3.randomNormal(0, .2);
    var pointWidth = Math.round(width / 800);
    var pointMargin = 1;
    var pointHeight = pointWidth * .375;
    
    // Get latitude extent.
    var latExtent = d3.extent(csvData, function (d) {
        return d.lat
    });

    // Create a scale from the extent above to range 0 to width.
    var xScale = d3.scaleQuantize().domain(latExtent).range(d3.range(0, width, pointWidth + pointMargin));
    
    var binCounts = xScale.range().reduce(function (accum, binNum) {
        accum[binNum] = 0;
        return accum
    }, {});
    
    // Nest by continent.
    var byContinent = d3.nest().key(function (d) {
        return d.Gender
    }).entries(csvData);
    

    csvData.forEach(function (city, i) {
        city.d = points[i]
    });
    
    
    byContinent.forEach(function (continent, i) {
        continent.values.forEach(function (city, j) {
            var d = city.d;
            var binNum = xScale(city.lat);
            d.x = binNum;
            d.y = height - pointHeight * binCounts[binNum];
            binCounts[binNum] += 1
        })
    })
}

module.exports = {
    loadData: loadData,
    geoLayout: geoLayout,
    barsLayout: barsLayout,
    areaLayout: areaLayout,
}
