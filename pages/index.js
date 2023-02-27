import * as jsondiffpatch from 'jsondiffpatch'
import localforage from 'localforage'
import { useState, useEffect } from 'react'

import Head from 'next/head'
import styles from '../styles/Home.module.css'

//import list from '../subset.json'
//import list from '../subsetXdora14.json'
//import list from '../data-2022-12-05.json'
import list from '../mini.json'
//import list from '../data-mes_aides.json'

import 'jsondiffpatch/dist/formatters-styles/html.css'



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

function processTable(table, progressIndicator) {
  return table.map((row, i) => {
    progressIndicator((i+1)/table.length)
    const base = {
      data: row,
      before: row.data_prev,
      after: row.data_next,
    }
    base.explanations = getExplanations(base)
    return base
  })
}

export default function Home() {
  const [progress, setProgress] = useState(0)
  const [sources, setSources] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedItem, setSelectedItem] = useState()
  const [rawData, setRawData] = useState(list)
  const [table, setTable] = useState([])
  const [explanationStats, setExplanationStats] = useState({total: 0, explained: 0, details: []})
  const [displayedTable, setDisplayedTable] = useState([])

  useEffect(() => {
    const filtered = rawData.filter(e => e.type.startsWith('M') && e.src_alias !== "mes_aides_aides")//.slice(0, 100)
    setTable(processTable(filtered, (p) => {
      console.log(p)
      setProgress(p)
    }))
  }, [rawData])

  useEffect(() => {
    setDisplayedTable(table.filter(e => !e.explanations.fullyExplained))
  }, [table])

  useEffect(() => {
    console.log(selectedItem)
  }, [selectedItem])

  useEffect(() => {
    setExplanationStats({
      total: table.length,
      explained: table.filter(r => r.explanations.fullyExplained).length,
      details: Object.values(table.reduce((accum, r) => {
        accum[r.data.src_alias] = accum[r.data.src_alias] || {
          id: r.data.src_alias,
          total: 0,
          explained: 0
        }
        accum[r.data.src_alias].total += 1
        accum[r.data.src_alias].explained += r.explanations.fullyExplained ? 1 : 0

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
      const nextSources = value || []
      setSources(nextSources)
      if (nextSources.length) {
        setRawData(value[value.length-1].data)
      }
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
      <p>{progress}</p>
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
            <h2>Explanations</h2>
            { selectedItem?.explanations && (
              selectedItem?.explanations.applied.map(e => {
                return (<div key={e.explanationId}>
                    <h3>{e.explanationId}</h3>
                    <div dangerouslySetInnerHTML={{__html: jsondiffpatch.formatters.html.format(jsondiffpatch.diff(e.result.before, e.result.after))}} />
</div>)
              })
              )}
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
