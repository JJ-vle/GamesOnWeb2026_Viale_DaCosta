// src/babylon/ZoneTree.js
// Générateur propre et unique d'arbre de zones.
// Respecte les contraintes :
// - profondeur entre minDepth et maxDepth (par défaut 7-8)
// - max 5 noeuds par profondeur
// - max 3 children par noeud
// - un noeud (sauf Boss) ne doit pas avoir plusieurs parents : on clone si nécessaire
// Retourne { root, depth, nodes: [...], dot }

export function generateZoneTree(options = {}) {
  const minDepth = options.minDepth || 7
  const maxDepth = options.maxDepth || 8
  const depth = Math.floor(Math.random() * (maxDepth - minDepth + 1)) + minDepth

  let idCounter = 1
  const nodesByDepth = {}
  const nodes = {}
  const MAX_PER_DEPTH = options.maxPerDepth || 4
  const MAX_CHILDREN = options.maxChildren || 2
  const MAX_PREV_ZONES = options.maxPrevZones || 3
  const corruptionEffects = options.effects || [
    'Ennemies infligent +3 de dégâts',
    'Ennemies gagnent +10 PV',
    'Ennemies gagnent +2 de rapidité',
    'Ennemies infligent +5 de dégâts',
    'Ennemies gagnent +20 PV',
    'Ennemies gagnent +1 de portée',
  ]

  function makeNode(depthLevel, parentId = null) {
    const id = idCounter++
    const node = {
      id,
      depth: depthLevel,
      type: 'Battle',
      effect: 'none',
      infos: {},
      nbrounds: Math.max(1, Math.floor(Math.random() * 3)),
      next: [],
      corrupted: false,
      parent: parentId,
      aura: null
    }
    nodes[id] = node
    if (!nodesByDepth[depthLevel]) nodesByDepth[depthLevel] = []
    nodesByDepth[depthLevel].push(node)
    return node
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  // Root (depth 1)
  const root = makeNode(1, null)
  root.type = 'Battle'
  root.corrupted = false

  // Generate levels (limit nodes per depth)
  for (let d = 1; d < depth; d++) {
    const parents = nodesByDepth[d] || []
    if (!nodesByDepth[d + 1]) nodesByDepth[d + 1] = []
    let slots = MAX_PER_DEPTH - nodesByDepth[d + 1].length

    for (const parent of parents) {
      if (d === depth - 1) break // will link to boss later
      if (slots <= 0) break

      // If we're creating nodes for depth-1, cap total slots to MAX_PREV_ZONES
      if (d + 1 === depth - 1) {
        const allowed = MAX_PREV_ZONES - nodesByDepth[d + 1].length
        slots = Math.min(slots, Math.max(0, allowed))
      }

      // bias toward 1 or 2 children to reduce link clutter
      let childrenCount = Math.random() < 0.6 ? 1 : 2
      childrenCount = Math.min(childrenCount, MAX_CHILDREN, slots)

      for (let i = 0; i < childrenCount; i++) {
        const child = makeNode(d + 1, parent.id)
        parent.next.push(child.id)
        slots--
        if (slots <= 0) break
      }
    }

    // If no node created for next depth, ensure at least one to preserve progression
    if (nodesByDepth[d + 1].length === 0 && parents.length > 0) {
      const child = makeNode(d + 1, parents[0].id)
      parents[0].next.push(child.id)
    }
  }

  // Enforce depth 2: exactly 2 choices from root
  if (depth >= 2) {
    if (!nodesByDepth[2]) nodesByDepth[2] = []
    // create missing nodes to reach 2
    while (nodesByDepth[2].length < 2) {
      const child = makeNode(2, root.id)
      root.next.push(child.id)
    }
    // if more than 2, keep two and remove extras
    if (nodesByDepth[2].length > 2) {
      const shuffled = nodesByDepth[2].slice().sort(() => 0.5 - Math.random())
      const survivors = shuffled.slice(0, 2)
      const removed = shuffled.slice(2)
      // remove removed nodes from parents and nodes
      removed.forEach(r => {
        Object.values(nodes).forEach(p => {
          for (let i = p.next.length - 1; i >= 0; i--) {
            if (p.next[i] === r.id) p.next.splice(i, 1)
          }
        })
        delete nodes[r.id]
      })
      nodesByDepth[2] = survivors
    }
    // ensure root.next points to exactly those two depth-2 nodes
    root.next = nodesByDepth[2].map(n => n.id)
    nodesByDepth[2].forEach(n => { n.parent = root.id })
  }

  // Ensure depth 4 has at least 3 nodes (if overall depth allows)
  if (depth >= 4) {
    if (!nodesByDepth[4]) nodesByDepth[4] = []
    // create intermediate parents if needed (depth 3)
    if (!nodesByDepth[3]) nodesByDepth[3] = []
    while (nodesByDepth[4].length < 3 && nodesByDepth[4].length < MAX_PER_DEPTH) {
      // pick or create a parent in depth 3
      let parent
      if (nodesByDepth[3].length === 0) {
        // ensure at least one node at depth 3 by attaching to a depth-2 node
        if (!nodesByDepth[2] || nodesByDepth[2].length === 0) {
          const p2 = makeNode(2, root.id)
          root.next.push(p2.id)
        }
        const chosen2 = nodesByDepth[2][Math.floor(Math.random() * nodesByDepth[2].length)]
        parent = makeNode(3, chosen2.id)
        chosen2.next.push(parent.id)
      } else {
        parent = nodesByDepth[3][Math.floor(Math.random() * nodesByDepth[3].length)]
      }
      // create child at depth 4 if parent can accept one
      if (!parent.next || parent.next.length < MAX_CHILDREN) {
        const child = makeNode(4, parent.id)
        parent.next.push(child.id)
      } else {
        // try another parent; if none free, break to avoid infinite loop
        const freeParents = nodesByDepth[3].filter(p => p.next.length < MAX_CHILDREN)
        if (freeParents.length === 0) break
        const parent2 = freeParents[Math.floor(Math.random() * freeParents.length)]
        const child = makeNode(4, parent2.id)
        parent2.next.push(child.id)
      }
    }
  }

  // Boss final
  const boss = makeNode(depth, null)
  boss.type = 'Boss'
  boss.nbrounds = Math.max(1, Math.floor(Math.random() * 3) + 2)
  // do not label boss with 'final' effect; keep effect none and mark aura
  boss.effect = 'none'
  boss.aura = 'yellow'
  boss.corrupted = true

  // Link previous level nodes to boss
  const prevLevel = nodesByDepth[depth - 1] || []
  prevLevel.forEach(p => {
    if (p.next.length === 0) p.next = [boss.id]
    else if (!p.next.includes(boss.id) && p.next.length < MAX_CHILDREN) p.next.push(boss.id)
  })

  // Apply corruption rules
  Object.values(nodes).forEach(n => {
    if (n.depth === 1) {
      n.corrupted = false
      n.effect = 'none'
    } else if (n.depth >= depth - 2) {
      // strongly corrupted near the end
      n.corrupted = true
    } else if (n.depth >= 3) {
      n.corrupted = Math.random() < 0.35
    } else {
      n.corrupted = false
    }
    // assign corruption effect (boss keeps 'final')
    if (n.corrupted && n.type !== 'Boss') {
      n.effect = corruptionEffects[Math.floor(Math.random() * corruptionEffects.length)]
    } else if (!n.corrupted && n.type !== 'Boss') {
      n.effect = 'none'
    }
  })

  // Choose up to 2 minibosses depth >=5, ensure they are on different branches (no ancestor relation)
  // choose miniboss candidates but exclude nodes on depth-1 (must remain non-battle)
  const minibossCandidates = Object.values(nodes).filter(n => n.depth >= 5 && n.type === 'Battle' && n.depth !== depth - 1)
  const minibosses = []
  function isAncestor(a, b) {
    let cur = b
    while (cur && cur.parent) {
      if (cur.parent === a.id) return true
      cur = nodes[cur.parent]
    }
    return false
  }
  minibossCandidates.sort(() => 0.5 - Math.random())
  for (const c of minibossCandidates) {
    if (minibosses.length >= 2) break
    const conflict = minibosses.some(m => isAncestor(m, c) || isAncestor(c, m))
    if (!conflict) {
      c.type = 'Mini Boss'
      c.nbrounds = Math.max(c.nbrounds, 2)
      minibosses.push(c)
    }
  }

  // Passive / non-battle zones on depth-1 — limit count and remove battles
  const passiveTypes = ['Shop', 'Rest Area']
  const depthPrev = nodesByDepth[depth - 1] || []
  if (depthPrev.length > 0) {
    // If too many nodes at depth-1, remove extras and rewire parents to boss
    if (depthPrev.length > MAX_PREV_ZONES) {
      const shuffled = depthPrev.slice().sort(() => 0.5 - Math.random())
      const survivors = shuffled.slice(0, MAX_PREV_ZONES)
      const survivorIds = new Set(survivors.map(n => n.id))
      const removed = shuffled.slice(MAX_PREV_ZONES)
      removed.forEach(r => {
        // remove references from parents
        Object.values(nodes).forEach(p => {
          for (let i = p.next.length - 1; i >= 0; i--) {
            if (p.next[i] === r.id) p.next.splice(i, 1)
          }
        })
        // delete node
        delete nodes[r.id]
      })
      nodesByDepth[depth - 1] = survivors
    }

    // Ensure remaining nodes at depth-1 are non-battle (Shop/Rest/Random)
    nodesByDepth[depth - 1].forEach(n => {
      // remove any Battle or Mini Boss on depth-1
      if (n.type === 'Battle' || n.type === 'Mini Boss') {
        n.type = Math.random() < 0.5 ? passiveTypes[Math.floor(Math.random() * passiveTypes.length)] : 'Random'
      }
      // make them slightly corrupted sometimes for variety
      if (n.type !== 'Boss') n.corrupted = Math.random() < 0.25
    })
  }

  // Ensure a node (non-boss) isn't referenced by multiple parents: clone if possible
  const occurrences = {}
  Object.values(nodes).forEach(n => n.next.forEach(t => occurrences[t] = (occurrences[t] || 0) + 1))

  Object.values(nodes).forEach(parent => {
    for (let i = 0; i < parent.next.length; i++) {
      const tid = parent.next[i]
      if (tid === boss.id) continue
      if (occurrences[tid] > 1) {
        const target = nodes[tid]
        const depthLevel = target.depth
        if (nodesByDepth[depthLevel].length < MAX_PER_DEPTH) {
          // clone
          const clone = makeNode(depthLevel, parent.id)
          clone.type = target.type
          clone.effect = target.effect
          clone.infos = { ...target.infos }
          clone.nbrounds = target.nbrounds
          clone.corrupted = target.corrupted
          parent.next[i] = clone.id
          occurrences[tid]--
          occurrences[clone.id] = 1
        } else {
          // remove reference if no space to clone
          parent.next.splice(i, 1)
          i--
        }
      }
    }
  })

  // Limit children per node
  Object.values(nodes).forEach(n => { if (n.next.length > MAX_CHILDREN) n.next = n.next.slice(0, MAX_CHILDREN) })

  // Ensure only boss can have empty next[]: if any non-boss has empty next, link it forward
  Object.values(nodes).forEach(n => {
    if (n.type === 'Boss') return
    if (!n.next || n.next.length === 0) {
      // try to link to a node in next depth
      const nextDepthList = nodesByDepth[n.depth + 1] || []
      if (nextDepthList.length > 0) {
        n.next = [nextDepthList[Math.floor(Math.random() * nextDepthList.length)].id]
      } else {
        // fallback to boss
        n.next = [boss.id]
      }
    }
  })

  // Ensure there are no non-boss nodes at max depth; rewire parents to boss and remove them
  Object.values(nodes).forEach(n => {
    if (n.depth === depth && n.id !== boss.id) {
      // rewire all parents pointing to this node to boss
      Object.values(nodes).forEach(p => {
        for (let i = 0; i < p.next.length; i++) {
          if (p.next[i] === n.id) {
            if (!p.next.includes(boss.id) && p.next.length < MAX_CHILDREN) p.next[i] = boss.id
            else {
              p.next.splice(i, 1)
              i--
            }
          }
        }
      })
      // remove from nodesByDepth and nodes
      const arr = nodesByDepth[depth] || []
      nodesByDepth[depth] = arr.filter(x => x.id !== n.id)
      delete nodes[n.id]
    }
  })

  // ensure nodesByDepth[depth] contains only the boss
  nodesByDepth[depth] = nodesByDepth[depth] ? nodesByDepth[depth].filter(x => x.id === boss.id) : [boss]

  // If a node (except depth 2) has only one ancestor, ensure it has 2 successors
  const parentCounts = {}
  Object.values(nodes).forEach(p => p.next.forEach(cid => parentCounts[cid] = (parentCounts[cid] || 0) + 1))
  // iterate nodes in random order so the extra-successor rule is distributed
  const nodeListRandom = shuffleArray(Object.values(nodes).slice())
  nodeListRandom.forEach(n => {
    if (n.depth === 2) return
    if (n.type === 'Boss') return
    const parents = parentCounts[n.id] || 0
    if (parents === 1) {
      // ensure exactly 2 successors where possible
      const needed = Math.max(0, 2 - n.next.length)
      for (let k = 0; k < needed; k++) {
        if (n.depth + 1 === depth) {
          // next depth is boss depth: link to boss
          if (!n.next.includes(boss.id)) n.next.push(boss.id)
        } else {
          const nextDepthList = nodesByDepth[n.depth + 1] || []
          // try to find an existing candidate not already linked
          const candidates = nextDepthList.map(x => x.id).filter(id => !n.next.includes(id))
          if (candidates.length > 0) {
            n.next.push(candidates[Math.floor(Math.random() * candidates.length)])
          } else if ((nodesByDepth[n.depth + 1] || []).length < MAX_PER_DEPTH) {
            const child = makeNode(n.depth + 1, n.id)
            n.next.push(child.id)
          } else {
            // fallback to boss
            if (!n.next.includes(boss.id)) n.next.push(boss.id)
          }
        }
        if (n.next.length >= MAX_CHILDREN) break
      }
      if (n.next.length > MAX_CHILDREN) n.next = n.next.slice(0, MAX_CHILDREN)
    }
  })

  // Finalize types/effects
  Object.values(nodes).forEach(n => {
    if (n.type === 'Battle' && n.depth === depth) return
    if (n.type === 'Battle' && n.depth !== 1 && Math.random() < 0.12) n.type = 'Random'
    // ensure corrupted nodes have an effect
    if (n.corrupted && n.type !== 'Boss' && (!n.effect || n.effect === 'none')) {
      n.effect = corruptionEffects[Math.floor(Math.random() * corruptionEffects.length)]
    }
  })

  // Final pass: ensure ONLY the Boss can have an empty `next` array.
  // Any non-boss without successors will be linked forward or to the boss as a fallback.
  Object.values(nodes).forEach(n => {
    if (n.type === 'Boss') return
    if (!n.next || n.next.length === 0) {
      const nextDepthList = nodesByDepth[n.depth + 1] || []
      if (nextDepthList.length > 0) {
        n.next = [nextDepthList[Math.floor(Math.random() * nextDepthList.length)].id]
      } else {
        n.next = [boss.id]
      }
    }
    if (n.next.length > MAX_CHILDREN) n.next = n.next.slice(0, MAX_CHILDREN)
  })

  // Ensure boss has no successors
  boss.next = []

  // DOT output for visualization
  let dot = 'digraph ZoneTree {\n  node [shape=box];\n'
  Object.values(nodes).forEach(n => {
    const badge = n.corrupted ? ' (C)' : ''
    const label = `${n.id} | ${n.type} | d:${n.depth}${badge}`
    dot += `  n${n.id} [label="${label}"];\n`
  })
  Object.values(nodes).forEach(n => n.next.forEach(tid => { dot += `  n${n.id} -> n${tid};\n` }))
  dot += '}'

  const tree = {
    root: root.id,
    depth,
    nodes: Object.values(nodes).map(n => ({ id: n.id, depth: n.depth, type: n.type, effect: n.effect, infos: n.infos, nbrounds: n.nbrounds, next: n.next, corrupted: n.corrupted, aura: n.aura || null })),
    dot
  }

  return tree
}
