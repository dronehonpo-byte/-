/* 代行の窓口 — 地図ヘルパー（Leaflet + OpenStreetMap / Nominatim / OSRM） */
window.DaikoMap = (function () {
  function tile(map, cfg) {
    L.tileLayer(cfg.tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  }

  // 出発地・目的地をピンで指定する地図（リクエスト入力画面）
  function picker(elId, cfg, onChange) {
    const map = L.map(elId).setView([cfg.lat, cfg.lng], 14);
    tile(map, cfg);
    let origin = null, dest = null, mode = 'origin';
    const oIcon = L.divIcon({ html: '🟠', className: 'pin', iconSize: [24, 24] });
    const dIcon = L.divIcon({ html: '🟢', className: 'pin', iconSize: [24, 24] });

    function place(latlng) {
      if (mode === 'origin') {
        if (origin) map.removeLayer(origin);
        origin = L.marker(latlng, { icon: oIcon, draggable: true }).addTo(map);
        origin.on('dragend', () => emit('origin', origin.getLatLng()));
        emit('origin', latlng);
      } else {
        if (dest) map.removeLayer(dest);
        dest = L.marker(latlng, { icon: dIcon, draggable: true }).addTo(map);
        dest.on('dragend', () => emit('dest', dest.getLatLng()));
        emit('dest', latlng);
      }
    }
    function emit(which, latlng) {
      reverse(cfg, latlng, (label) => onChange(which, latlng, label));
    }
    map.on('click', (e) => place(e.latlng));

    // 現在地
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => {
        const ll = { lat: p.coords.latitude, lng: p.coords.longitude };
        map.setView([ll.lat, ll.lng], 15);
        mode = 'origin';
        place(ll);
        mode = 'dest';
      }, () => {}, { enableHighAccuracy: true, timeout: 6000 });
    }
    return {
      setMode: (m) => { mode = m; },
      locate: () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((p) => {
          map.setView([p.coords.latitude, p.coords.longitude], 16);
          place({ lat: p.coords.latitude, lng: p.coords.longitude });
        });
      },
      search: (q, which) => {
        mode = which;
        geocode(cfg, q, (ll) => { if (ll) { map.setView([ll.lat, ll.lng], 16); place(ll); } });
      },
      map,
    };
  }

  // 出発地→目的地の経路を表示（確定後のルート案内）
  function route(elId, cfg, o, d) {
    const map = L.map(elId).setView([o.lat, o.lng], 14);
    tile(map, cfg);
    L.marker([o.lat, o.lng], { title: '出発地' }).addTo(map).bindPopup('出発地');
    L.marker([d.lat, d.lng], { title: '目的地' }).addTo(map).bindPopup('目的地');
    const url = `${cfg.osrmUrl}/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
          const line = L.polyline(coords, { color: '#f7941d', weight: 5 }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [30, 30] });
        } else { fallback(); }
      })
      .catch(fallback);
    function fallback() {
      const line = L.polyline([[o.lat, o.lng], [d.lat, d.lng]], { color: '#f7941d', weight: 4, dashArray: '6' }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
    return map;
  }

  // 近隣リクエストを地図に点在表示（ドライバー画面）
  function requests(elId, cfg) {
    const map = L.map(elId).setView([cfg.lat, cfg.lng], 13);
    tile(map, cfg);
    let layer = L.layerGroup().addTo(map);
    return {
      update: (items) => {
        layer.clearLayers();
        items.forEach((it) => {
          L.marker([it.origin_lat, it.origin_lng])
            .addTo(layer)
            .bindPopup(`#${it.id} ${it.origin_label || ''}<br>${it.car_type || ''} / ${it.transmission}<br><a href="/d/request/${it.id}">詳細・エントリー</a>`);
        });
      },
      map,
    };
  }

  function geocode(cfg, q, cb) {
    fetch(`${cfg.nominatimUrl}/search?format=json&limit=1&countrycodes=jp&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => cb(d && d[0] ? { lat: +d[0].lat, lng: +d[0].lon } : null))
      .catch(() => cb(null));
  }
  function reverse(cfg, ll, cb) {
    fetch(`${cfg.nominatimUrl}/reverse?format=json&lat=${ll.lat}&lon=${ll.lng}`)
      .then((r) => r.json())
      .then((d) => cb(d && d.display_name ? d.display_name : `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`))
      .catch(() => cb(`${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`));
  }

  return { picker, route, requests, geocode };
})();
