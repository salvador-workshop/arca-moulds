// "use strict"
const jscad = require('@jscad/modeling')

const { cube, cylinder, sphere, cylinderElliptic, circle, cuboid, roundedCuboid, roundedRectangle } = jscad.primitives
const { colorize } = jscad.colors
const { align, translate, rotate, mirror } = jscad.transforms
const { intersect, subtract, union } = jscad.booleans
const { extrudeLinear } = jscad.extrusions
const { measureDimensions, measureBoundingBox } = jscad.measurements
const { vectorText } = jscad.text
const { hullChain } = jscad.hulls


/**
 * Flat 2-Piece Mould
 * @param {*} opts 
 * @returns array of geom3
 * @author RJ Salvador (Salvador Workshop)
 */
const flatTwoPieceMould = (opts, subject) => {

  const INCHES_MM_FACTOR = 25.4
  const inchesToMm = (inputIn) => inputIn * INCHES_MM_FACTOR

  /* ----------------------------------------
   * Base Params, Dimensions
   * ------------------------------------- */

  const interThickness = opts.interfaceThickness || 1.333
  const interThicknessLg = opts.interfaceThicknessLg || 1.5
  const typFitGap = 0.1984375 // 1/128 of an inch

  let mouldText = opts.mouldText || {}
  let mouldTextValues = {
    id: mouldText.id || 'M0001.2',
    name: mouldText.name || 'Flat Two-Piece\nMould',
    project: mouldText.project || '(Moulds, 2026)',
    author: mouldText.author || 'RJ Salvador',
    organization: mouldText.organization || 'Salvador\nWorkshop',
    client: mouldText.client || '---',
  }

  const subjectDims = measureDimensions(subject)

  const mouldDims = [
    subjectDims[0] + (interThickness * 2),
    subjectDims[1] + (interThickness * 2),
    subjectDims[2] + (interThickness * 2),
  ]
  const mouldPartHeight = mouldDims[2] / 2

  const baseplateDims = [
    mouldDims[0] + (interThickness * 6),
    mouldDims[1] + (interThickness * 6),
    interThickness,
  ]
  const cutawayDims = [
    baseplateDims[0] + (interThickness * 2),
    baseplateDims[1] + (interThickness * 2),
    subjectDims[2] + (interThickness * 4),
  ]

  const alignmentPinRad = interThickness * 0.75
  const alignmentPinOffset = interThickness * 0.5
  const alignmentPinHeight = mouldPartHeight + (interThickness * 1.2)
  const bpNotchRad = interThickness * 1.5


  /* ----------------------------------------
   * Util Functions
   * ------------------------------------- */


  /**
 * Creates a simple 2D line of text
 * @memberof models.profiles.text2d
 * @instance
 * @param {*} param0 
 * @returns ...
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
   * @returns ...
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
   * @returns ...
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


  /* ----------------------------------------
   * Core Functions
   * ------------------------------------- */


  /**
   * Formats text for engraving on a surface
   * @param {Object} mouldTextObj 
   * @returns string for engraving, broken up by newline chars
   */
  const formatMouldText = (mouldTextObj) => {
    let paragraph = mouldTextObj.id + '\n'
    paragraph += mouldTextObj.name + '\n'
    paragraph += mouldTextObj.organization + '\n'
    paragraph += mouldTextObj.project

    return paragraph
  }


  /**
   * Builds stamps for engraving text data on the moulds.
   * @param {string} stampText - Text to engrave on mould
   * @returns geom3 stamp
   */
  const mouldDataStamp = (stampText) => {
    const lines = stampText.split('\n')
    console.log(lines)
    const lineHeight = 3
    const lineUnit = lineHeight * -2.5

    const lineStamps = lines.map((line, idx) => {
      console.log(line)
      const lineStamp = engravedText({
        message: line,
        fontSize: lineHeight,
      })
      return translate([0, lineUnit * idx, 0], lineStamp)
    })

    return union(...lineStamps)
  }


  /**
   * Base alignment pin
   * @returns Two-element array of geom3
   */
  const mouldAlignmentPin = () => {
    const pin = cylinder({ radius: alignmentPinRad, height: alignmentPinHeight })
    const fittedPin = cylinder({ radius: alignmentPinRad + typFitGap, height: mouldPartHeight - interThickness })
    const baseSocket = cuboid({
      size: [
        interThickness * 3,
        interThickness * 3,
        mouldPartHeight
      ]
    })

    return [
      pin,
      baseSocket,
      fittedPin,
    ]
  }


  /**
   * Calculates points for locating alignment pins
   * @returns array of co-ords for alignment pins
   */
  const mouldAlignmentPinPts = (mouldDims) => {
    console.log('mouldDims', mouldDims)
    return [
      [mouldDims[0] / 2 + alignmentPinOffset, mouldDims[1] / 6, 0], // x
      [mouldDims[0] / 2 + alignmentPinOffset, mouldDims[1] / -6, 0], // x
      [mouldDims[0] / 6, mouldDims[1] / 2 + alignmentPinOffset, 0], // y
      [mouldDims[0] / -6, mouldDims[1] / 2 + alignmentPinOffset, 0], // y
      [mouldDims[0] / -2 - alignmentPinOffset, mouldDims[1] / 6, 0], // -x
      [mouldDims[0] / -2 - alignmentPinOffset, mouldDims[1] / -6, 0], // -x
      [mouldDims[0] / 6, mouldDims[1] / -2 - alignmentPinOffset, 0], // -y
      [mouldDims[0] / -6, mouldDims[1] / -2 - alignmentPinOffset, 0], // -y
    ]
  }


  /**
   * Calculates points for locating baseplate notches
   * @returns array of co-ords for baseplate notches
   */
  const mouldBaseplateNotchPts = (baseplateDims) => {
    console.log('baseplateDims', baseplateDims)
    return [
      [baseplateDims[0] / 2, baseplateDims[1] / 4, 0], // x 
      [baseplateDims[0] / 2, 0, 0], // x
      [baseplateDims[0] / 2, baseplateDims[1] / -4, 0], // x
      [baseplateDims[0] / 4, baseplateDims[1] / 2, 0], // y
      [0, baseplateDims[1] / 2, 0], // y
      [baseplateDims[0] / -4, baseplateDims[1] / 2, 0], // y
      [baseplateDims[0] / -2, baseplateDims[1] / 4, 0], // -x
      [baseplateDims[0] / -2, 0, 0], // -x
      [baseplateDims[0] / -2, baseplateDims[1] / -4, 0], // -x
      [baseplateDims[0] / 4, baseplateDims[1] / -2, 0], // -y
      [0, baseplateDims[1] / -2, 0], // -y
      [baseplateDims[0] / -4, baseplateDims[1] / -2, 0], // -y
    ]
  }


  /**
   * Cutaway for Baseplate notch
   * @returns geom3
   */
  const mouldBaseplateNotchCut = () => {
    const baseShape = cylinder({ radius: bpNotchRad + typFitGap, height: interThickness * 2 })
    return baseShape
  }


  /**
   * Builds basic mould shape
   * @returns Two element array of geom3: [top, bottom]
   */
  const mouldBaseShape = () => {
    let mouldBase = roundedCuboid({
      size: mouldDims,
      roundRadius: interThickness,
    })

    const mouldFootprint = roundedRectangle({
      size: [baseplateDims[0], baseplateDims[1]],
      roundRadius: interThickness
    })
    let mouldBaseplate = extrudeLinear({ height: interThickness }, mouldFootprint)

    // Cut notches into baseplate

    const baseplatePts = mouldBaseplateNotchPts(baseplateDims)
    console.log('baseplatePts', baseplatePts)
    const bpNotches = baseplatePts.map((bPt) => {
      return translate(bPt, mouldBaseplateNotchCut())
    })
    mouldBaseplate = subtract(mouldBaseplate, bpNotches)

    // Add baseplate to face side of mould

    mouldBaseplate = align({
      modes: ['center', 'center', 'max'],
    }, mouldBaseplate)
    mouldBase = align({
      modes: ['center', 'center', 'max'],
    }, mouldBase)

    const upperText = {
      ...mouldTextValues,
      name: mouldTextValues.name + ' UPPER'
    }
    let stampText = formatMouldText(upperText)
    let engravingText = align(
      { modes: ['center', 'center', 'max'], },
      mouldDataStamp(stampText)
    )
    let blankMould = union(
      mouldBase,
      mouldBaseplate
    )

    // Engrave text into baseplate

    blankMould = subtract(
      blankMould,
      engravingText,
    )

    // Add baseplate to back side of mould

    mouldBaseplate = align({
      modes: ['center', 'center', 'min'],
    }, mouldBaseplate)
    blankMould = align({
      modes: ['center', 'center', 'min'],
    }, blankMould)
    blankMould = union(
      blankMould,
      mouldBaseplate
    )
    const lowerText = {
      ...mouldTextValues,
      name: mouldTextValues.name + ' LOWER'
    }
    stampText = formatMouldText(lowerText)
    engravingText = align({
      modes: ['center', 'center', 'min'],
    },
      rotate([Math.PI, 0, 0], mouldDataStamp(stampText)))

    // Engrave text into baseplate

    blankMould = subtract(
      blankMould,
      engravingText
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
      size: cutawayDims,
    })
    const faceCutaway = align({
      modes: ['center', 'center', 'max'],
    }, cutawayBase)

    const backCutaway = align({
      modes: ['center', 'center', 'min'],
    }, cutawayBase)

    let upperMould = rotate([Math.PI, 0, 0], subtract(cutMould, faceCutaway))
    upperMould = align({ modes: ['center', 'center', 'center'], }, upperMould)

    let lowerMould = subtract(cutMould, backCutaway)
    lowerMould = align({ modes: ['center', 'center', 'center'], }, lowerMould)

    // Add alignment pins

    const alignmentPin = mouldAlignmentPin()
    const alignmentPinPts = mouldAlignmentPinPts(mouldDims)
    console.log('alignmentPinPts', alignmentPinPts)

    const placedAlignmentPins = alignmentPinPts.map(pinPt => {
      return translate(pinPt, alignmentPin[0]);
    })

    const baseAlignmentSockets = alignmentPinPts.map(pinPt => {
      return translate(pinPt, alignmentPin[1]);
    })

    upperMould = union(
      upperMould,
      translate([0, 0, interThickness * 0.6], placedAlignmentPins),
    )

    lowerMould = union(
      lowerMould,
      translate([0, 0, 0], baseAlignmentSockets),
    )
    alignmentPinPts.forEach(pinPt => {
      const pinCutaway = translate([
        pinPt[0],
        pinPt[1],
        pinPt[2] + (interThickness / 2),
      ], alignmentPin[2])
      lowerMould = subtract(lowerMould, pinCutaway)
    })

    return [
      upperMould,
      lowerMould,
    ]
  }


  /* ----------------------------------------
   * Final two-piece mould
   * ------------------------------------- */

  const baseShape = mouldBaseShape()
  const alignmentPin = mouldAlignmentPin()

  return [
    baseShape[0],
    baseShape[1],
    alignmentPin[0],
    alignmentPin[1],
  ]
}


//===========================================================================//


/* ----------------------------------------
 * Test subjects for mould function
 * ------------------------------------- */
const mouldSubject1 = cuboid({
  size: [50.8, 50.8, 8]
})


/**
 * Main function to be rendered by JSCAD
 * @returns `geom3` or `geom3[]`
 */
function main() {
  const twoPieceMould = flatTwoPieceMould({
    interfaceThickness: 1.333,
    interfaceThicknessLg: 1.5,
  }, mouldSubject1)

  const spaceUnit = 63.5

  return [
    twoPieceMould[0],
    translate([0, spaceUnit, 0], twoPieceMould[1]),
    translate([spaceUnit, spaceUnit, 0], twoPieceMould[4]),
  ]
}

module.exports = { main }
