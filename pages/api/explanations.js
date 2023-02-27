//import list from '../data-mes_aides.json'
//import data from '../../data-2022-12-05.json'
//import data from '../../data-mes_aides.json'

import * as jsondiffpatch from 'jsondiffpatch'
import fs from "fs"

import {getExplanations} from '../../lib/explanations.js'

const data = JSON.parse(fs.readFileSync('data-mes_aides.json', 'utf-8'))
//const data = JSON.parse(fs.readFileSync('data-2022-12-05.json', 'utf-8')).filter(e => e.src_alias === 'mes_aides_aides')

const filtered = data.filter(e => e.src_alias === 'mes_aides_aides')
const diffs = filtered.map((row, i) => {
	console.log((i+1)/filtered.length)
	 const base = {
      data: row,
      before: row.data_prev,
      after: row.data_next,
    }
	base.explanations = getExplanations(base)
	return base
})


// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default function handler(req, res) {
	console.log('here', diffs.length)
	console.log('here', diffs.filter(e => !e.fullyExplained).length)

  res.status(200).json({ name: 'John Doe' })
}
