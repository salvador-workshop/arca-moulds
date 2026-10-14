"use strict"

const castingMouldInit = ({ jscad, swcadJs }) => {
    const {
        cylinder,
        cylinderElliptic,
        cuboid,
        roundedCuboid,
        roundedRectangle,
    } = jscad.primitives

    const {
        align,
        translate,
        rotate,
    } = jscad.transforms

    const {
        subtract,
        union,
    } = jscad.booleans

    const {
        extrudeLinear,
    } = jscad.extrusions

    const {
        measureDimensions,
    } = jscad.measurements

    const {
        hullChain
    } = jscad.hulls

    const { vectorText } = jscad.text
    const { toOutlines } = jscad.geometries.geom2
    const { TAU } = jscad.maths.constants
    const { colorize } = jscad.colors
    const { generalize } = jscad.modifiers

    const {
        math,
        position,
        geometry,
    } = swcadJs.calcs

    const {
        constants,
    } = swcadJs.data

    const {
        connections,
    } = swcadJs.profiles

    /**
     * Creates a 3D line of text, with engraved profile
     * @instance
     * @param {*} param0 
     * @returns ...
     */
    const engravedText = (opts) => {
        const inverted = opts.inverted || false
        const interfaceThickness = opts.interfaceThickness || 1.333333
        const engrDepth = opts.engravingDepth || interfaceThickness * 0.37

        const lineRadius = engrDepth / 2

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


    //==============================================================================


    /**
     * Builds default values and opts for the model
     * @param {*} opts 
     * @returns default values and opts
     * @memberof castingMould
     * @access private
     */
    const castingMouldDefaults = () => {
        /** Specific value declarations */
        const subjHeight = math.inchesToMm(1)
        const subjWidth = math.inchesToMm(2.75)

        const castingSubj = union(
            roundedCuboid({
                size: [subjWidth, subjWidth, subjHeight],
            }),
            position.ctrMin(cylinder({
                radius: subjWidth / 2 - 6, height: subjHeight * 0.75
            })),
            position.ctrMax(cuboid({
                size: [subjWidth - 12.7, subjWidth - 12.7, subjHeight * 0.75],
            })),
        )

        const textLineHeight = 2.8
        const defaultValues = {
            constants: {
                textLineHeight,
                textLineHtUnit: textLineHeight * -2.5,
            },
            dims: {
            },
            points: {
                centrePt: [0, 0, 0]
            },
            types: {
                default: {
                    id: 'default',
                    desc: 'Default',
                    defaultOpts: {},
                },
                open: {
                    id: 'open',
                    desc: 'Mould with openings',
                    defaultOpts: {
                        edgeMargin: math.inchesToMm(3 / 16),
                        holeRadius: math.inchesToMm(0.125),
                        holeDistance: math.inchesToMm(1),
                        holePattern: 'tri',
                    },
                },
            },
            components: {
                subject: castingSubj
            },
        }

        /** Options used by SW models */
        const standardOpts = {
            type: defaultValues.types.default.id,
            scale: 1,
            interfaceThickness: 1.333333,
            fitGap: math.inchesToMm(1 / 128),
        }

        /** Computed values for option defaults */
        const defaultOpts = {
            ...standardOpts,
            subject: defaultValues.components.subject,
            typeOpts: defaultValues.types.default.defaultOpts,
        }

        return {
            opts: defaultOpts,
            vals: defaultValues,
        }
    }


    //------------------------------------------------------------------------------


    /**
     * Initializes options with user input
     * @param {*} opts 
     * @returns model properties
     * @memberof castingMould
     * @access private
     */
    const castingMouldOpts = (opts) => {
        const defaults = castingMouldDefaults()

        // User options
        const {
            subject = defaults.opts.subject,
            typeOpts = defaults.opts.typeOpts,
            type = defaults.opts.type,
            scale = defaults.opts.scale,
            interfaceThickness = defaults.opts.interfaceThickness,
            fitGap = defaults.opts.fitGap,
        } = opts

        const stdOpts = {
            type,
            scale,
            interfaceThickness,
            fitGap,
        }

        const initOpts = {
            subject,
            typeOpts,
            ...stdOpts,
        }


        return initOpts
    }


    //------------------------------------------------------------------------------


    /**
     * Builds model properties from the given opts
     * @param {*} opts 
     * @returns model properties
     * @memberof castingMould
     * @access private
     */
    const castingMouldProps = (opts) => {
        const defaults = castingMouldDefaults()

        const {
            subject,
            typeOpts,
            type,
            scale,
            interfaceThickness,
            fitGap,
        } = opts

        /* ----------------------------------------
        * Prop calculations
        * ------------------------------------- */

        const subjectSize = measureDimensions(subject)

        const mouldMargin = interfaceThickness
        const mouldSize = [
            subjectSize[0] + (mouldMargin * 2),
            subjectSize[1] + (mouldMargin * 2),
            subjectSize[2],
        ]
        const mouldSizeHalf = [
            mouldSize[0] / 2,
            mouldSize[1] / 2,
            mouldSize[2] / 2,
        ]

        const baseplateMargin = interfaceThickness * 3
        const baseplateSize = [
            mouldSize[0] + (baseplateMargin * 2),
            mouldSize[1] + (baseplateMargin * 2),
            interfaceThickness,
        ]

        const cutawaySize = [
            baseplateSize[0] + (interfaceThickness * 2),
            baseplateSize[1] + (interfaceThickness * 2),
            subjectSize[2] + (interfaceThickness * 4),
        ]
        const alignmentPinCutawaySize = [
            fitGap * 2 + mouldSize[0],
            fitGap * 2 + mouldSize[1],
            fitGap * 2 + mouldSize[2],
        ]

        const mouldPartHeight = mouldSize[2] / 2
        const alignmentPinHeight = mouldPartHeight + interfaceThickness
        const alignmentPinMax = baseplateMargin
        const alignmentPinSize = [
            alignmentPinMax * constants.PHI,
            alignmentPinMax
        ]
        const alignmentPinDistUnitSize = [
            mouldSize[0] / 6,
            mouldSize[1] / 6,
        ]
        const alignmentPinDistCoordsX = {
            min: -mouldSizeHalf[0],
            mid1: -alignmentPinDistUnitSize[0],
            mid2: alignmentPinDistUnitSize[0],
            max: mouldSizeHalf[0],
        }
        const alignmentPinDistCoordsY = {
            min: -mouldSizeHalf[1],
            mid1: -alignmentPinDistUnitSize[1],
            mid2: alignmentPinDistUnitSize[1],
            max: mouldSizeHalf[1],
        }
        const alignmentPinPoints = [
            [alignmentPinDistCoordsX.min, alignmentPinDistCoordsY.mid1],
            [alignmentPinDistCoordsX.min, alignmentPinDistCoordsY.mid2],
            [alignmentPinDistCoordsX.mid1, alignmentPinDistCoordsY.max],
            [alignmentPinDistCoordsX.mid2, alignmentPinDistCoordsY.max],
            [alignmentPinDistCoordsX.max, alignmentPinDistCoordsY.mid1],
            [alignmentPinDistCoordsX.max, alignmentPinDistCoordsY.mid2],
            [alignmentPinDistCoordsX.mid1, alignmentPinDistCoordsY.min],
            [alignmentPinDistCoordsX.mid2, alignmentPinDistCoordsY.min],
        ]
        const alignmentPinPointGroups = {
            left: [alignmentPinPoints[0], alignmentPinPoints[1]],
            top: [alignmentPinPoints[2], alignmentPinPoints[3]],
            right: [alignmentPinPoints[4], alignmentPinPoints[5]],
            bottom: [alignmentPinPoints[6], alignmentPinPoints[7]],
        }

        const baseplateTextMargin = baseplateMargin * 0.666667
        const baseplateTextCoordsX = { min: baseplateTextMargin, max: baseplateSize[0] - baseplateTextMargin }
        const baseplateTextCoordsY = { min: baseplateTextMargin, max: baseplateSize[1] - baseplateTextMargin }
        const baseplateTextPoints = [
            [baseplateTextCoordsX.min, baseplateTextCoordsY.min],
            [baseplateTextCoordsX.min, baseplateTextCoordsY.max],
            [baseplateTextCoordsX.max, baseplateTextCoordsY.max],
            [baseplateTextCoordsX.max, baseplateTextCoordsY.min],
        ]

        /* ----------------------------------------
        * Preparing Model Properties, Dimensions
        * ------------------------------------- */

        /** Constant values for model */
        const modelConstants = {
        }

        /** Derived user options for the model */
        const modelOpts = {
            type,
            typeOpts,
            scale,
        }

        /** Various dimensions for model */
        const modelDims = {
            subjectSize,
            mouldSize,
            baseplateSize,
            baseplateMargin,
            cutawaySize,
            alignmentPinCutawaySize,
            mouldPartHeight,
            alignmentPinSize,
            alignmentPinHeight,
            interfaceThickness,
            fitGap,
        }

        /** Various key points for model */
        const modelPoints = {
            centrePt: defaults.vals.points.centrePt,
            baseplateTextPoints,
            alignmentPinPoints,
            alignmentPinPointGroups,
        }

        /** Components used by model */
        const modelComponents = {
            subject
        }

        /* ---------------------------------------------
        *  Model Properties
        * ----------------------------------------------
        * Properties accessible to all model functions.
        * --------------------------------------------- */

        const modelProperties = {
            metadata: {
                id: '9999',
                name: 'New Model',
                project: 'New Project',
                author: 'S. Somewhere',
                organization: 'Salvador Workshop',
                client: null,
            },
            constants: modelConstants,
            opts: modelOpts,
            dims: modelDims,
            points: modelPoints,
            components: modelComponents,
        }


        return modelProperties
    }

    const formatMouldText = (mouldTextObj) => {
        let paragraph = mouldTextObj.id + '\n'
        paragraph += mouldTextObj.name + '\n'
        paragraph += mouldTextObj.organization + '\n'
        paragraph += mouldTextObj.project

        return paragraph
    }


    //------------------------------------------------------------------------------

    /* ----------------------------------------
    * MODELLING FUNCTIONS
    * ------------------------------------- */

    /**
     * Builds a stamp that engraves one line of text data on the moulds.
     * @param {string} stampText - Text to engrave on mould
     * @returns geom3 stamp
     */
    const mouldTextLineStamp = (textLine, lineHeight) => {
        const lineStamp = engravedText({
            message: textLine,
            fontSize: lineHeight,
        })

        return lineStamp
    }

    /**
     * Builds stamps for engraving text data on the moulds.
     * @param {string} stampText - Text to engrave on mould
     * @returns geom3 stamp
     */
    const mouldDataStamp = (stampText) => {
        const defaults = castingMouldDefaults()
        const lines = stampText.split('\n')
        const lineHeight = defaults.vals.constants.textLineHeight
        const lineUnit = defaults.vals.constants.textLineHtUnit

        const lineStamps = lines.map((line, idx) => {
            const lineStamp = mouldTextLineStamp(line, lineHeight)
            return translate([0, lineUnit * idx, 0], lineStamp)
        })

        return union(...lineStamps)
    }

    const openMouldCutaway = (modelProps) => {
        const defaults = castingMouldDefaults()
        const {
            typeOpts,
        } = modelProps.opts

        const {
            subjectSize,
            mouldSize,
            baseplateSize,
            cutawaySize, interfaceThickness,
            fitGap,
        } = modelProps.dims

        const {
            subject,
        } = modelProps.components

        const defOpts = defaults.vals.types.open.defaultOpts
        const meshOpts = {
            edgeMargin: typeOpts.edgeMargin || defOpts.edgeMargin,
            holeRadius: typeOpts.holeRadius || defOpts.holeRadius,
            holeDistance: typeOpts.holeDistance || defOpts.holeDistance,
            holePattern: typeOpts.holePattern || defOpts.holePattern,
        }
        const meshAreaSize = [
            subjectSize[0] - (meshOpts.edgeMargin * 2),
            subjectSize[1] - (meshOpts.edgeMargin * 2),
        ]
        let cutawayPts = []

        if (meshOpts.holePattern == 'tri') {
            cutawayPts = geometry.getTriangularPtsInArea(
                meshAreaSize[0],
                meshAreaSize[1],
                meshOpts.holeDistance,
            )
        } else {
            cutawayPts = geometry.getSquarePtsInArea(
                meshAreaSize[0],
                meshAreaSize[1],
                meshOpts.holeDistance,
            )
        }

        const cutawayHeight = (mouldSize[2] + interfaceThickness) * 2
        const cutawayPunchBase = cylinder({ radius: meshOpts.holeRadius, height: cutawayHeight })
        const cutawayPunchElements = cutawayPts.map(cutawayPt => {
            const simplePt = [cutawayPt.x, cutawayPt.y]
            return translate([simplePt[0], simplePt[1], 0], cutawayPunchBase)
        })
        const cutawayPunch = union(...cutawayPunchElements)

        return cutawayPunch
    }

    const metadataTextStamp = (modelProps, stampTextData, stampOpts) => {
        const stampCornerPts = modelProps.points.baseplateTextPoints
        const engravingText = {
            ...modelProps.metadata,
            ...stampTextData
        }

        if (stampOpts.upperMould) {
            engravingText.name = engravingText.name + ' (1/2)'
        } else if (stampOpts.lowerMould) {
            engravingText.name = engravingText.name + ' (2/2)'
        }

        const getDataText = textVals => {
            const basicDataFilter = val => !!val
            return textVals.filter(basicDataFilter).join('\n')
        }

        const shopData = [
            engravingText.organization,
        ]
        const shopDataText = getDataText(shopData)

        const projectData = [
            engravingText.project,
            engravingText.client,
            engravingText.author,
        ]
        const projectDataText = getDataText(projectData)

        const modelData = [
            engravingText.id,
            engravingText.name,
        ]
        const modelDataText = getDataText(modelData)

        const shopDataStartPt = stampCornerPts[0]
        const shopDataStartAlignOpts = {
            modes: ['min', 'min', 'max'],
            relativeTo: shopDataStartPt,
        }
        const shopDataStartRotateOpts = [0, 0, 0]

        const projectDataStartPt = stampCornerPts[1]
        const projectDataStartAlignOpts = {
            modes: ['min', 'max', 'max'],
            relativeTo: projectDataStartPt,
        }
        const projectDataStartRotateOpts = [0, 0, TAU / -4]

        const modelDataStartPt = stampCornerPts[2]
        const modelDataStartAlignOpts = {
            modes: ['max', 'max', 'max'],
            relativeTo: modelDataStartPt,
        }
        const modelDataStartRotateOpts = [0, 0, 0]

        const shopDataEngravingText = align(
            shopDataStartAlignOpts,
            rotate(
                shopDataStartRotateOpts,
                mouldDataStamp(shopDataText),
            )
        )

        const projectDataEngravingText = align(
            projectDataStartAlignOpts,
            rotate(
                projectDataStartRotateOpts,
                mouldDataStamp(projectDataText),
            )
        )

        const modelDataEngravingText = align(
            modelDataStartAlignOpts,
            rotate(
                modelDataStartRotateOpts,
                mouldDataStamp(modelDataText),
            )
        )

        return union(
            shopDataEngravingText,
            projectDataEngravingText,
            modelDataEngravingText,
        )
    }

    const alignmentPinParts = (modelProps) => {
        const {
            alignmentPinSize,
            alignmentPinHeight,
            interfaceThickness,
        } = modelProps.dims

        const connTabData = connections.tab({
            size: alignmentPinSize,
            interfaceMargin: interfaceThickness,
        })
        const connTabProfiles = connTabData[0]

        const connTabMale = extrudeLinear({ height: alignmentPinHeight }, connTabProfiles[0])
        const connTabFemale = extrudeLinear({ height: alignmentPinHeight - interfaceThickness }, connTabProfiles[1])

        return [
            connTabMale,
            connTabFemale,
        ]
    }

    const alignmentPins = (modelProps, alignmentPinOpts) => {
        const {
            alignmentPinPoints,
            alignmentPinPointGroups,
        } = modelProps.points

        const {
            alignmentPinHeight,
            interfaceThickness,
            fitGap,
        } = modelProps.dims

        const isMale = !!alignmentPinOpts.isMale

        const alPinParts = alignmentPinParts(modelProps)
        const malePinJoint = cylinder({ radius: interfaceThickness / 2, height: alignmentPinHeight - interfaceThickness })
        let alignmentPinProfile = isMale ? alPinParts[0] : alPinParts[1]

        const alignmentModesMale = {
            left: ['max', 'center', 'max'],
            top: ['center', 'min', 'max'],
            right: ['min', 'center', 'max'],
            bottom: ['center', 'max', 'max'],
        }
        const relativePtAdjustsMale = {
            left: [-fitGap, 0, 0],
            top: [0, fitGap, 0],
            right: [fitGap, 0, 0],
            bottom: [0, -fitGap, 0],
        }
        const alignmentModesFemale = {
            left: ['max', 'center', 'max'],
            top: ['center', 'min', 'max'],
            right: ['min', 'center', 'max'],
            bottom: ['center', 'max', 'max'],
        }
        const relativePtAdjustsFemale = {
            left: [interfaceThickness, 0, -interfaceThickness],
            top: [0, -interfaceThickness, -interfaceThickness],
            right: [-interfaceThickness, 0, -interfaceThickness],
            bottom: [0, interfaceThickness, -interfaceThickness],
        }
        let alignmentModes = isMale ? alignmentModesMale : alignmentModesFemale
        let relativePtAdjusts = isMale ? relativePtAdjustsMale : relativePtAdjustsFemale
        const alPins = []

        alignmentPinPointGroups.left.forEach(aPinPt => {
            const leftRotation = [0, 0, TAU / -4]
            const leftAlignOpts = {
                modes: alignmentModes.left,
                relativeTo: [
                    aPinPt[0] + relativePtAdjusts.left[0],
                    aPinPt[1] + relativePtAdjusts.left[1],
                    interfaceThickness + relativePtAdjusts.left[2],
                ],
            }
            alPins.push(align(
                leftAlignOpts,
                rotate(leftRotation, alignmentPinProfile)
            ))
        })
        alignmentPinPointGroups.top.forEach(aPinPt => {
            const topRotation = [0, 0, TAU / 2]
            const topAlignOpts = {
                modes: alignmentModes.top,
                relativeTo: [
                    aPinPt[0] + relativePtAdjusts.top[0],
                    aPinPt[1] + relativePtAdjusts.top[1],
                    interfaceThickness + relativePtAdjusts.top[2],
                ],
            }
            alPins.push(align(
                topAlignOpts,
                rotate(topRotation, alignmentPinProfile)
            ))
        })
        alignmentPinPointGroups.right.forEach(aPinPt => {
            const rightRotation = [0, 0, TAU / 4]
            const rightAlignOpts = {
                modes: alignmentModes.right,
                relativeTo: [
                    aPinPt[0] + relativePtAdjusts.right[0],
                    aPinPt[1] + relativePtAdjusts.right[1],
                    interfaceThickness + relativePtAdjusts.right[2],
                ],
            }
            alPins.push(align(
                rightAlignOpts,
                rotate(rightRotation, alignmentPinProfile)
            ))
        })
        alignmentPinPointGroups.bottom.forEach(aPinPt => {
            const bottomRotation = [0, 0, 0]
            const bottomAlignOpts = {
                modes: alignmentModes.bottom,
                relativeTo: [
                    aPinPt[0] + relativePtAdjusts.bottom[0],
                    aPinPt[1] + relativePtAdjusts.bottom[1],
                    interfaceThickness + relativePtAdjusts.bottom[2],
                ],
            }
            alPins.push(align(
                bottomAlignOpts,
                rotate(bottomRotation, alignmentPinProfile)
            ))
        })

        if (isMale) {
            alignmentPinPoints.forEach(alPinPt => {
                alPins.push(position.ctrMax(malePinJoint, alPinPt))
            })
        }

        return union(...alPins)
    }

    /**
     * New Model 1
     * @param {*} opts 
     * @returns Array with model, parts, and properties: [`geom3`, `Object.<string, geom3>`, `Object.<string, any>`]
     * @memberof extModels
     */
    const flatOnePartMould = (opts) => {
        const defaults = castingMouldDefaults()
        const initOpts = castingMouldOpts(opts)
        const modelProperties = castingMouldProps(initOpts)
        const {
            type,
        } = modelProperties.opts

        const {
            subjectSize,
            mouldSize,
            baseplateSize,
            cutawaySize,
            interfaceThickness,
            fitGap,
        } = modelProperties.dims

        const {
            subject,
        } = modelProperties.components

        let mouldBaseProfile = roundedRectangle({
            size: [mouldSize[0], mouldSize[1]],
            roundRadius: interfaceThickness
        })
        let mouldBase = extrudeLinear({ height: mouldSize[2] }, mouldBaseProfile)

        const mouldFootprint = roundedRectangle({
            size: [baseplateSize[0], baseplateSize[1]],
            roundRadius: interfaceThickness
        })
        let mouldBaseplate = extrudeLinear({ height: interfaceThickness }, mouldFootprint)

        // Add baseplate to face side of mould
        mouldBase = position.ctrMax(mouldBase, [0, 0, -interfaceThickness])
        mouldBaseplate = position.ctrMax(mouldBaseplate)

        let blankMould = union(
            mouldBase,
            mouldBaseplate
        )

        const mouldBaseplateText = position.ctrMax(metadataTextStamp(
            modelProperties,
            {},
            {},
        ))
        blankMould = subtract(
            blankMould,
            mouldBaseplateText,
        )

        blankMould = align({
            modes: ['center', 'center', 'min'],
        }, blankMould)
        // HACK: using `relativeTo` to nudge the subject down to avoid certain issues.
        const alignedSubject = align({
            modes: ['center', 'center', 'min'],
            // relativeTo: [0, 0, -0.2],
        }, subject)

        // Cutting impression into mould

        const cutMould = subtract(
            blankMould,
            alignedSubject
        )

        let finalShape = align({
            modes: ['center', 'center', 'center'],
        }, cutMould)

        if (type == 'open') {
            const openMouldPunch = openMouldCutaway(modelProperties)
            finalShape = subtract(finalShape, openMouldPunch)
        }

        const mainModel = position.ctr(rotate([TAU / 2, 0, 0], finalShape))

        const modelParts = {
            mainModel,
            metadataTextStamp: metadataTextStamp(modelProperties, {}, {}),
            alignmentPins: alignmentPins(modelProperties, {}),
        }

        return [mainModel, modelParts, modelProperties]
    }

    /**
     * New Model 2
     * @param {*} opts 
     * @returns Array with model, parts, and properties: [`geom3`, `Object.<string, geom3>`, `Object.<string, any>`]
     * @memberof extModels
     */
    const flatTwoPartMould = (opts) => {
        const defaults = castingMouldDefaults()
        const initOpts = castingMouldOpts(opts)
        const modelProperties = castingMouldProps(initOpts)

        const {
            type,
        } = modelProperties.opts

        const {
            subjectSize,
            mouldSize,
            baseplateSize,
            cutawaySize,
            alignmentPinCutawaySize,
            mouldPartHeight,
            alignmentPinSize,
            alignmentPinHeight,
            interfaceThickness,
            fitGap,
        } = modelProperties.dims

        const {
            subject,
        } = modelProperties.components

        let mouldBaseProfile = roundedRectangle({
            size: [mouldSize[0], mouldSize[1]],
            roundRadius: interfaceThickness
        })
        let mouldBase = extrudeLinear({ height: mouldSize[2] }, mouldBaseProfile)

        const mouldFootprint = roundedRectangle({
            size: [baseplateSize[0], baseplateSize[1]],
            roundRadius: interfaceThickness
        })
        let mouldBaseplate = extrudeLinear({ height: interfaceThickness }, mouldFootprint)

        // Add baseplate to face side of mould
        mouldBase = position.ctrMax(mouldBase, [0, 0, -interfaceThickness])
        mouldBaseplate = position.ctrMax(mouldBaseplate)

        let blankMould = union(
            mouldBase,
            mouldBaseplate
        )

        // Add text to face side of mould
        const bpTextUpper = position.ctrMax(metadataTextStamp(
            modelProperties,
            {},
            { upperMould: true },
        ))
        blankMould = subtract(
            blankMould,
            bpTextUpper,
        )

        // Add baseplate to back side of mould
        blankMould = position.ctrMin(blankMould, [0, 0, interfaceThickness])
        mouldBaseplate = position.ctrMin(mouldBaseplate)

        blankMould = union(
            blankMould,
            mouldBaseplate
        )

        // Add text to back side of mould
        let bpTextLower = metadataTextStamp(
            modelProperties,
            {},
            { lowerMould: true },
        )
        bpTextLower = align(
            { modes: ['center', 'center', 'min'] },
            rotate([Math.PI, 0, 0], bpTextLower)
        )
        blankMould = subtract(
            blankMould,
            bpTextLower,
        )

        blankMould = align({
            modes: ['center', 'center', 'center'],
        }, blankMould)

        // Cutting impression into mould

        const cutMould = subtract(
            blankMould,
            subject
        )

        // Cutting mould into two parts

        const cutawayBase = cuboid({
            size: cutawaySize,
        })
        const faceCutaway = align({
            modes: ['center', 'center', 'max'],
        }, cutawayBase)

        const backCutaway = align({
            modes: ['center', 'center', 'min'],
        }, cutawayBase)

        let upperMould = rotate([Math.PI, 0, 0], subtract(cutMould, faceCutaway))
        upperMould = align({ modes: ['center', 'center', 'center'], }, upperMould)
        const upperAlignmentPins = alignmentPins(modelProperties, {})
        upperMould = union(
            position.ctrMax(upperMould),
            upperAlignmentPins,
        )


        // const alignmentPinCutaway = cuboid({size: alignmentPinCutawaySize})
        let lowerMould = subtract(cutMould, backCutaway)
        lowerMould = align({ modes: ['center', 'center', 'center'], }, lowerMould)
        const lowerAlignmentPins = alignmentPins(modelProperties, { isMale: true })
        lowerMould = union(
            position.ctrMax(lowerMould),
            lowerAlignmentPins,
        )
        // lowerMould = subtract(
        //     lowerMould,
        //     position.ctrMin(alignmentPinCutaway),
        // )

        if (type == 'open') {
            const openMouldPunch = openMouldCutaway(modelProperties)
            upperMould = subtract(upperMould, openMouldPunch)
            lowerMould = subtract(lowerMould, openMouldPunch)
        }

        upperMould = generalize({ snap: true }, upperMould)
        upperMould = generalize({ simplify: true }, upperMould)
        upperMould = position.ctr(upperMould)

        lowerMould = generalize({ snap: true }, lowerMould)
        lowerMould = generalize({ simplify: true }, lowerMould)
        lowerMould = position.ctr(lowerMould)

        const mainModel = [
            upperMould,
            lowerMould,
        ]

        const modelParts = {
            upperMould,
            lowerMould,
            metadataTextStamp: metadataTextStamp(modelProperties, {}, {}),
            alignmentPins: alignmentPins(modelProperties, {}),
        }

        return [mainModel, modelParts, modelProperties]
    }

    /**
     * ...
     * @param {*} opts 
     * @returns Array with model, parts, and properties: [`geom3`, `Object.<string, geom3>`, `Object.<string, any>`]
     * @memberof extModels
     */
    const flatCutterMould = (opts) => {
        const defaults = castingMouldDefaults()
        const initOpts = castingMouldOpts(opts)
        const modelProperties = castingMouldProps(initOpts)

        const mainModel = cuboid()
        const modelParts = {
            mainModel,
        }

        return [mainModel, modelParts, modelProperties]
    }

    /**
     * ...
     * @param {*} opts 
     * @returns Array with model, parts, and properties: [`geom3`, `Object.<string, geom3>`, `Object.<string, any>`]
     * @memberof extModels
     */
    const radialMould = (opts) => {
        const defaults = castingMouldDefaults()
        const initOpts = castingMouldOpts(opts)
        const modelProperties = castingMouldProps(initOpts)

        const mainModel = cuboid()
        const modelParts = {
            mainModel,
        }

        return [mainModel, modelParts, modelProperties]
    }

    return {
        defaults: castingMouldDefaults,
        props: castingMouldProps,
        flatOnePartMould,
        flatTwoPartMould,
        flatCutterMould,
        radialMould,
    }
}

module.exports = {
    init: castingMouldInit
}
