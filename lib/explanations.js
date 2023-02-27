import * as jsondiffpatch from 'jsondiffpatch'

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

const mes_aides_thumbnails_explanation_factory = (field) => {
  return function(before, after, diff) {
      if (!diff?.fields?.[field]) {
        return {
          applied: false,
          after: before
        }
      }
      if (diff.fields[field].length>1) {
        return {
          applied: false,
          after: before
        }
      }
      const indexes = Object.keys(diff.fields[field])
      let to_explain = JSON.parse(JSON.stringify(before))
      let applied = false
      indexes.forEach(key => {
        const keys = new Set(Object.keys(diff.fields[field][key]))
        keys.delete('url')
        keys.delete('thumbnails')
        if (keys.size == 0) {
          applied = true
          const delta = {
            fields: {
              [field]: {[key]: diff.fields[field][key]}
            }
          }
          jsondiffpatch.patch(to_explain, delta)
        }
      })
      if (applied) {
        return {
          before,
          applied: true,
          after: to_explain
        }
      }
      return {
        applied: false,
        after: before
      }
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
    },
    formulaire_url: mes_aides_thumbnails_explanation_factory('Formulaires'),
   logo_url: mes_aides_thumbnails_explanation_factory('Logo Organisme'),
   documentation_url: mes_aides_thumbnails_explanation_factory('Documentation'),
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
  const explanations = diffExplanations[row.data.src_alias] || {}
  const ids = Object.keys(explanations)
  return ids.reduce((accum, explanationId) => {
    const diff = jsondiffpatch.diff(accum.unexplained, accum.after)
    const result = explanations[explanationId](accum.unexplained, accum.after, diff)

    if (result.applied) {
      accum.applied.push({explanationId, result})
    } else {
      accum.tested.push({explanationId, result})
    }
    accum.unexplained = result.after
    return accum
  }, { unexplained: av, applied: [], tested: [], after: ap })
}

export function getExplanations(row) {
  const explanationResult = processExplanations(row, row.before, row.after)
  explanationResult.diff = jsondiffpatch.diff(explanationResult.unexplained, row.after)
  explanationResult.fullyExplained = Object.keys(explanationResult.diff || {}).length == 0
  return explanationResult
}
