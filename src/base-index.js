"use strict"

const jscad = require('@jscad/modeling')

const {
    cube,
    cylinder,
    sphere,
    cylinderElliptic,
    circle,
    cuboid,
    roundedCuboid,
    roundedCylinder,
    roundedRectangle,
    rectangle,
    triangle,
} = jscad.primitives

const {
    align,
    translate,
    rotate,
    mirror
} = jscad.transforms

const {
    intersect,
    subtract,
    union,
    scission
} = jscad.booleans

const {
    extrudeLinear,
    extrudeRotate,
    project
} = jscad.extrusions

const {
    measureDimensions,
    measureBoundingBox,
    measureVolume
} = jscad.measurements

const {
    hull,
    hullChain
} = jscad.hulls

const { vectorText } = jscad.text
const { toOutlines } = jscad.geometries.geom2
const { TAU } = jscad.maths.constants
const { colorize } = jscad.colors

const swcadJs = require('swcad-js').init({ jscad });

const {
    math,
    position,
} = swcadJs.calcs

const castingMouldModule = require('mould-gen/src/casting-mould')
const castingMould = castingMouldModule.init({ jscad, swcadJs })
console.log('castingMould', castingMould)



//==============================================================================


/* ----------------------------------------
 * Test subjects
 * ------------------------------------- */


const castingSubject = require('./model.stl')

// const hRadius = math.inchesToMm(0.125 / 2)
// const hDist = hRadius * 2 + 1.333333
const castMouldData1 = castingMould.flatOnePartMould({
    subject: castingSubject,
    // type: 'open',
    // typeOpts: {
    //     edgeMargin: math.inchesToMm(1 / 2),
    //     holeRadius: hRadius,
    //     holeDistance: hDist,
    //     holePattern: 'tri',
    // },
})
const castMould = castMouldData1[0]

//==============================================================================




/**
 * Main function to be rendered by JSCAD
 * @returns `geom3` or `geom3[]`
 */
function main() {
    return castMould
}


module.exports = {
    main,
}
