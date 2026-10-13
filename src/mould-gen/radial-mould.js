// "use strict"
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
const { colorize } = jscad.colors
const { align, translate, rotate, mirror } = jscad.transforms
const { intersect, subtract, union, scission } = jscad.booleans
const { extrudeLinear, extrudeRotate, project } = jscad.extrusions
const { measureDimensions, measureBoundingBox, measureVolume } = jscad.measurements
const { vectorText } = jscad.text
const { hullChain } = jscad.hulls
const { toOutlines } = jscad.geometries.geom2

/**
 * Radial Mould
 * @param {*} opts 
 * @param {geom3} subject 
 * @returns array of geom3
 */
const radialMould = (opts, subject) => {

  /* ----------------------------------------
   * Base Params, Dimensions
   * ------------------------------------- */

  const segments = opts.segments || 8
  const style = opts.style || 'jar'
  let mouldText = opts.mouldText || {}
  let mouldTextValues = {
    id: mouldText.id || 'M0002.2',
    name: mouldText.name || 'Radial\nMould',
    project: mouldText.project || '(Moulds\n2026)',
    author: mouldText.author || 'RJ Salvador',
    organization: mouldText.organization || 'Salvador\nWorkshop',
    client: mouldText.client || '---',
    numSlices: `${segments}`,
  }

  const interfaceThickness = 1.333
  const typFitGap = 0.1984375 // 1/128 of an inch
  const mouldMargin = interfaceThickness

  const subjectDims = measureDimensions(subject)
  const subjectBbox = measureBoundingBox(subject)
  const subjRadius = Math.max(subjectDims[0], subjectDims[1]) / 2
  const mouldDims = [
    subjectDims[0] + (interfaceThickness * 2),
    subjectDims[1] + (interfaceThickness * 2),
    subjectDims[2] + (interfaceThickness * 2),
  ]
  const baseplateDims = [
    mouldDims[0] + (interfaceThickness * 2),
    mouldDims[1] + (interfaceThickness * 2),
    interfaceThickness,
  ]
        const grooveDepth = 2.5
    const grooveWidth = 2 * grooveDepth / Math.sqrt(3)
  console.log('grooveDepth', grooveDepth)
  console.log('grooveWidth', grooveWidth)
      let mouldSliceHeight = mouldDims[2] + (interfaceThickness * 2)
    if (style == 'jar') {
      mouldSliceHeight = mouldDims[2]
    }
    if (style == 'tube') {
      mouldSliceHeight = subjectDims[2]
    }
    const endRadius = Math.max(mouldDims[0], mouldDims[1]) / 2 + mouldMargin + interfaceThickness
    const lidRadius = endRadius - grooveDepth
    const mouldSliceRadius = endRadius + grooveDepth
    const mouldSliceAngle = Math.PI * 2 / segments
  const mouldSliceProfile = align(
      { modes: ['center', 'min', 'center'] },
      rotate(
        [0, 0, mouldSliceAngle / 2 + (Math.PI / -2)],
        triangle({ type: 'SAS', values: [mouldSliceRadius, mouldSliceAngle, mouldSliceRadius] })
      )
    )
  const mouldSliceProfileDims = measureDimensions(mouldSliceProfile)
console.log(mouldSliceProfileDims)

  const flatAreas = mouldSliceHeight * 0.275
  const numGrooves = Math.floor((mouldSliceHeight - flatAreas) / grooveWidth)
/* ----------------------------------------
   * Util Functions
   * ------------------------------------- */

  const sortByGeom3Volume = (a,b) => {
      const volA = measureVolume(a)
      const volB = measureVolume(b)
      console.log(`${volA}, ${a.polygons.length}\n${volB}, ${b.polygons.length}`)
      return volB - volA
    }


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
    const engravingDepth = interfaceThickness * 0.37
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
  const formatMouldText = (mouldTextObj, style='slice') => {
    let paragraph = mouldTextObj.id + '\n'
    
    if (style == 'slice') {
      paragraph += '1 of ' + mouldTextObj.numSlices
    } else {
    // default to "end" style
      paragraph += mouldTextObj.name + '\n'
      paragraph += mouldTextObj.project
    }

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

  const mouldSlice = () => {
    // const mouldSliceBase = cylinder({radius: mouldSliceRadius, mouldSliceHeight})
    const mSlice = translate(
      [0, 0, interfaceThickness * -2],
      extrudeLinear({ height: mouldSliceHeight }, mouldSliceProfile)
    )
    return mSlice
  }

  const componentSlice = () => {
    const mSlice = mouldSlice()
    const mSliceBbox = measureBoundingBox(mSlice)

    const grooveProfile = triangle({ type: 'AAS', values: [Math.PI / 3, Math.PI / 3, grooveWidth] })
    let groove = extrudeLinear({height:  mouldSliceProfileDims[0]}, grooveProfile)
    groove = rotate([Math.PI, Math.PI/2, 0], groove)
    groove = align({modes: ['min', 'max', 'center'], relativeTo:[
      mSliceBbox[0][0],
      mSliceBbox[1][1],
      mSliceBbox[0][2],
    ]}, groove)

    const grooves = []
    for (let idx = 0; idx <= numGrooves; idx++) {
      const offset = mouldSliceHeight / numGrooves * idx
      
      grooves.push(translate([0, 0, offset], groove))
    }

    return subtract(
      mSlice,
      ...grooves
      )
  }

  const cutComponentSlice = () => {
    let mSlice = componentSlice()

    return subtract(
      mSlice,
      align({
      modes: ['center', 'center', 'min'],
    }, subject)
    )
  }

  const detailedComponentSlice = () => {
    let cSliceParts = scission(cutComponentSlice())
    cSliceParts.sort(sortByGeom3Volume)
    const cSlice = cSliceParts[0]

    const flatSlice = align({modes:['center', 'center', 'min']},
      rotate([Math.PI / -2, 0, 0], cSlice))
    
    let infoPlate = cuboid({size: [
      15,
      25,
      grooveDepth,
    ]})
    infoPlate = align({modes:['center', 'center', 'min']}, infoPlate)
    const infoSlice = union(flatSlice, infoPlate)
    
    const sliceText = {
      ...mouldTextValues,
    }
    let stampText = formatMouldText(sliceText)
    let engravingText = align(
      { modes: ['center', 'center', 'min'], },
      rotate([0, Math.PI, Math.PI/2],mouldDataStamp(stampText))
    )

    const pinHeight = grooveDepth - typFitGap
    const alignmentPin = cuboid({size: [
      grooveDepth,
      grooveWidth / 2 + grooveDepth,
      pinHeight
    ]})
    
const finalShape = subtract(infoSlice, engravingText)
    return union(
      finalShape,
      translate([0, mouldSliceHeight / 2 + (grooveDepth * 0.2), pinHeight / 2], alignmentPin)
    )
  }

  const assembledComponentSlices = () => {
    let baseSlice = detailedComponentSlice()
    baseSlice = rotate([Math.PI / 2, 0, 0], baseSlice)
    baseSlice = align({modes: ['center', 'min', 'center']}, baseSlice)
    
    const baseAngle = Math.PI * 2 / segments
    const slices = []
    for (let idx = 0; idx < segments; idx++) {
      slices.push(rotate([0, 0, baseAngle * idx], baseSlice))
    }

// let testSurface = cylinder({
//       radius: lidRadius,
//       height: interfaceThickness
//     })
//     testSurface = align(
//       {
//         modes:['center', 'center', 'min'],
//         relativeTo:[0, 0, subjectBbox[1][2]],
//       },
//       testSurface
//     )
    
    return union(...slices)
    // return union(...slices, testSurface)
  }

  const topEndCore = () => {
    
    let topEndSurface = cylinder({
      radius: lidRadius,
      height: interfaceThickness
    })
    topEndSurface = align(
      {
        modes:['center', 'center', 'min'],
        relativeTo:[0, 0, subjectBbox[1][2]],
      },
      topEndSurface
    )
    
    let topEndBlank = cylinder({
      radius: subjRadius - interfaceThickness,
      height: subjectDims[2] + interfaceThickness
    })
    topEndBlank = align(
      {
        modes:['center', 'center', 'min'],
        relativeTo:[0, 0, subjectBbox[0][2]],
      },
      topEndBlank
    )

    topEndBlank = union(
      topEndSurface,
      topEndBlank
    )

    return subtract(
      topEndBlank,
      subject
    )
  }

  const detailedTopEnd = () => {
    let cTopEndParts = scission(topEndCore())
    cTopEndParts.sort(sortByGeom3Volume)

    const cTopEnd = align(
      { modes: ['center', 'center', 'min'] },
      rotate([0, Math.PI, 0], cTopEndParts[0])
    )

    const alignmentPinCutawayDims = [
      grooveDepth + (typFitGap * 2),
        grooveDepth + (typFitGap * 2),
        interfaceThickness * 2,
    ]

    const alignmentPinCutaway = cuboid({
      size: alignmentPinCutawayDims
    })
    
    let alignmentPinSocket = cuboid({
      size: [
        alignmentPinCutawayDims[0] + (grooveDepth * 2),
        alignmentPinCutawayDims[1] + grooveDepth,
        interfaceThickness,
      ]
    })
    alignmentPinSocket = subtract(
      align({modes: ['center', 'max', 'center']}, alignmentPinSocket),
      align({modes: ['center', 'max', 'center']}, alignmentPinCutaway)
    )
    alignmentPinSocket = align(
      {modes: ['center', 'center', 'center'], relativeTo:[0, lidRadius, interfaceThickness / 2]},
      alignmentPinSocket
    )

    const alignmentPinSockets = []
    for (let idx = 0; idx < segments; idx++) {
      const baseAngle = Math.PI * 2 / segments
      const angle = idx * baseAngle
      alignmentPinSockets.push(rotate([0, 0, angle], alignmentPinSocket))
    }
    const detailedTopEnd = union(
      cTopEnd,
      ...alignmentPinSockets
    )
    
    const sliceText = {
      ...mouldTextValues,
    }
    let stampText = formatMouldText(sliceText, 'end')
    let engravingText = align(
      { modes: ['center', 'center', 'min'], },
      rotate([0, Math.PI, Math.PI/2],mouldDataStamp(stampText))
    )

    let finalShape = subtract(detailedTopEnd, engravingText)

    // return union(
    //   finalShape,
    //   alignmentPinSocket,
    // )
    return finalShape
  }
  
  /* ----------------------------------------
   * Final Assembly
   * ------------------------------------- */

  return [
  detailedComponentSlice(),
    detailedTopEnd(),
    assembledComponentSlices()
]
  
}

/* ----------------------------------------
 * Test subjects
 * ------------------------------------- */

const mouldSubjectProfile = circle({ radius: 25.4, segments: 16 })
let mouldSubject1 = extrudeLinear({ height: 50.8 }, mouldSubjectProfile)
mouldSubject1 = align({ modes: ['center', 'center', 'center'] }, mouldSubject1)
const mouldSubject1Bbox = measureBoundingBox(mouldSubject1)
console.log(mouldSubject1Bbox)
mouldSubject1 = subtract(
  mouldSubject1,
  align(
    { modes: ['center', 'center', 'max'], relativeTo:[0,0,mouldSubject1Bbox[1][2]] },
    cylinder({radius: 8, height: 8, segments: 4})
  )
)

/**
 * Main function to be rendered by JSCAD
 * @returns `geom3` or `geom3[]`
 */
function main() {
  const mould = radialMould({ segments: 8 }, mouldSubject1)

  const spaceUnit = 63.5

  return [
    mouldSubject1,
    translate([spaceUnit, 0, 0], mould[0]),
    translate([spaceUnit, spaceUnit, 0], mould[1]),
    translate([spaceUnit * 2, spaceUnit, 0], mould[2]),
  ]

  // return mould
}

module.exports = { main }
