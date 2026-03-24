export function getMapHtml(lat: number, lng: number): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
        <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"><\/script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; }
          .leaflet-control-attribution { display: none !important; }

          .marker-cluster-small, .marker-cluster-medium, .marker-cluster-large {
            background-color: rgba(224, 122, 95, 0.25) !important;
          }
          .marker-cluster-small div, .marker-cluster-medium div, .marker-cluster-large div {
            background-color: rgba(224, 122, 95, 0.85) !important;
            color: white !important; font-weight: 700 !important; font-size: 13px !important;
          }

          /* ── badge centrado ── */
          #radiusBadgeWrap {
            position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
            z-index: 1000; pointer-events: auto;
            transition: opacity 0.2s ease;
          }
          #radiusBadgeWrap.hidden { opacity: 0; pointer-events: none; }

          #radiusBadge {
            background: white; border-radius: 24px; padding: 7px 13px 7px 10px;
            font-size: 12px; font-weight: 600; color: #3d405b; font-family: sans-serif;
            box-shadow: 0 2px 10px rgba(0,0,0,0.13);
            white-space: nowrap; display: flex; align-items: center; gap: 6px;
            border: 1px solid rgba(0,0,0,0.06);
          }
          #radiusBadge .bdot { width: 8px; height: 8px; background: #e07a5f; border-radius: 50%; flex-shrink: 0; }

          /* ── filter pill + dropdown (fijo a la derecha) ── */
          #filterWrap {
            position: fixed; top: 12px; right: 12px;
            z-index: 1000;
            transition: opacity 0.2s ease;
          }
          #filterWrap.hidden { opacity: 0; pointer-events: none; }

          #filterPill {
            display: flex; align-items: center; justify-content: center;
            width: 36px; height: 36px;
            border: 1.5px solid rgba(0,0,0,0.08); border-radius: 50%;
            background: white; cursor: pointer;
            box-shadow: 0 1px 6px rgba(0,0,0,0.09);
            transition: border-color 0.15s, background 0.15s;
          }
          #filterPill.has-inactive {
            background: #fff8f6; border-color: rgba(224,122,95,0.35);
          }
          #filterPill.has-inactive svg { stroke: #e07a5f; }

          #filterDropdown {
            position: absolute; top: calc(100% + 7px); right: 0;
            background: white; border-radius: 14px; padding: 5px;
            box-shadow: 0 6px 24px rgba(0,0,0,0.14); border: 1px solid rgba(0,0,0,0.07);
            min-width: 168px; display: none; flex-direction: column; gap: 2px;
            z-index: 1010;
          }
          #filterDropdown.open { display: flex; }

          .filter-row {
            display: flex; align-items: center; gap: 9px;
            padding: 9px 10px; border-radius: 10px; cursor: pointer;
            transition: background 0.12s;
          }
          .filter-row:hover { background: #f7f5f2; }
          .filter-row .fr-icon {
            width: 28px; height: 28px; border-radius: 8px;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
          }
          .filter-row .fr-label {
            flex: 1; font-size: 12px; font-weight: 700; color: #3d405b; font-family: sans-serif;
          }
          .filter-row .fr-check {
            width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid #ddd;
            display: flex; align-items: center; justify-content: center; flex-shrink: 0;
            transition: background 0.12s, border-color 0.12s;
          }
          .filter-row.checked-spot .fr-check {
            background: #e07a5f; border-color: #e07a5f;
          }
          .filter-row.checked-drop .fr-check {
            background: #f97316; border-color: #f97316;
          }
          .filter-row .fr-check svg { display: none; }
          .filter-row.checked-spot .fr-check svg,
          .filter-row.checked-drop .fr-check svg { display: block; }

          #tooFarBanner {
            position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
            background: #3d405b; border-radius: 24px; padding: 7px 14px 7px 10px;
            font-size: 12px; font-weight: 600; color: white; font-family: sans-serif;
            z-index: 1000; pointer-events: none; white-space: nowrap; display: none;
            align-items: center; gap: 7px; box-shadow: 0 2px 10px rgba(0,0,0,0.18);
          }
          #tooFarBanner.visible { display: flex; }
          #tooFarBanner .bdot { width: 8px; height: 8px; background: rgba(255,255,255,0.45); border-radius: 50%; flex-shrink: 0; }

          /* ── modals ── */
          #userModalOverlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.25); z-index: 2000; align-items: flex-end;
          }
          #userModalOverlay.active { display: flex; }
          #userModal {
            background: white; width: 100%; border-radius: 20px 20px 0 0;
            padding: 20px 20px 32px; font-family: sans-serif;
          }
          .user-badge {
            display: inline-flex; align-items: center; gap: 6px;
            background: #eef2ff; color: #3b82f6; font-size: 11px; font-weight: 700;
            border-radius: 6px; padding: 3px 9px; margin-bottom: 10px;
            text-transform: uppercase; letter-spacing: 0.04em;
          }
          .user-title { font-size: 16px; font-weight: 700; color: #3d405b; margin-bottom: 6px; }
          .user-address { font-size: 13px; color: #9e9aad; display: flex; align-items: flex-start; gap: 5px; line-height: 1.5; }
          .btn-close-user {
            width: 100%; padding: 13px; background: #f5f4f0; color: #3d405b;
            border: none; border-radius: 12px; font-size: 14px; font-weight: 600;
            cursor: pointer; margin-top: 20px;
          }

          .modal-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.35); z-index: 2000; align-items: flex-end;
          }
          .modal-overlay.active { display: flex; }
          .modal {
            background: white; width: 100%; border-radius: 20px 20px 0 0;
            padding: 20px 20px 32px; font-family: sans-serif;
          }
          .modal-handle { width: 36px; height: 4px; background: #e8e8e8; border-radius: 2px; margin: 0 auto 18px; }
          .modal-type-badge {
            display: inline-block; background: #fdf0ec; color: #e07a5f;
            font-size: 11px; font-weight: 600; border-radius: 6px; padding: 2px 8px;
            margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase;
          }
          .modal-title { font-size: 17px; font-weight: 700; color: #3d405b; margin-bottom: 3px; line-height: 1.3; }
          .modal-address { font-size: 13px; color: #9e9aad; margin-bottom: 16px; display: flex; align-items: center; gap: 4px; }
          .mode-selector {
            display: flex; background: #f5f4f0; border-radius: 12px;
            padding: 4px; gap: 4px; margin-bottom: 16px;
          }
          .mode-btn {
            flex: 1; display: flex; align-items: center; justify-content: center;
            gap: 7px; padding: 9px 0; border: none; border-radius: 9px;
            background: transparent; color: #9e9aad; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: background 0.15s, color 0.15s;
          }
          .mode-btn.active { background: white; color: #3d405b; box-shadow: 0 1px 4px rgba(0,0,0,0.10); }
          .mode-btn svg { flex-shrink: 0; }
          .modal-stats { display: flex; gap: 10px; margin-bottom: 20px; }
          .stat-box { flex: 1; background: #fdfbf7; border-radius: 12px; padding: 12px 8px; text-align: center; }
          .stat-value { font-size: 17px; font-weight: 700; color: #e07a5f; }
          .stat-label { font-size: 11px; color: #9e9aad; margin-top: 3px; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
          .stat-value.loading {
            background: #f0ece4; color: transparent; border-radius: 6px;
            animation: pulse 1.1s ease-in-out infinite;
            display: inline-block; min-width: 56px; height: 22px;
          }
          .btn-googlemaps {
            width: 100%; padding: 14px; background: #e07a5f; color: white; border: none;
            border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 10px;
          }
          .btn-close { width: 100%; padding: 10px; background: transparent; color: #9e9aad; border: none; font-size: 14px; cursor: pointer; }

          #pendingModalOverlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.35); z-index: 2000; align-items: flex-end;
          }
          #pendingModalOverlay.active { display: flex; }
          #pendingModal {
            background: white; width: 100%; border-radius: 20px 20px 0 0;
            padding: 20px 20px 32px; font-family: sans-serif;
          }
          .pending-badge {
            display: inline-block; background: #fff8e1; color: #f59e0b;
            font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px;
            margin-bottom: 8px; letter-spacing: 0.03em; text-transform: uppercase;
          }
          .progress-track {
            width: 100%; height: 8px; background: #F3E9E0;
            border-radius: 4px; overflow: hidden; margin: 10px 0 6px;
          }
          .progress-fill {
            height: 100%; background: #f59e0b; border-radius: 4px;
            transition: width 0.4s ease;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>

        <!-- Badge centrado -->
        <div id="radiusBadgeWrap">
          <div id="radiusBadge">
            <span class="bdot"></span>
            <span id="radiusText">Cargando BookSpots...</span>
          </div>
        </div>

        <!-- Filtro fijo a la derecha -->
        <div id="filterWrap">
          <div style="position: relative;">
            <button id="filterPill" onclick="toggleFilterDropdown()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d405b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
            </button>

            <div id="filterDropdown">
              <!-- BookSpot row -->
              <div class="filter-row checked-spot" id="rowSpot" onclick="toggleFilter('spot')">
                <div class="fr-icon" style="background:#fdf0ec;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e07a5f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <span class="fr-label">BookSpot</span>
                <div class="fr-check">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="2 6 5 9 10 3"/>
                  </svg>
                </div>
              </div>

              <!-- BookDrop row -->
              <div class="filter-row checked-drop" id="rowDrop" onclick="toggleFilter('drop')">
                <div class="fr-icon" style="background:#fff3eb;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <span class="fr-label">BookDrop</span>
                <div class="fr-check">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="2 6 5 9 10 3"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="tooFarBanner"><span class="bdot"></span><span>Acerca el zoom para ver BookSpots</span></div>

        <!-- User location modal -->
        <div id="userModalOverlay">
          <div id="userModal">
            <div class="modal-handle"></div>
            <div class="user-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Tu ubicación
            </div>
            <div class="user-title">Tu ubicación</div>
            <div class="user-address">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span id="userAddress">Obteniendo dirección...</span>
            </div>
            <button class="btn-close-user" onclick="closeUserModal()">Cerrar</button>
          </div>
        </div>

        <!-- Active bookspot modal -->
        <div class="modal-overlay" id="modalOverlay">
          <div class="modal">
            <div class="modal-handle"></div>
            <div class="modal-type-badge" id="modalTypeBadge">BookSpot</div>
            <div class="modal-title" id="modalTitle"></div>
            <div class="modal-address">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span id="modalAddress"></span>
            </div>
            <div class="mode-selector">
              <button class="mode-btn active" id="btnWalk" onclick="setMode('walk')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="4" r="1.5"/><path d="M9 22l2-6 2.5 2.5 2-5"/>
                  <path d="M10.5 10.5L9 22"/><path d="M13.5 10.5l2.5 4.5-3 2"/>
                  <path d="M12 6l-1.5 4.5 3 1"/><path d="M14 6.5l1.5-1"/>
                </svg>
                A pie
              </button>
              <button class="mode-btn" id="btnCar" onclick="setMode('car')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 17H3v-5l2-5h14l2 5v5h-2"/>
                  <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
                  <path d="M5 12h14"/>
                </svg>
                En coche
              </button>
            </div>
            <div class="modal-stats">
              <div class="stat-box">
                <div class="stat-value loading" id="statDist"></div>
                <div class="stat-label">Distancia</div>
              </div>
              <div class="stat-box">
                <div class="stat-value loading" id="statTime"></div>
                <div class="stat-label">Tiempo aprox.</div>
              </div>
            </div>
            <button class="btn-googlemaps" onclick="openGoogleMaps()">Cómo llegar</button>
            <button class="btn-close" onclick="closeModal()">Cerrar</button>
          </div>
        </div>

        <!-- Pending bookspot modal -->
        <div id="pendingModalOverlay">
          <div id="pendingModal">
            <div class="modal-handle"></div>
            <div class="pending-badge">Pendiente de validación</div>
            <div class="modal-title" id="pendingModalTitle" style="margin-top:4px"></div>
            <div class="modal-address" style="margin-top:4px">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span id="pendingModalAddress"></span>
            </div>

            <div style="background:#fffbf0;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:16px">
              <div style="font-size:11px;font-weight:900;letter-spacing:1px;color:#f59e0b;text-transform:uppercase;margin-bottom:8px">
                Progreso de validaciones
              </div>
              <div class="progress-track">
                <div class="progress-fill" id="pendingProgressFill" style="width:0%"></div>
              </div>
              <div style="font-size:13px;font-weight:700;color:#3d405b;margin-top:4px" id="pendingProgressText"></div>
              <div style="font-size:12px;color:#9e9aad;margin-top:3px" id="pendingProgressSub"></div>
            </div>

            <div style="font-size:12px;color:#c9b5a3;margin-bottom:20px" id="pendingCreatedAt"></div>

            <button class="btn-close" onclick="closePendingModal()" style="background:#f5f4f0;border-radius:12px;padding:13px;font-weight:600;color:#3d405b">Cerrar</button>
          </div>
        </div>

        <script>
          const map = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([${lat}, ${lng}], 17);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
          }).addTo(map);

          let userLat = ${lat};
          let userLng = ${lng};
          let selectedSpot = null;
          let routeLine = null;
          let currentMode = 'walk';
          let routeCar  = { distanceM: null, durationS: null, geometry: null };
          let routeWalk = { distanceM: null, durationS: null, geometry: null };
          let isPicking = false;
          let pickedMarker = null;
          let allSpots = [];
          let filterSpot = true;
          let filterDrop = true;
          let filterDropdownOpen = false;

          const BACK_BTN_THRESHOLD_M = 300;
          const pendingLayer = L.layerGroup().addTo(map);

          function postToRN(message) {
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
              window.ReactNativeWebView.postMessage(message);
            } else if (window.parent !== window) {
              window.parent.postMessage(message, '*');
            }
          }

          function formatDistKm(km) { return km.toFixed(1) + ' km'; }
          function formatDistM(m) { return (m / 1000).toFixed(1) + ' km'; }

          function hideTopBar() {
            document.getElementById('radiusBadgeWrap').classList.add('hidden');
            document.getElementById('filterWrap').classList.add('hidden');
          }
          function showTopBar() {
            document.getElementById('radiusBadgeWrap').classList.remove('hidden');
            document.getElementById('filterWrap').classList.remove('hidden');
          }

          /* ── Filter dropdown ── */
          function toggleFilterDropdown() {
            filterDropdownOpen = !filterDropdownOpen;
            document.getElementById('filterDropdown').classList.toggle('open', filterDropdownOpen);
          }

          // Close dropdown when clicking outside
          document.addEventListener('click', function(e) {
            var wrap = document.getElementById('filterWrap');
            if (filterDropdownOpen && !wrap.contains(e.target)) {
              filterDropdownOpen = false;
              document.getElementById('filterDropdown').classList.remove('open');
            }
          });

          function updateFilterPill() {
            var pill = document.getElementById('filterPill');
            pill.classList.toggle('has-inactive', !filterSpot || !filterDrop);
          }

          function toggleFilter(type) {
            if (type === 'spot') {
              if (filterSpot && !filterDrop) return; // prevent deactivating both
              filterSpot = !filterSpot;
              document.getElementById('rowSpot').classList.toggle('checked-spot', filterSpot);
            } else {
              if (filterDrop && !filterSpot) return;
              filterDrop = !filterDrop;
              document.getElementById('rowDrop').classList.toggle('checked-drop', filterDrop);
            }
            updateFilterPill();
            repaintSpots();
          }

          function repaintSpots() {
            clusterGroup.clearLayers();
            if (!allSpots || allSpots.length === 0) return;
            allSpots.forEach(function(spot) {
              var isBookdrop = spot.isBookdrop ?? spot.IsBookdrop ?? false;
              if (isBookdrop && !filterDrop) return;
              if (!isBookdrop && !filterSpot) return;
              var m = L.marker(
                [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude],
                { icon: isBookdrop ? createBookdropIcon() : createSpotIcon() }
              ).on('click', function() { openModal(spot); });
              clusterGroup.addLayer(m);
            });
            updateRadiusBadge();
          }

          /* ── Back to location — notifies TypeScript layer ── */
          function updateLocationButtonVisibility() {
            var center = map.getCenter();
            var distToUser = map.distance([center.lat, center.lng], [userLat, userLng]);
            postToRN(JSON.stringify({ type: 'locationButtonVisible', visible: distToUser > BACK_BTN_THRESHOLD_M }));
          }

          function backToUserLocation() {
            map.setView([userLat, userLng], 17, { animate: true });
          }

          /* ── Icons ── */
          function createUserIcon() {
            return L.divIcon({
              className: '',
              html: \`<div style="position:relative;width:20px;height:20px;">
                <div style="position:absolute;inset:-6px;background:rgba(59,130,246,0.18);border-radius:50%;"></div>
                <div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>
              </div>\`,
              iconSize: [20, 20], iconAnchor: [10, 10],
            });
          }

          // BookSpot — salmon, 32×42
          function createSpotIcon() {
            return L.divIcon({
              className: '',
              html: \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
                <path d="M16 0 C7.163 0 0 7.163 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.163 24.837 0 16 0Z"
                  fill="#e07a5f" stroke="white" stroke-width="2"/>
                <svg x="8" y="5" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </svg>\`,
              iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -42],
            });
          }

          // BookDrop — vivid orange (#f97316), bigger pin 40×52
          function createBookdropIcon() {
            return L.divIcon({
              className: '',
              html: \`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
                <path d="M20 0 C8.954 0 0 8.954 0 20 C0 35 20 52 20 52 C20 52 40 35 40 20 C40 8.954 31.046 0 20 0Z"
                  fill="#f97316" stroke="white" stroke-width="2.5"/>
                <svg x="10" y="6" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </svg>\`,
              iconSize: [40, 52], iconAnchor: [20, 52], popupAnchor: [0, -52],
            });
          }

          function createPendingIcon() {
            return L.divIcon({
              className: '',
              html: \`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
                <ellipse cx="17" cy="44" rx="6" ry="2.2" fill="rgba(0,0,0,0.18)"/>
                <path d="M17 0 C8.163 0 1 7.163 1 16 C1 29 17 44 17 44 C17 44 33 29 33 16 C33 7.163 25.837 0 17 0Z"
                  fill="#f59e0b"/>
                <circle cx="17" cy="15.5" r="9" fill="rgba(255,255,255,0.22)"/>
                <svg x="9" y="6" width="16" height="19" viewBox="0 0 24 24" fill="none"
                  stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 22h14"/><path d="M5 2h14"/>
                  <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
                  <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
                </svg>
              </svg>\`,
              iconSize: [34, 46], iconAnchor: [17, 44], popupAnchor: [0, -44],
            });
          }

          const userMarker = L.marker([${lat}, ${lng}], { icon: createUserIcon() })
            .addTo(map).on('click', openUserModal);

          /* ── User location modal ── */
          async function openUserModal() {
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            document.getElementById('userModalOverlay').classList.add('active');
            document.getElementById('userAddress').textContent = 'Obteniendo dirección...';
            try {
              const res = await fetch(
                'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + userLat + '&lon=' + userLng + '&zoom=18&addressdetails=1',
                { headers: { 'Accept-Language': 'es' } }
              );
              const data = await res.json();
              const addr = data.address || {};
              const street = addr.road || addr.pedestrian || addr.footway || '';
              const number = addr.house_number ? ', ' + addr.house_number : '';
              const district = addr.suburb || addr.neighbourhood || addr.city_district || '';
              const parts = [street + number, district].filter(Boolean);
              document.getElementById('userAddress').textContent =
                parts.length > 0 ? parts.join(' - ') : (data.display_name || 'Ubicación actual');
            } catch(e) {
              document.getElementById('userAddress').textContent = 'Ubicación actual';
            }
          }

          function closeUserModal() {
            postToRN(JSON.stringify({ type: 'mapModalClose' }));
            document.getElementById('userModalOverlay').classList.remove('active');
          }

          /* ── Active bookspots ── */
          const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 48, spiderfyOnMaxZoom: true,
            showCoverageOnHover: false, zoomToBoundsOnClick: true,
          });
          map.addLayer(clusterGroup);

          function getDistKm(s) {
            var d = s.distanceKm !== undefined ? s.distanceKm : s.DistanceKm;
            return typeof d === 'number' && isFinite(d) ? d : 0;
          }

          function updateRadiusBadge() {
            if (allSpots.length === 0) return;
            var bounds = map.getBounds();
            var visibleSpots = allSpots.filter(function(spot) {
              var lat = spot.latitude ?? spot.Latitude;
              var lng = spot.longitude ?? spot.Longitude;
              return bounds.contains(L.latLng(lat, lng));
            });
            if (visibleSpots.length === 0) {
              document.getElementById('radiusText').textContent = 'Sin BookSpots cerca';
              return;
            }
            var maxDist = Math.max.apply(null, visibleSpots.map(function(spot) {
              var lat = spot.latitude ?? spot.Latitude;
              var lng = spot.longitude ?? spot.Longitude;
              return (map.distance([userLat, userLng], [lat, lng]) / 1000) * 1.3;
            }));
            document.getElementById('radiusText').textContent =
              'BookSpots hasta ' + formatDistKm(maxDist) + ' de ti';
          }

          function updateBookspots(spots, radiusKm) {
            allSpots = spots || [];
            document.getElementById('tooFarBanner').classList.remove('visible');
            if (!spots || spots.length === 0) {
              clusterGroup.clearLayers();
              document.getElementById('radiusText').textContent = 'Sin BookSpots cerca';
              return;
            }
            repaintSpots();
          }

          function updateUserPendingSpots(spots) {
            pendingLayer.clearLayers();
            if (!spots || spots.length === 0) return;
            spots.forEach(function(spot) {
              L.marker(
                [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude],
                { icon: createPendingIcon() }
              ).on('click', function() { openPendingModal(spot); }).addTo(pendingLayer);
            });
          }

          function openPendingModal(spot) {
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            hideTopBar();
            var nombre = spot.nombre ?? spot.Nombre ?? '';
            var address = spot.addressText ?? spot.AddressText ?? '';
            var validation = spot.validationCount ?? 0;
            var required = spot.requiredValidations ?? 5;
            var remaining = required - validation;
            var pct = Math.min((validation / required) * 100, 100).toFixed(0);
            var created = spot.createdAt ?? spot.CreatedAt ?? '';
            document.getElementById('pendingModalTitle').textContent = nombre;
            document.getElementById('pendingModalAddress').textContent = address;
            document.getElementById('pendingProgressFill').style.width = pct + '%';
            document.getElementById('pendingProgressText').textContent =
              validation + '/' + required + ' personas han validado tu BookSpot';
            document.getElementById('pendingProgressSub').textContent =
              remaining > 0
                ? 'Aún quedan ' + remaining + ' persona' + (remaining !== 1 ? 's' : '') + ' más por validarlo'
                : '✓ ¡Listo para activarse!';
            document.getElementById('pendingCreatedAt').textContent =
              created ? 'Propuesto el ' + new Date(created).toLocaleDateString('es-ES') : '';
            document.getElementById('pendingModalOverlay').classList.add('active');
          }

          function closePendingModal() {
            postToRN(JSON.stringify({ type: 'mapModalClose' }));
            document.getElementById('pendingModalOverlay').classList.remove('active');
            showTopBar();
          }

          function showTooFarMessage() {
            allSpots = [];
            clusterGroup.clearLayers();
            document.getElementById('tooFarBanner').classList.add('visible');
            document.getElementById('radiusText').textContent = '';
          }

          function enablePickMode() { isPicking = true; }
          function disablePickMode() {
            isPicking = false;
            if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e) {} pickedMarker = null; }
          }

          map.on('click', function(e) {
            if (!isPicking) return;
            const lat = e.latlng.lat; const lng = e.latlng.lng;
            if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e) {} pickedMarker = null; }
            pickedMarker = L.marker([lat, lng], { icon: createSpotIcon() }).addTo(map);
            postToRN(JSON.stringify({ type: 'pickLocation', lat, lng }));
            isPicking = false;
          });

          function emitViewChange() {
            const center = map.getCenter();
            const ne = map.getBounds().getNorthEast();
            const radiusKm = map.distance(center, ne) / 1000;
            postToRN(JSON.stringify({ type: 'viewChange', lat: center.lat, lng: center.lng, radiusKm }));
          }
          map.on('zoomend', function() { emitViewChange(); updateRadiusBadge(); updateLocationButtonVisibility(); });
          map.on('moveend', function() { emitViewChange(); updateRadiusBadge(); updateLocationButtonVisibility(); });

          function renderModeStats() {
            var r = currentMode === 'car' ? routeCar : routeWalk;
            var distEl = document.getElementById('statDist');
            var timeEl = document.getElementById('statTime');
            if (r.distanceM === null) {
              distEl.className = 'stat-value loading'; distEl.textContent = '';
              timeEl.className = 'stat-value loading'; timeEl.textContent = '';
              return;
            }
            distEl.className = 'stat-value'; distEl.textContent = formatDistM(r.distanceM);
            timeEl.className = 'stat-value'; timeEl.textContent = Math.round(r.durationS / 60) + ' min';
          }

          function setMode(mode) {
            currentMode = mode;
            document.getElementById('btnWalk').classList.toggle('active', mode === 'walk');
            document.getElementById('btnCar').classList.toggle('active', mode === 'car');
            renderModeStats();
            if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
            var r = mode === 'car' ? routeCar : routeWalk;
            if (r.geometry) {
              routeLine = L.geoJSON(r.geometry, { style: { color: '#e07a5f', weight: 4, opacity: 0.75 } }).addTo(map);
              map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
            }
          }

          async function fetchRoute(profile, coords) {
            var url = profile === 'driving'
              ? \`https://router.project-osrm.org/route/v1/driving/\${coords}?overview=full&geometries=geojson\`
              : \`https://routing.openstreetmap.de/routed-foot/route/v1/foot/\${coords}?overview=full&geometries=geojson\`;
            var res = await fetch(url);
            var data = await res.json();
            if (data.routes && data.routes.length > 0) {
              return { distanceM: data.routes[0].distance, durationS: data.routes[0].duration, geometry: data.routes[0].geometry };
            }
            return null;
          }

          async function openModal(spot) {
            selectedSpot = spot;
            currentMode = 'walk';
            routeCar  = { distanceM: null, durationS: null, geometry: null };
            routeWalk = { distanceM: null, durationS: null, geometry: null };

            var isBookdrop = spot.isBookdrop ?? spot.IsBookdrop ?? false;
            var badge = document.getElementById('modalTypeBadge');
            badge.textContent = isBookdrop ? 'BookDrop' : 'BookSpot';
            badge.style.background = isBookdrop ? '#fff3eb' : '#fdf0ec';
            badge.style.color = isBookdrop ? '#f97316' : '#e07a5f';

            document.getElementById('btnWalk').classList.add('active');
            document.getElementById('btnCar').classList.remove('active');
            document.getElementById('modalTitle').textContent = spot.nombre ?? spot.Nombre;
            document.getElementById('modalAddress').textContent = spot.addressText ?? spot.AddressText;
            renderModeStats();
            hideTopBar();
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            document.getElementById('modalOverlay').classList.add('active');
            if (routeLine) { map.removeLayer(routeLine); routeLine = null; }

            var spotLat = spot.latitude ?? spot.Latitude;
            var spotLng = spot.longitude ?? spot.Longitude;
            var coords = \`\${userLng},\${userLat};\${spotLng},\${spotLat}\`;

            fetchRoute('foot', coords).then(function(result) {
              if (result) { routeWalk = result; }
              else {
                var dKm = getDistKm(spot);
                routeWalk.distanceM = dKm * 1000 * 1.3;
                routeWalk.durationS = routeWalk.distanceM / 83 * 60;
              }
              if (currentMode === 'walk') {
                renderModeStats();
                if (routeWalk.geometry) {
                  if (routeLine) map.removeLayer(routeLine);
                  routeLine = L.geoJSON(routeWalk.geometry, { style: { color: '#e07a5f', weight: 4, opacity: 0.75 } }).addTo(map);
                  map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
                }
              }
            });

            fetchRoute('driving', coords).then(function(result) {
              if (result) { routeCar = result; }
              else {
                var dKm = getDistKm(spot);
                routeCar.distanceM = dKm * 1000;
                routeCar.durationS = (dKm * 1000) / 667;
              }
              if (currentMode === 'car') renderModeStats();
            });
          }

          function closeModal() {
            postToRN(JSON.stringify({ type: 'mapModalClose' }));
            document.getElementById('modalOverlay').classList.remove('active');
            if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
            selectedSpot = null;
            showTopBar();
          }

          function openGoogleMaps() {
            if (!selectedSpot) return;
            var spotLat = selectedSpot.latitude ?? selectedSpot.Latitude;
            var spotLng = selectedSpot.longitude ?? selectedSpot.Longitude;
            var travelmode = currentMode === 'car' ? 'driving' : 'walking';
            var url = 'https://www.google.com/maps/dir/?api=1' +
              '&origin=' + userLat + ',' + userLng +
              '&destination=' + spotLat + ',' + spotLng +
              '&travelmode=' + travelmode;
            postToRN(JSON.stringify({ type: 'openUrl', url: url }));
          }

          function updateUserPosition(lat, lng) {
            userLat = lat; userLng = lng;
            userMarker.setLatLng([lat, lng]);
            updateLocationButtonVisibility();
          }

          window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'eval') {
              try { eval(event.data.code); } catch(e) {}
            }
          });
        </script>
      </body>
    </html>
  `;
}
