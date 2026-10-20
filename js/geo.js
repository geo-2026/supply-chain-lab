/* 거리 계산 — 대권(직선) 거리, 도로 우회율, 주요 해상 항로 그래프 */
'use strict';
window.GEO = (function () {
  const R = 6371;
  const rad = d => d * Math.PI / 180;

  function haversine(lat1, lng1, lat2, lng2) {
    const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // 해상 그래프 준비
  const nodes = DATA.SEA_NODES;
  const adj = {};
  Object.keys(nodes).forEach(k => { adj[k] = []; });
  DATA.SEA_EDGES.forEach(([a, b]) => {
    if (!nodes[a] || !nodes[b]) { console.warn('해상 노드 없음', a, b); return; }
    const d = haversine(nodes[a][0], nodes[a][1], nodes[b][0], nodes[b][1]);
    adj[a].push([b, d]); adj[b].push([a, d]);
  });

  function dijkstra(src, dst) {
    if (src === dst) return { dist: 0, path: [src] };
    const dist = {}, prev = {}, done = {};
    Object.keys(nodes).forEach(k => { dist[k] = Infinity; });
    dist[src] = 0;
    for (;;) {
      let u = null, best = Infinity;
      for (const k in dist) if (!done[k] && dist[k] < best) { best = dist[k]; u = k; }
      if (u === null || u === dst) break;
      done[u] = true;
      for (const [v, w] of adj[u]) {
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
      }
    }
    if (dist[dst] === Infinity) return null;
    const path = [dst];
    while (path[0] !== src) path.unshift(prev[path[0]]);
    return { dist: dist[dst], path };
  }

  const PORTS = DATA.GAZ.filter(g => g.port);

  // 장소 : {name, lat, lng, port?}
  function nearestPort(p) {
    if (p.port && nodes[p.port]) return { port: p, road: 0 };
    let best = null, bd = Infinity;
    for (const g of PORTS) {
      const d = haversine(p.lat, p.lng, g.lat, g.lng);
      if (d < bd) { bd = d; best = g; }
    }
    return { port: best, road: bd * DATA.ROAD_FACTOR };
  }

  /* 구간 계산
     mode 'road' : 도로 (직선거리 × 1.3)
     mode 'ship' : 출발지 → 가까운 항구(도로) → 해상 항로 → 도착 항구 → 도착지(도로)
     반환 { land, sea, total, modeLabel, segments:[{type:'land'|'sea', pts:[[lat,lng],...]}], via:[항구 이름] } */
  function computeLeg(from, to, mode) {
    const gc = haversine(from.lat, from.lng, to.lat, to.lng);
    if (mode !== 'ship') {
      const land = gc * DATA.ROAD_FACTOR;
      return { land: Math.round(land), sea: 0, total: Math.round(land), modeLabel: '도로', gc: Math.round(gc),
        segments: [{ type: 'land', pts: [[from.lat, from.lng], [to.lat, to.lng]] }], via: [] };
    }
    const A = nearestPort(from), B = nearestPort(to);
    const segments = [];
    let land = A.road + B.road;
    if (A.road > 0) segments.push({ type: 'land', pts: [[from.lat, from.lng], [A.port.lat, A.port.lng]] });
    let sea = 0;
    const seaPts = [[A.port.lat, A.port.lng]];
    if (A.port.port === B.port.port) {
      sea = haversine(A.port.lat, A.port.lng, B.port.lat, B.port.lng);
    } else {
      const r = dijkstra(A.port.port, B.port.port);
      if (!r) { sea = gc * 1.4; } else {
        sea = r.dist;
        r.path.forEach(k => seaPts.push([nodes[k][0], nodes[k][1]]));
        // 항구 ↔ 첫/마지막 노드 거리 더하기
        sea += haversine(A.port.lat, A.port.lng, nodes[r.path[0]][0], nodes[r.path[0]][1]);
        sea += haversine(B.port.lat, B.port.lng, nodes[r.path[r.path.length - 1]][0], nodes[r.path[r.path.length - 1]][1]);
      }
    }
    seaPts.push([B.port.lat, B.port.lng]);
    if (sea > 0) segments.push({ type: 'sea', pts: seaPts });
    if (B.road > 0) segments.push({ type: 'land', pts: [[B.port.lat, B.port.lng], [to.lat, to.lng]] });
    const via = [];
    if (A.road > 0) via.push(A.port.name);
    if (B.road > 0) via.push(B.port.name);
    let modeLabel = '선박';
    if (A.road > 0 && B.road > 0) modeLabel = '도로+선박+도로';
    else if (A.road > 0) modeLabel = '도로+선박';
    else if (B.road > 0) modeLabel = '선박+도로';
    return { land: Math.round(land), sea: Math.round(sea), total: Math.round(land + sea), modeLabel, gc: Math.round(gc), segments, via,
      portA: A.port.name, portB: B.port.name };
  }

  return { haversine, computeLeg, nearestPort, dijkstra };
})();
