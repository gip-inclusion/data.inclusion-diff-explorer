import localforage from 'localforage'
import { useState, useEffect } from 'react'

import Head from 'next/head'
import styles from '../styles/Home.module.css'

import benefits from '../benefits.json'

const levels = [
 100, 80, 50, 20, 0
]

export default function Home() {
  const [isReady, setIsReady] = useState(false)
  const [sources, setSources] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [mappings, setMappings] = useState([])
  const [mappingSourceMap, setMappingSourceMap] = useState({})
  const [selectedItem, setSelectedItem] = useState()
  const [rawData, setRawData] = useState([])
  const [table, setTable] = useState([])
  const [displayedTable, setDisplayedTable] = useState([])


  const generateTable = () => {
    if (!isReady) {
      return
    }
    const changes = rawData.filter(e => e['Src Alias'] == "mes_aides_aides")
    const result = changes.reduce((accum, change) => {
      accum[change.ID] = accum[change.ID] || {
        id: change.ID,
        src_alias: change['Src Alias'],
        changes: []
      }
      accum[change.ID].changes.push(change)
      return accum
    }, {})
    const finalTable = Object.values(result).filter(r => r.changes[r.changes.length - 1].Type !== "SUPPRESSION")

    finalTable.forEach(row => {
      row.changes.sort(e => e.J)
    })

    setTable(finalTable.filter(row => {
      return !mappingSourceMap[row.src_alias]?.[row.id]?.mappings?.length
    }))

  }
  useEffect(generateTable, [rawData, isReady, mappingSourceMap])

  const handleSourceChange = event => {
    const idx = parseInt(event.target.value)
    if (idx<0) {
      return
    }
    setRawData(sources[idx].data)
  }

  const handleMappingValidation = (e, origin, dest, level) => {
    console.log(e, origin, dest, level)
    setMappings([...mappings, {
      origin: {
        id: origin.id,
        src_alias: origin.src_alias
      },
      dest: {
        id: dest.id
      },
      level,
      createdAt: new Date()
    }])
    generateTable()
  }

  useEffect(() => {
    Promise.all([
      localforage.getItem('sources').then(function(value) {
        setSources(value || [])
        setRawData(value[value.length-1].data)
        return value
      }).catch(function(err) {
          console.error(err);
      }),
      localforage.getItem('suggestions').then(function(value) {
        setSuggestions(value || [])
        return value
      }).catch(function(err) {
          console.error(err);
      }),
      localforage.getItem('mappings').then(function(value) {
        setMappings(value || [])
        return value
      }).catch(function(err) {
          console.error(err);
      })
    ]).then(result => {
      console.log(result)
      setIsReady(true)
    })
  }, [])

  useEffect(() => {
    if (mappings && mappings.length) {
      localforage.setItem('mappings', mappings)
    }
  }, [mappings])

  useEffect(() => {
    setMappingSourceMap(mappings.reduce((accum, row) => {
      accum[row.origin.src_alias] = accum[row.origin.src_alias] || {}
      accum[row.origin.src_alias][row.origin.id] = accum[row.origin.src_alias][row.origin.id] || {
        mappings: []
      },
      accum[row.origin.src_alias][row.origin.id].mappings.push(row)
      return accum
    }, {}))
  }, [mappings])

  function showItem(item) {
    const toShow = {
      ...item,
      changes: item.changes.map(c => {
        return c.Type
      }),
      value: JSON.parse(item.changes[item.changes.length - 1].Après)
    }

    const siren = toShow.value?.fields.SIRET?.slice(0,9)
    const matches = benefits.filter(b => b.institution.code_siren == siren)
    return (
      <div>
        <div>test! {matches.length}</div>
        <div>
          {matches.map(b => {
            return <div key={b.id}>
              {b.label} correspond à 

              { levels.map(l => {
                return <button key={l} onClick={e => handleMappingValidation(e, selectedItem, b, l)}>{l}%</button>
              })}
              </div>
          })}
        </div>
        <pre>{JSON.stringify(toShow, null, 2)}</pre>
      </div>
    )
  }

  function showCollection(collection) {
    return <div> {
      collection.map(element => <pre key={element.id}>
          {JSON.stringify(element)}
          </pre>)
    }</div>
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>data.inclusion mapping</title>
        <meta name="description" content="Outil d'analyse des changements dans les données de l'écosystème de data.inclusion" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          data.inclusion mapping {isReady ? '!!!' : '...'}
        </h1>

        <div className={styles.tool}>
          <div>
          {table.length} {benefits.length}
          {table.map(item => {
            return (
              <div key={item.id}>
                <button onClick={() => setSelectedItem(item) } >{item.id}</button>
              </div>)
          })}
          </div>
          <div>
            <h2>Hello</h2>
            {JSON.stringify(mappingSourceMap)}
            <h3>suggestions</h3>
            {showCollection(suggestions)}
            <h3>mappings</h3>
            {showCollection(mappings)}
            <h3>Item</h3>
            {selectedItem && showItem(selectedItem)}
          </div>
        </div>
      </main>
    </div>
  )
}
