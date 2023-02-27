//import list from '../data-mes_aides.json'

import * as jsondiffpatch from 'jsondiffpatch'
import fs from "fs"

import getExplanations from './explanations.js'

//const data = JSON.parse(fs.readFileSync('data-mes_aides.json', 'utf-8'))
const data = JSON.parse(fs.readFileSync('data-2022-12-05.json', 'utf-8')).filter(e => e.src_alias === 'mes_aides_aides')


data.forEach(e => {
	e.ex = getExplanations(e)
})
console.log('here', data.length)
console.log('here', data[0])
