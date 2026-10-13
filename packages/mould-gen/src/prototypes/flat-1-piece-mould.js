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
 * Flat 1-Piece Mould
 * @param {*} opts 
 * @returns array of geom3
 * @author RJ Salvador (Salvador Workshop)
 */
const flatOnePieceMould = (opts, subject) => {

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
    id: mouldText.id || 'M0003',
    name: mouldText.name || 'Flat One-Piece\nMould',
    project: mouldText.project || '(Moulds, 2026)',
    author: mouldText.author || 'RJ Salvador',
    organization: mouldText.organization || 'Salvador\nWorkshop',
    client: mouldText.client || '---',
  }

  const subjectDims = measureDimensions(subject)

  const mouldDims = [
    subjectDims[0] + (interThickness * 2),
    subjectDims[1] + (interThickness * 2),
    subjectDims[2] + interThickness,
  ]
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
    let mouldBaseProfile = roundedRectangle({
      size: [mouldDims[0], mouldDims[1]],
      roundRadius: interThickness
    })
    let mouldBase = extrudeLinear({ height: mouldDims[2] }, mouldBaseProfile)

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
      ...mouldTextValues
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

    blankMould = align({
      modes: ['center', 'center', 'min'],
    }, blankMould)
    const alignedSubject = align({
      modes: ['center', 'center', 'min'],
    }, subject)

    // Cutting impression into mould

    const cutMould = subtract(
      blankMould,
      alignedSubject
    )

    let finalShape = align({
      modes: ['center', 'center', 'center'],
    }, cutMould)

    return finalShape
  }


  /* ----------------------------------------
   * Final two-piece mould
   * ------------------------------------- */

  const baseShape = mouldBaseShape()

  return baseShape
  
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
  const onePieceMould = flatOnePieceMould({
    interfaceThickness: 1.333,
    interfaceThicknessLg: 1.5,
  }, mouldSubject1)

  const spaceUnit = 63.5

  return [
    mouldSubject1,
    translate([0, spaceUnit, 0], onePieceMould)
  ]
}

module.exports = { main }
