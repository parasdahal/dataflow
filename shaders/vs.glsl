attribute vec2 positionStart;
attribute vec2 positionEnd;
attribute float index;
attribute vec3 colorStart;
attribute vec3 colorEnd;

varying vec3 fragColor;

uniform float pointWidth;
uniform float stageWidth;
uniform float stageHeight;
uniform float elapsed;
uniform float duration;
uniform float delayByIndex;
// uniform float tick;
// uniform float animationRadius;
uniform float numPoints;

// helper function to transform from pixel space to normalized device coordinates (NDC)
// in NDC (0,0) is the middle, (-1, 1) is the top left and (1, -1) is the bottom right.
vec2 normalizeCoords(vec2 position) {
// read in the positions into x and y vars
float x = position[0];
float y = position[1];

    return vec2(
    2.0 * ((x / stageWidth) - 0.5),
    // invert y since we think [0,0] is bottom left in pixel space
    -(2.0 * ((y / stageHeight) - 0.5)));
}

// helper function to handle cubic easing (copied from d3 for consistency)
// note there are pre-made easing functions available via glslify.
float easeCubicInOut(float t) {
    t *= 2.0;
t = (t <= 1.0 ? t * t * t : (t -= 2.0) * t * t + 2.0) / 2.0;

if (t > 1.0) {
t = 1.0;
}

return t;
}

void main() {
    gl_PointSize = pointWidth;

    float delay = delayByIndex * index;
float t;

// drawing without animation, so show end state immediately
if (duration == 0.0) {
t = 1.0;

// still delaying before animating
} else if (elapsed < delay) {
t = 0.0;
} else {
t = easeCubicInOut((elapsed - delay) / duration);
}

// interpolate position
vec2 position = mix(positionStart, positionEnd, t);

// apply an ambient animation
    // float dir = index > numPoints / 2.0 ? 1.0 : -1.0;
// position[0] += animationRadius * cos((tick + index) * dir);
// position[1] += animationRadius * sin((tick + index) * dir);

// above we + index to offset how they move
// we multiply by dir to change CW vs CCW for half


// interpolate color
fragColor = mix(colorStart, colorEnd, t);

// scale to normalized device coordinates
    // gl_Position is a special variable that holds the position of a vertex
gl_Position = vec4(normalizeCoords(position), 0.0, 1.0);
}