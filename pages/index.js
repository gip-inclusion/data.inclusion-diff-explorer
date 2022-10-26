import * as jsondiffpatch from 'jsondiffpatch'
import localforage from 'localforage'
import { useState, useEffect } from 'react'

import Head from 'next/head'
import styles from '../styles/Home.module.css'

//import list from '../subset.json'
import list from '../subsetXdora14.json'

import 'jsondiffpatch/dist/formatters-styles/html.css'


const migrations = {
  fee: function(av) {
    if (av?.hasFee !== undefined) {
      if (av.hasFee) {
        return {...av, hasFee: undefined, feeCondition: 3}
      } else {
        return {...av, hasFee: undefined, feeCondition: 1}
      }
    } else {
      return av
    }
  },
  subcategories: function(av, ap) {

  }
}

const diffExplanations = {
  mes_aides_aides: {
    dates: function(before, after, diff) {
      const keys = new Set(Object.keys(diff?.fields ||  {}))
      keys.delete("Modifié le")
      keys.delete("Modifiée par")
      keys.delete("Créée le")
      if (keys.size == 0) {
        return {
          applied: true,
          after: after,
        }
      }
      return {
        applied: false,
        after: before
      }
    }
  },
  dora: {
    fee: function(before, after, diff) {
      const keys = Object.keys(diff)
      if (keys.length == 2 && keys[0] == "hasFee" && keys[1] == "feeCondition") {
        return {
          applied: true,
          after: after,
        }
      }
      return {
        applied: false,
        after: before
      }
    }
  },
  etab_pub: {
    date_modification: function(before, after, diff) {
      const keys = Object.keys(diff)
      if (keys.length == 1 && keys[0] == "date_modification") {
        return {
          applied: true,
          after: after,
        }
      }
      return {
        applied: false,
        after: before
      }
    }
  },
  itou_siae: {
    date_maj: function(before, after, diff) {
      const keys = Object.keys(diff)
      if (keys.length == 1 && keys[0] == "date_maj") {
        return {
          applied: true,
          after: after,
        }
      }
      return {
        applied: false,
        after: before
      }
    }
  }
}

function processExplanations(row, av, ap) {
  const explanations = diffExplanations[row.data["Src Alias"]] || {}
  const ids = Object.keys(explanations)
  return ids.reduce((accum, explanationId) => {
    const diff = jsondiffpatch.diff(accum.unexplained, accum.after)
    const result = explanations[explanationId](accum.unexplained, accum.after, diff)

    if (result.applied) {
      accum.applied.push(explanationId)
    } else {
      accum.tested.push(explanationId)
    }
    accum.unexplained = result.after
    return accum
  }, { unexplained: av, applied: [], tested: [], after: ap })
}

function getExplanations(row) {
  const explanationResult = processExplanations(row, row.before, row.after)
  explanationResult.diff = jsondiffpatch.diff(explanationResult.unexplained, row.after, explanationResult.unexplained)
  explanationResult.fullyExplained = Object.keys(explanationResult.diff || {}).length == 0
  return explanationResult
}

function showChanges(row) {
  return (
    <div className={styles.tool}>
      <div>
      <h3>RAW</h3>
      <pre>{JSON.stringify(row.explanations.diff, null, 2)}</pre>
      </div>

      <div>
      <h3>HTML</h3>
      <div dangerouslySetInnerHTML={{__html: jsondiffpatch.formatters.html.format(row.explanations.diff)}} />
      </div>
    </div>
  )
}

function processTable(table) {
  return table.map(row => {
    const base = {
      data: row,
      before: JSON.parse(row.Avant),
      after: JSON.parse(row.Après),
    }
    base.explanations = getExplanations(base)
    return base
  })
}

export default function Home() {
  const [sources, setSources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedItem, setSelectedItem] = useState()
  const [rawData, setRawData] = useState(list)
  const [table, setTable] = useState([])
  const [explanationStats, setExplanationStats] = useState({total: 0, explained: 0, details: []})
  const [displayedTable, setDisplayedTable] = useState([])

  useEffect(() => {
    setTable(processTable(rawData.filter(e => e.Type.startsWith('M'))))
  }, [rawData])

  useEffect(() => {
    setDisplayedTable(table.filter(e => e.data["Src Alias"] == "mes_aides_aides" && !e.explanations.fullyExplained))
  }, [table])

  useEffect(() => {
    setExplanationStats({
      total: table.length,
      explained: table.filter(r => r.explanations.fullyExplained).length,
      details: Object.values(table.reduce((accum, r) => {
        accum[r.data['Src Alias']] = accum[r.data['Src Alias']] || {
          id: r.data['Src Alias'],
          total: 0,
          explained: 0
        }
        accum[r.data['Src Alias']].total += 1
        accum[r.data['Src Alias']].explained += r.explanations.fullyExplained ? 1 : 0

        return accum
      }, {})) || []
    })
  }, [table])


  const handleUploads = event => {
    let fileToHandle = event.target.files[0]
    fileToHandle.text().then(t => {
      const s = [...sources]
      const e = {name: fileToHandle.name, data:JSON.parse(t)}
      s.push(e)
      setRawData(e.data)
      setSources(s)
    })
    event.target.value = ""
  }

  const handleSourceChange = event => {
    const idx = parseInt(event.target.value)
    if (idx<0) {
      return
    }
    setRawData(sources[idx].data)
  }

  useEffect(() => {
    localforage.getItem('sources').then(function(value) {
      setSources(value || [])
      setRawData(value[value.length-1].data)
  }).catch(function(err) {
      // This code runs if there were any errors
      console.error(err);
  });
  }, [])

  useEffect(() => {
    if (sources && sources.length) {
      localforage.setItem('sources', sources)
    }
  }, [sources])
  const multiple = false

  return (
    <div className={styles.container}>
      <Head>
        <title>data.inclusion diff explorer</title>
        <meta name="description" content="Outil d'analyse des changements dans les données de l'écosystème de data.inclusion" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          data.inclusion diff explorer
        </h1>

        <div className={styles.tool}>
          <nav className={styles.nav}>
          <h2>Stats</h2>
          <div>
          <div>group explained / total (remaining)</div>
          total {explanationStats.explained} / {explanationStats.total} ({explanationStats.total - explanationStats.explained})
          {explanationStats.details.map(d => <div key={d.id}>{d.id} {d.explained} / {d.total} ({d.total - d.explained})</div>)}
          </div>
          <h2>Sources</h2>
          <select onChange={handleSourceChange}>
            <option value="-1">Aucune</option>
            { sources.map((s, i) => (<option key={i} value={i}>{s.name}</option>))}
          </select>
          <div><input type="file" onChange={handleUploads} multiple={multiple} /></div>
          <h2>
            <button onClick={() => {setSelectedItem(displayedTable[selectedIndex-1]); setSelectedIndex(selectedIndex-1) }}>-</button>
            <button onClick={() => {setSelectedItem(displayedTable[selectedIndex+1]); setSelectedIndex(selectedIndex+1) }}>+</button>
            List ({displayedTable.length}) (IDX: {selectedIndex})
            </h2>
          {/* table.map((row, i) => (
            <div key={row.ID + ";" + row.J}>
            <button onClick={() => {setSelectedItem(row); setSelectedIndex(i)}}>
            ID: {row.Type.slice(0, 1)} {row.ID}
            </button>
            { row?.ID == selectedItem?.ID ? "X" : ""}</div>)
          )*/}
          </nav>

          <div>

            <div>
            <h2>Détails</h2>
            <pre>{ selectedItem && JSON.stringify({...selectedItem.data, Avant: undefined, Après: undefined}, null, 2)}</pre>
            </div>

            <div>
            <h2>Modification</h2>
            { selectedItem && showChanges(selectedItem) }

            <h2>Après</h2>
            <pre>
            { selectedItem && JSON.stringify(selectedItem.after, null, 2) }
            </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
