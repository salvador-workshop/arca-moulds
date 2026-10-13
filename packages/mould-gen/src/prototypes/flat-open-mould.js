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
    mirror,
    scale,
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

const { vectorText } = jscad.text
const { hullChain } = jscad.hulls
const { toOutlines } = jscad.geometries.geom2
const { colorize } = jscad.colors

const swJscad = require('sw-jscad').init({ lib: jscad });
const swjUi = require('sw-jscad-ui').init({ lib: jscad, swLib: swJscad });

const { superPrimitives } = swJscad.utils;
const { layout } = swjUi.ux;




/**
 * Flat Open ("cookie cutter") Mould
 * @param {*} opts 
 * @returns `geom3` or `geom3[]`
 * @author RJ Salvador (Salvador Workshop)
 * @version 1.2.0
 */
const flatOpenMould = (opts, subject) => {

    /* ----------------------------------------
     * Util Functions
     * ------------------------------------- */

    const inchesMmFactor = 25.4
    const inchesToMm = (inputIn) => inputIn * inchesMmFactor

    const interfaceThickness = 1.333
    const typFitGap = inchesToMm(1 / 128)

    /**
     * Creates a simple 2D line of text
     * @memberof models.profiles.text2d
     * @instance
     * @param {*} param0 
     * @returns `geom2` object of the 2D text
     */
    const basicText = (opts) => {
        const lineRadius = opts.charLineWidth / 2
        const lineCorner = circle({ radius: lineRadius })
        // line segments for each character
        const lineSegmentPointArrays = vectorText({ x: 0, y: 0, input: opts.message, height: opts.fontSize })
        const lineSegments = []
        // process the line segment
        lineSegmentPointArrays.forEach((segmentPoints) => {
            const corners = segmentPoints.map((point) => translate(point, lineCorner))
            lineSegments.push(hullChain(corners))
        })
        return union(lineSegments)
    }


    /**
     * Creates a simple 3D line of text
     * @memberof models.prefab.text3d
     * @instance
     * @param {*} param0 
     * @returns `geom3` object of the 3D text
     */
    const flatText = (opts) => {
        if (opts.message === undefined || opts.message.length === 0) return []

        const message2D = basicText({
            message: opts.message,
            fontSize: opts.fontSize,
            charLineWidth: opts.charLineWidth
        })
        const message3D = extrudeLinear({ height: opts.extrudeHeight || 0.125 }, message2D)

        return align({ modes: ['center', 'center', 'center'] }, message3D)
    }


    /**
     * Creates a 3D line of text, with engraved profile
     * @memberof models.profiles.text2d
     * @instance
     * @param {*} param0 
     * @returns `geom3` object of the engraved text
     */
    const engravedText = (opts) => {
        const engravingDepth = interThickness * 0.37
        const lineRadius = engravingDepth / 2
        const inverted = opts.inverted || false

        const lineCorner = cylinderElliptic({
            height: 0.4,
            startRadius: inverted ? [lineRadius, lineRadius] : [0, 0],
            endRadius: inverted ? [0, 0] : [lineRadius, lineRadius],
        })
        // line segments for each character
        const lineSegmentPointArrays = vectorText({ x: 0, y: 0, input: opts.message, height: opts.fontSize })
        const lineSegments = []
        // process the line segment
        lineSegmentPointArrays.forEach((segmentPoints) => {
            const corners = segmentPoints.map((point) => translate(point, lineCorner))
            lineSegments.push(hullChain(corners))
        })
        return union(lineSegments)
    }

    const getAdjustedLength = (length, unit) => {
        // JavaScript is a language that cannot calculate "12.7 * 3"
        // without pissing and shitting itself over precision issues.
        // This quick hack lets the language do what it should normally do.
        const precisionAdj = 0.000001
        const fudgedUnit = unit + precisionAdj
        const units = length / fudgedUnit
        const adjUnits = Math.ceil(units)
        let adjLength = adjUnits * fudgedUnit

        const adjLengthStr = adjLength.toFixed(adjLength);
        adjLength = parseFloat(adjLengthStr)

        return adjLength
    }


    /* ----------------------------------------
     * Input Handling
     * ------------------------------------- */

    const subjectDims = measureDimensions(subject)
    const vChannelWidth = inchesToMm(1 / 8)

    const {
        heightLevel = 0,
        meshGapRadius = inchesToMm(3 / 64),
        meshEdgeWidth = 1,
        interfaceWidth = 1.333333,
        ventilationChannelDirection = 'x'
    } = opts

    const mouldDims = [
        interfaceWidth * 2 + subjectDims[0],
        interfaceWidth * 2 + subjectDims[1],
        subjectDims[2],
    ]
    const size = mouldDims

    const baseValues = {
        ventilationChannelWidth: vChannelWidth,
        ventilationChannelHeight: vChannelWidth * Math.sqrt(3),
        ventilationChannelVertMargin: interfaceWidth,
    }

    const ventilationSlabHeight = baseValues.ventilationChannelVertMargin * 2 + baseValues.ventilationChannelHeight
    const adjustedLength = ventilationChannelDirection == 'x' ?
        getAdjustedLength(size[1], baseValues.ventilationChannelWidth * 2) :
        getAdjustedLength(size[0], baseValues.ventilationChannelWidth * 2)
    const baseSize = ventilationChannelDirection == 'x' ?
        [size[0], adjustedLength, ventilationSlabHeight] :
        [adjustedLength, size[1], ventilationSlabHeight]
    const mouldSize = [
        baseSize[0],
        baseSize[1],
        mouldDims[2],
    ]

    const meshTextureSlab = superPrimitives.meshPanel({
        size: [baseSize[0], baseSize[1], meshEdgeWidth * 0.666667],
        radius: meshGapRadius,
        segments: 9,
        edgeMargin: interfaceWidth * 1.883,
    })
    const meshTextureSlabDims = measureDimensions(meshTextureSlab)

    const derivedProps = {
        subjectDims,
        mouldDims,
        size: baseSize,
        heightLevel,
        baseSize,
        mouldSize,
        meshGapRadius,
        meshEdgeWidth,
        interfaceWidth,
        ventilationChannelDirection,
        ventilationSlabHeight,
        meshTextureSlab,
        meshTextureSlabDims,
    }


    /* ----------------------------------------
     * Base Model Properties, Dimensions
     * ------------------------------------- */

    const modelProperties = {
        metadata: {
            id: 'M0003',
            name: 'New Model',
            project: 'New Project',
            author: 'RJ Salvador',
            organization: 'Salvador Workshop',
            client: null,
        },
        ...baseValues,
        ...derivedProps,
    }


    /* ----------------------------------------
     * Modelling, Component/Assembly Modules
     * ------------------------------------- */

    const openMouldBase = (opts) => {
        const {
            size,
            meshGapRadius,
            meshEdgeWidth,
            interfaceWidth,
            meshTextureSlab,
            meshTextureSlabDims,
        } = opts
        // console.log('openMouldBase() opts', opts)

        const heightScaleFactor = size[2] / meshTextureSlabDims[2]
        const meshMouldBase = scale([1, 1, heightScaleFactor], meshTextureSlab)

        return meshMouldBase
    }


    const openMouldTop = (opts) => {
        const {
            // mouldDims,
            size,
            mouldSize,
            meshGapRadius,
            meshEdgeWidth,
            interfaceWidth,
            meshTextureSlab,
            meshTextureSlabDims,
        } = opts
        console.log('openMouldTop() opts', opts)

        const invSubj = rotate([0, Math.PI, 0], subject)
        const casting = subtract(
            align({ modes: ['center', 'center', 'max'] }, cuboid({ size: mouldSize })),
            align({ modes: ['center', 'center', 'max'] }, invSubj),
        )

        const heightScaleFactor = mouldSize[2] / meshTextureSlabDims[2]
        const meshMouldTop = scale([1, 1, heightScaleFactor], meshTextureSlab)

        let mouldTop = intersect(
            align({ modes: ['center', 'center', 'max'] }, meshMouldTop),
            casting
        )

        return align({ modes: ['center', 'center', 'center'] }, mouldTop)
    }


    const ventilationChannel = (opts) => {
        const {
            size,
            meshGapRadius,
            meshEdgeWidth,
            interfaceWidth,
            ventilationChannelDirection,
        } = opts

        const baseTriangle = align({
            modes: ['center', 'min', 'center']
        }, triangle({
            type: 'SSS', values: [
                modelProperties.ventilationChannelWidth,
                modelProperties.ventilationChannelWidth,
                modelProperties.ventilationChannelWidth,
            ]
        }))
        const oppTriangle = mirror({ normal: [0, 1, 0] }, baseTriangle)
        const channelProfile = union(baseTriangle, oppTriangle)

        let channelLength = 0
        if (ventilationChannelDirection == 'x') {
            channelLength = size[0] + (interfaceWidth * 2)
        } else {
            channelLength = size[1] + (interfaceWidth * 2)
        }

        let vChannel = extrudeLinear({ height: channelLength }, channelProfile)
        vChannel = rotate([Math.PI / 2, 0, 0], vChannel)
        if (ventilationChannelDirection == 'x') {
            vChannel = rotate([0, 0, Math.PI / 2], vChannel)
        }

        return align({ modes: ['center', 'center', 'center'] }, vChannel)
    }


    const ventilationChannels = (opts) => {
        const {
            size,
            meshGapRadius,
            meshEdgeWidth,
            interfaceWidth,
            ventilationChannelDirection,
            ventilationChannelWidth,
            ventilationChannelHeight
        } = opts

        let numChannels = 0
        if (ventilationChannelDirection == 'x') {
            numChannels = Math.floor(size[1] / ventilationChannelWidth)
        } else {
            numChannels = Math.floor(size[0] / ventilationChannelWidth)
        }

        const baseChannel = ventilationChannel(opts)
        const channels = []
        for (let idx = 0; idx <= numChannels; idx++) {
            const xVal = 0
            const YVal = 0
            const dist = ventilationChannelWidth * idx
            const isRaised = idx % 2 == 0
            const vertOffset = isRaised ? ventilationChannelHeight / 2 + interfaceWidth : 0

            let newPt = [0, 0, vertOffset]
            if (ventilationChannelDirection == 'x') {
                newPt[1] = dist
            } else {
                newPt[0] = dist
            }
            channels.push(translate(newPt, baseChannel))
        }
        let vChannels = union(...channels)

        return align(
            { modes: ['center', 'center', 'center'] },
            vChannels
        )
    }


    /* ----------------------------------------
     * Final Assembly
     * ------------------------------------- */

    let mouldBase = align(
        { modes: ['center', 'center', 'min'] },
        openMouldBase(modelProperties)
    )

    let vChannels = align(
        { modes: ['center', 'center', 'min'] },
        ventilationChannels(modelProperties)
    )

    vChannels = translate([0, 0, modelProperties.ventilationChannelHeight / -2], vChannels)
  
    let channeledBaseHeight1 = align(
        { modes: ['center', 'center', 'min'] },
        subtract(mouldBase, vChannels)
    )
  
    let channeledBase = channeledBaseHeight1
    if (modelProperties.heightLevel == 0) {
      let cutaway = cuboid({size: [
        modelProperties.baseSize[0],
        modelProperties.baseSize[1],
        modelProperties.ventilationChannelHeight / 2 + modelProperties.interfaceWidth
      ]})
      cutaway = align({ modes: ['center', 'center', 'max'] }, cutaway)
      cutaway = translate([
        0,
        0,
        modelProperties.ventilationChannelHeight / 2 + modelProperties.interfaceWidth
      ], cutaway)
      
      channeledBase = subtract(channeledBaseHeight1, cutaway)
    }
    const mouldTop = openMouldTop(modelProperties)

    let combinedModel = union(
        align(
            { modes: ['center', 'center', 'min'] },
            mouldTop
        ),
        align(
            { modes: ['center', 'center', 'max'] },
            channeledBase
        )
    )

    let auxParts = {
        props: modelProperties,
        channeledBase,
        ventilationChannels: ventilationChannels(modelProperties),
        openMouldTop: openMouldTop(modelProperties),
    }

    let mainPart = combinedModel

    return [
        mainPart,
        auxParts
    ]
}




/* ----------------------------------------
 * Test subjects
 * ------------------------------------- */

const subjSize = [50.8, 50.8, 15]
const subjBase = align({ modes: ['center', 'center', 'min'] }, cuboid({ size: subjSize }))
const subjParts = [
    align({ modes: ['center', 'center', 'min'] }, cuboid({ size: [12, 12, 20] })),
    align({ modes: ['center', 'center', 'min'] }, cube({ size: 18 })),
    align({ modes: ['center', 'center', 'min'] }, sphere({ radius: 10 })),
    align({ modes: ['center', 'center', 'min'] }, cylinder({ height: 17, radius: 8 })),
]

subjParts[0] = translate([15, 15, 0], subjParts[0])
subjParts[1] = translate([-15, 15, 0], subjParts[1])
subjParts[2] = translate([15, -15, 0], subjParts[2])
subjParts[3] = translate([-15, -15, 0], subjParts[3])

const mouldSubject1 = union(
    subjBase,
    ...subjParts,
)

const newModelOpts = {
    ventilationChannelDirection: 'x',
}
const newModelSubject = flatOpenMould(newModelOpts, mouldSubject1)

const mould = newModelSubject[0]
const auxParts = newModelSubject[1]


/**
 * Main function to be rendered by JSCAD
 * @returns `geom3` or `geom3[]`
 */
function main() {
    const outer = colorize(
        [0.65, 0.25, 0.8],
        subtract(
            cube({ size: 10 }),
            sphere({ radius: 6.8 })
        )
    )
    const inner = colorize(
        [0.7, 0.7, 0.1],
        intersect(
            sphere({ radius: 4 }),
            cube({ size: 7 })
        )
    )

    const spaceUnit = 63.5

    return [
        translate([spaceUnit * 0, spaceUnit * 0], auxParts.channeledBase),
        translate([spaceUnit * 0, spaceUnit * 1], auxParts.ventilationChannels),
        translate([spaceUnit * 0, spaceUnit * 2], auxParts.openMouldTop),
    ]

    // return [
    //     translate([0, 0, 0], outer),
    //     translate([0, 0, 0], inner),
    //     translate([spaceUnit, 0], newModelSubject[0]),
    //     // translate([spaceUnit, spaceUnit], auxParts),
    // ]
}

module.exports = { main }
