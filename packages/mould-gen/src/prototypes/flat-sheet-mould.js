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

const { vectorText } = jscad.text
const { hullChain } = jscad.hulls
const { toOutlines } = jscad.geometries.geom2
const { TAU } = jscad.maths.constants
const { colorize } = jscad.colors

const swJscad = require('sw-jscad').init({ lib: jscad });
const swjUi = require('sw-jscad-ui').init({ lib: jscad, swLib: swJscad });

const { superPrimitives } = swJscad.utils;




//==============================================================================




/**
 * Flat Sheet Mould
 * @param {*} opts 
 * @returns `geom3` or `geom3[]`
 * @author R. J. Salvador (Salvador Workshop)
 * @version 1.0.2
 */
const flatSheetMould = (opts) => {

    /* ----------------------------------------
     * Util Functions, Constants
     * ------------------------------------- */

    const inchesMmFactor = 25.4
    const tri30Factor = Math.sqrt(3)
    const tri45Factor = Math.sqrt(2)
    const eqTriHeightFactor = tri30Factor / 2

    const inchesToMm = (inputIn) => inputIn * inchesMmFactor
    const ctr = (inGeom) => {
        return align({ modes: ['center', 'center', 'center'] }, inGeom)
    }
    const ctrMin = (inGeom) => {
        return align({ modes: ['center', 'center', 'min'] }, inGeom)
    }
    const ctrMax = (inGeom) => {
        return align({ modes: ['center', 'center', 'max'] }, inGeom)
    }


    /* ----------------------------------------
     * Options / Properties -- Default Values
     * ------------------------------------- */

    /** Specific value declarations */
    const defaultValues = {
        opts: {
            type: 'default',
            scale: 1,
            bead: {
                type: 'cone'
            },
            mesh: {
                segments: 8
            }
        },
        dims: {
            interfaceThickness: 1.333333,
            fitGap: inchesToMm(1 / 128),
            edgeMargin: inchesToMm(1 / 4),
            bead: {
                radius: inchesToMm(1 / 16),
                height: inchesToMm(1 / 16),
            },
            mesh: {
                radius: inchesToMm(3 / 32),
                thickness: 1.333333,
                margin: inchesToMm(5 / 32),
            },
        },
        points: {
            dots: [
                [12.5, 12.5],
                [12.5, 25],
                [25, 12.5],
                [25, 25],
            ],
            lines: [
                [
                    [8, 29.5],
                    [29.5, 29.5],
                ],
                [
                    [8, 8],
                    [29.5, 8],
                ],
            ],
        }
    }


    /* ----------------------------------------
     * Options / Properties -- Input Handling
     * ------------------------------------- */


    /** Computed values for option defaults */
    const optDefaultValues = {
        type: defaultValues.opts.type,
        scale: defaultValues.opts.scale,
        bead: {
            type: defaultValues.opts.bead.type,
            radius: defaultValues.dims.bead.radius,
            height: defaultValues.dims.bead.height,
        },
        mesh: {
            segments: defaultValues.opts.mesh.segments,
            margin: defaultValues.dims.mesh.margin,
            radius: defaultValues.dims.mesh.radius,
            thickness: defaultValues.dims.mesh.thickness,
        },
        interfaceThickness: defaultValues.dims.interfaceThickness,
        fitGap: defaultValues.dims.fitGap,
        edgeMargin: defaultValues.dims.edgeMargin,
        dots: defaultValues.points.dots,
        lines: defaultValues.points.lines,
    }

    // User options
    const {
        size = optDefaultValues.size,
        interfaceThickness = optDefaultValues.interfaceThickness,
        fitGap = optDefaultValues.fitGap,
        edgeMargin = optDefaultValues.edgeMargin,
        type = optDefaultValues.type,
        scale = optDefaultValues.scale,
        bead = optDefaultValues.bead,
        mesh = optDefaultValues.mesh,
        dots = optDefaultValues.dots,
        lines = optDefaultValues.lines,
    } = opts

    // Prop calculations
    const types = ['default', 'alt']

    /** Derived user options for the model */
    const modelOpts = {
        type,
        scale,
        types,
        bead: {
            type: bead.type,
        },
        mesh: {
            segments: mesh.segments,
        },
    }


    /* ----------------------------------------
     * Base Model Properties, Dimensions
     * ------------------------------------- */

    let width = null
    let depth = null

    let minX = Number.MAX_VALUE
    let minY = Number.MAX_VALUE

    let maxX = Number.MIN_VALUE
    let maxY = Number.MIN_VALUE

    const checkPt = (pt) => {
        const currentX = pt[0]
        const currentY = pt[1]

        if (currentX < minX) {
            minX = currentX
        } else if (currentX > maxX) {
            maxX = currentX
        }

        if (currentY < minY) {
            minY = currentY
        } else if (currentY > maxY) {
            maxY = currentY
        }
    }

    dots.forEach(dot => {
        checkPt(dot)
    })

    lines.forEach(line => {
        line.forEach(linePt => {
            checkPt(linePt)
        })
    })

    const distX = maxX - minX
    const distY = maxY - minY
    const distHalfX = distX / 2
    const distHalfY = distY / 2

    let ctrX = minX + distHalfX
    let ctrY = minY + distHalfY

    let ctrOffsetX = 0
    let ctrOffsetY = 0

    if (size) {
        width = size[0]
        depth = size[1]
    } else {
        width = edgeMargin * 2 + distX
        depth = edgeMargin * 2 + distY
    }

    /** Various dimensions for model */
    const modelDims = {
        interfaceThickness,
        fitGap,
        width,
        depth,
        bead: {
            radius: bead.radius,
            height: bead.height,
        },
        mesh: {
            radius: mesh.radius,
            margin: mesh.margin,
            thickness: mesh.thickness,
        },
    }

    /** Various key points for model */
    const modelPoints = {
        centre: [ctrX, ctrY, 0],
        dots,
        lines,
    }

    /** Properties accessible to all model functions. */
    const modelProperties = {
        metadata: {
            id: '9999',
            name: 'New Model',
            project: 'New Project',
            author: 'Somebody Somewhere',
            organization: 'Salvador Workshop',
            client: null,
        },
        opts: modelOpts,
        dims: modelDims,
        points: modelPoints,
    }


    /* ----------------------------------------
     * Modelling, Component/Assembly Modules
     * ------------------------------------- */


    const mouldBase = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps
        console.log('mouldBase(), modelProps', modelProps)

        const meshTextureSlab = superPrimitives.meshPanel({
            size: [dims.width, dims.depth, dims.interfaceThickness],
            radius: dims.mesh.radius,
            segments: 9,
            edgeMargin: dims.interfaceThickness + dims.mesh.margin,
        })

        return meshTextureSlab
    }


    const mouldPtSupportCore = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        const edgeMouldSupport = cylinder({
            height: dims.interfaceThickness,
            radius: dims.bead.radius
        })

        return edgeMouldSupport
    }

    const mouldPointSupport = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        const edgeMouldSupport = mouldPtSupportCore(modelProps)
        const mouldSupportFlange = cuboid({
            size: [
                dims.mesh.radius * 2.125,
                dims.interfaceThickness,
                dims.interfaceThickness
            ]
        })
        let holeMouldSupport = union(edgeMouldSupport, mouldSupportFlange)

        return holeMouldSupport
    }


    const mouldPoint = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        const holeMouldPoint = cylinderElliptic({
            height: dims.bead.height,
            startRadius: [dims.bead.radius, dims.bead.radius],
            endRadius: [0, 0]
        })

        return holeMouldPoint
    }

    const mouldPtAssembly = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        const hMouldPoint = mouldPoint(modelProps)

        const holeMould = union(
            ctrMax(mouldPtSupportCore(modelProps)),
            ctrMin(hMouldPoint),
        )
        return holeMould
    }

    const mouldPtFlangedAssembly = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        const hMouldPoint = mouldPoint(modelProps)

        const holeMould = union(
            ctrMax(mouldPointSupport(modelProps)),
            ctrMin(hMouldPoint),
        )
        return holeMould
    }


    const dotMoulds = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        console.log('dotMoulds() modelProps', modelProps)

        let holeMoulds = []
        points.dots.forEach((pt) => {
            holeMoulds.push(
                align(
                    {
                        modes: ['center', 'center', 'min'],
                        relativeTo: [pt[0], pt[1], 0],
                    },
                    mouldPtFlangedAssembly(modelProps)
                )
            )
        })

        let holeMouldSet = null

        if (holeMoulds.length > 0) {
            holeMouldSet = union(...holeMoulds)
        }

        return holeMouldSet
    }


    const lineMoulds = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps
        console.log('lineMoulds() modelProps', modelProps)

        const lineMouldPoints = []
        points.lines.forEach((linePoints) => {

            const lineSet = linePoints.map((linePt) => {
                console.log('lineMoulds() linePt', linePt)

                return translate([
                    linePt[0],
                    linePt[1],
                    0
                ], mouldPtAssembly(modelProps))
            })
            lineMouldPoints.push(hullChain(...lineSet))
        })

        console.log('lineMoulds() lineMouldPoints', lineMouldPoints)

        const lineMouldAssemblies = union(...lineMouldPoints)

        return lineMouldAssemblies
    }


    const assembledMould = (modelProps) => {
        const {
            metadata,
            opts,
            dims,
            points,
        } = modelProps

        let mainPart = ctrMin(mouldBase(modelProps))

        const dMould = dotMoulds(modelProps)
        const lMould = lineMoulds(modelProps)

        if (dMould) {
            mainPart = union(
                mainPart,
                ctrMin(dMould),
            )
        }

        if (lMould) {
            mainPart = union(
                mainPart,
                ctrMin(lMould),
            )
        }

        return mainPart
    }


    /* ----------------------------------------
     * Final Assembly
     * ------------------------------------- */

    let mPoint = mouldPoint(modelProperties)
    let mPointSupport = mouldPointSupport(modelProperties)
    let dMoulds = dotMoulds(modelProperties)
    let lMoulds = lineMoulds(modelProperties)
    let aMould = assembledMould(modelProperties)

    let mainPart = aMould

    let auxParts = {
        props: modelProperties,
        mouldPoint: mPoint,
        mouldPointSupport: mPointSupport,
        dotMoulds: dMoulds,
        lineMoulds: lMoulds,
    }

    return [mainPart, auxParts]
}




//==============================================================================




/* ----------------------------------------
 * Test subjects
 * ------------------------------------- */

const newModelOpts = {
    // size: [30, 40],
}

const newModelRes = flatSheetMould(newModelOpts)
const newModelMain = newModelRes[0]
const newModelParts = newModelRes[1]




//==============================================================================




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
        translate([spaceUnit * 0, spaceUnit * 0, spaceUnit * 0], outer),
        translate([spaceUnit * 0, spaceUnit * 0, spaceUnit * 0], inner),

        translate([spaceUnit * 1, spaceUnit * 0, spaceUnit * 0], newModelMain),

        translate([spaceUnit * 2, spaceUnit * 0, spaceUnit * 0], newModelParts.mouldPoint),
        translate([spaceUnit * 2, spaceUnit * 1, spaceUnit * 0], newModelParts.mouldPointSupport),
        translate([spaceUnit * 2, spaceUnit * 2, spaceUnit * 0], newModelParts.dotMoulds),
        translate([spaceUnit * 2, spaceUnit * 3, spaceUnit * 0], newModelParts.lineMoulds),
    ]
}

module.exports = {
    main,
    flatSheetMould
}
