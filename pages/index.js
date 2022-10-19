import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

//import list from '../subset.json'
import list from '../subsetXdora14.json'

import { useState } from 'react'
import * as jsondiffpatch from 'jsondiffpatch'
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

function processAvant(av) {
  return av
  return migrations.fee(av)
}

function process(row) {
  const av = JSON.parse(row.Avant)
  const ap = JSON.parse(row.Après)
  const newAv = processAvant(av, ap)

  return jsondiffpatch.formatters.html.format(jsondiffpatch.diff(newAv, ap, newAv))
}

export default function Home() {
  const [selectedIndex, setSelectedIndex] = useState()
  const [selectedItem, setSelectedItem] = useState()
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
          <h2>List
            <button onClick={() => {setSelectedItem(list[selectedIndex-1]); setSelectedIndex(selectedIndex-1) }}>-</button>
            <button onClick={() => {setSelectedItem(list[selectedIndex+1]); setSelectedIndex(selectedIndex+1) }}>+</button> </h2>
          { list.map((row, i) => <div key={row.ID + ";" + row.J}><button onClick={() => {setSelectedItem(row); setSelectedIndex(i)}}>ID: {row.ID}</button> {
            row?.ID == selectedItem?.ID ? "X" : ""}</div>)}
          </nav>

          <div>

            <div>
            <h2>Détails</h2>
            <pre>{ selectedItem && JSON.stringify({...selectedItem, Avant: undefined, Après: undefined}, null, 2)}</pre>
            </div>

            <div>
            <h2>Modification</h2>
            <div dangerouslySetInnerHTML={{__html: selectedItem && process(selectedItem)}} />

            <h2>Après</h2>
            <pre>
            { selectedItem && JSON.stringify(JSON.parse(selectedItem.Après), null, 2) }
            </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
