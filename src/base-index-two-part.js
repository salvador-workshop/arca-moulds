"use strict"

const jscad = require('@jscad/modeling')
const swcadJs = require('swcad-js').init({ jscad });

const castingMouldModule = require('mould-gen/src/casting-mould')
const castingMould = castingMouldModule.init({ jscad, swcadJs })


/* ----------------------------------------
 * Mould Prep
 * ------------------------------------- */


const castingSubject = require('./model.stl')
const castMouldData1 = castingMould.flatOnePartMould({
    subject: castingSubject,
})
const castMould = castMouldData1[0]


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
