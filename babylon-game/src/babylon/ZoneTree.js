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
  const MAX_PER_DEPTH = options.maxPerDepth || 5
  const MAX_CHILDREN = options.maxChildren || 3
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
      parent: parentId
    }
    nodes[id] = node
    if (!nodesByDepth[depthLevel]) nodesByDepth[depthLevel] = []
    nodesByDepth[depthLevel].push(node)
    return node
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

      let childrenCount = Math.random() < 0.4 ? 1 : (Math.random() < 0.6 ? 2 : 3)
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

  // Boss final
  const boss = makeNode(depth, null)
  boss.type = 'Boss'
  boss.nbrounds = Math.max(1, Math.floor(Math.random() * 3) + 2)
  boss.effect = 'final'
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
  const minibossCandidates = Object.values(nodes).filter(n => n.depth >= 5 && n.type === 'Battle')
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

  // Passive zones (Shop/Rest Area) — ensure at least one on depth-1
  const passiveTypes = ['Shop', 'Rest Area']
  const depthPrev = nodesByDepth[depth - 1] || []
  if (depthPrev.length > 0) {
    const pick = depthPrev[Math.floor(Math.random() * depthPrev.length)]
    pick.type = passiveTypes[Math.floor(Math.random() * passiveTypes.length)]
    pick.corrupted = true
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

  // Finalize types/effects
  Object.values(nodes).forEach(n => {
    if (n.type === 'Battle' && n.depth === depth) return
    if (n.type === 'Battle' && n.depth !== 1 && Math.random() < 0.12) n.type = 'Random'
    // ensure corrupted nodes have an effect
    if (n.corrupted && n.type !== 'Boss' && (!n.effect || n.effect === 'none')) {
      n.effect = corruptionEffects[Math.floor(Math.random() * corruptionEffects.length)]
    }
  })

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
    nodes: Object.values(nodes).map(n => ({ id: n.id, depth: n.depth, type: n.type, effect: n.effect, infos: n.infos, nbrounds: n.nbrounds, next: n.next, corrupted: n.corrupted })),
    dot
  }

  return tree
}
