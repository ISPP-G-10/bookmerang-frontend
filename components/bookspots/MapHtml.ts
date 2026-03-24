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

          /* Active cluster — coral */
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
          .filter-row.checked-spot .fr-check { background: #e07a5f; border-color: #e07a5f; }
          .filter-row.checked-drop .fr-check { background: #f97316; border-color: #f97316; }
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

          /* Pick mode banner */
          #pickBanner {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: #3d405b; border-radius: 24px; padding: 10px 20px;
            font-size: 13px; font-weight: 600; color: white; font-family: sans-serif;
            z-index: 1000; white-space: nowrap; display: none;
            align-items: center; gap: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
          }
          #pickBanner.visible { display: flex; }
          #pickBanner button {
            background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.35);
            color: white; border-radius: 16px; padding: 4px 12px;
            font-size: 12px; font-weight: 700; cursor: pointer;
          }

          /* ── Shared modal base ── */
          .modal-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,0.35); z-index: 2000; align-items: flex-end;
          }
          .modal-overlay.active { display: flex; }
          .modal {
            background: white; width: 100%; border-radius: 20px 20px 0 0;
            padding: 20px 20px 32px; font-family: sans-serif;
          }
          .modal-handle {
            width: 36px; height: 4px; background: #e8e8e8;
            border-radius: 2px; margin: 0 auto 18px;
          }

          .modal-type-badge {
            display: inline-flex; align-items: center; gap: 5px;
            font-size: 11px; font-weight: 700; border-radius: 6px;
            padding: 3px 9px; margin-bottom: 8px;
            letter-spacing: 0.04em; text-transform: uppercase;
          }
          .modal-type-badge.active    { background: #fdf0ec; color: #e07a5f; }
          .modal-type-badge.pending   { background: #fffbeb; color: #d97706; }
          .modal-type-badge.validated { background: #e8f5e9; color: #2e7d32; }

          .modal-creator {
            font-size: 12px; color: #9e9aad; margin-bottom: 14px;
            display: flex; align-items: center; gap: 4px;
          }
          .modal-title {
            font-size: 17px; font-weight: 700; color: #3d405b;
            margin-bottom: 3px; line-height: 1.3;
          }
          .modal-address {
            font-size: 13px; color: #9e9aad; margin-bottom: 16px;
            display: flex; align-items: center; gap: 4px;
          }

          /* ── Active bookspot extras ── */
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
          .btn-close {
            width: 100%; padding: 10px; background: transparent; color: #9e9aad;
            border: none; font-size: 14px; cursor: pointer;
          }

          /* ── Pending modal extras ── */
          .progress-track {
            width: 100%; height: 8px; background: #F3E9E0;
            border-radius: 4px; overflow: hidden; margin: 10px 0 6px;
          }
          .progress-fill {
            height: 100%; background: #f59e0b; border-radius: 4px;
            transition: width 0.4s ease;
          }
          .btn-close-gray {
            width: 100%; padding: 13px; background: #f5f4f0; color: #3d405b;
            border: none; border-radius: 12px; font-size: 14px; font-weight: 600;
            cursor: pointer;
          }
          .btn-danger-outline {
            width: 100%; padding: 13px; background: transparent;
            border: 1.5px solid #fca5a5; border-radius: 12px;
            font-size: 14px; font-weight: 600; color: #ef4444;
            cursor: pointer; margin-bottom: 10px;
          }
          .edit-name-input {
            width: 100%; padding: 10px 12px; border: 1.5px solid #e07a5f;
            border-radius: 10px; font-size: 15px; font-weight: 600; color: #3d405b;
            font-family: sans-serif; margin-bottom: 8px; outline: none;
          }
          .btn-save-name {
            width: 100%; padding: 11px; background: #e07a5f; color: white;
            border: none; border-radius: 10px; font-size: 14px; font-weight: 700;
            cursor: pointer; margin-bottom: 8px;
          }
          .btn-cancel-edit {
            width: 100%; padding: 8px; background: transparent; color: #9e9aad;
            border: none; font-size: 13px; cursor: pointer; margin-bottom: 10px;
          }

          /* ── Validated state box ── */
          #pendingValidatedBox {
            display: none; background: #e8f5e9; border: 1px solid #a5d6a7;
            border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;
          }
          #pendingValidatedBox.visible { display: block; }
          #pendingValidatedBox .val-title {
            font-size: 13px; font-weight: 800; color: #2e7d32; margin-bottom: 3px;
          }
          #pendingValidatedBox .val-sub { font-size: 12px; color: #4caf50; }

          /* ── Inline delete confirmation ── */
          #pendingDeleteConfirm {
            display: none; background: #fff5f5; border: 1px solid #fca5a5;
            border-radius: 12px; padding: 14px; margin-bottom: 12px;
          }
          #pendingDeleteConfirm.visible { display: block; }
          #pendingDeleteConfirm p {
            font-size: 13px; color: #3d405b; font-weight: 600; margin-bottom: 4px;
          }
          #pendingDeleteConfirm small {
            font-size: 12px; color: #9e9aad; display: block; margin-bottom: 12px;
          }
          #pendingDeleteConfirm .confirm-row { display: flex; gap: 8px; }
          #pendingDeleteConfirm .confirm-row button {
            flex: 1; padding: 9px; border-radius: 8px; font-size: 13px;
            font-weight: 700; cursor: pointer; border: none;
          }
          #pendingDeleteConfirm .confirm-row .btn-cancel-confirm {
            border: 1.5px solid #e07a5f !important; background: transparent; color: #e07a5f;
          }
          #pendingDeleteConfirm .confirm-row .btn-confirm-delete {
            background: #ef4444; color: white;
          }

          /* ── User location modal ── */
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
              <div class="filter-row checked-spot" id="rowSpot" onclick="toggleFilter('spot')">
                <div class="fr-icon" style="background:#fdf0ec;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e07a5f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <span class="fr-label">BookSpot</span>
                <div class="fr-check">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                </div>
              </div>
              <div class="filter-row checked-drop" id="rowDrop" onclick="toggleFilter('drop')">
                <div class="fr-icon" style="background:#fff3eb;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <span class="fr-label">BookDrop</span>
                <div class="fr-check">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 6 5 9 10 3"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="tooFarBanner"><span class="bdot"></span><span>Acerca el zoom para ver BookSpots</span></div>
        <div id="pickBanner">
          <span>Arrastra el pin o toca para ubicar</span>
          <button onclick="cancelPickMode()">Cancelar</button>
        </div>

        <!-- User location modal -->
        <div id="userModalOverlay" onclick="closeUserModal()">
          <div id="userModal" onclick="event.stopPropagation()">
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
            <button class="btn-close-gray" style="margin-top:20px" onclick="closeUserModal()">Cerrar</button>
          </div>
        </div>

        <!-- Active bookspot modal -->
        <!-- ✅ FIX: id and class are now separate attributes -->
        <div class="modal-overlay" id="modalOverlay" onclick="closeModal()">
          <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-handle"></div>
            <div class="modal-type-badge active" id="modalTypeBadge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#e07a5f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              BookSpot
            </div>
            <div class="modal-title" id="modalTitle"></div>
            <div class="modal-address">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span id="modalAddress"></span>
            </div>
            <div class="modal-creator" id="modalCreator" style="display:none">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span id="modalCreatorText"></span>
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
        <div class="modal-overlay" id="pendingModalOverlay" onclick="closePendingModal()">
          <div class="modal" onclick="event.stopPropagation()">
            <div class="modal-handle"></div>
            <div class="modal-type-badge pending" id="pendingStatusBadge">
              Pendiente de validación
            </div>

            <!-- View mode: title + edit button -->
            <div id="pendingViewMode">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
                <div class="modal-title" id="pendingModalTitle"></div>
                <button id="pendingEditBtn" onclick="startEditName()"
                  style="background:none;border:none;cursor:pointer;padding:4px 6px;color:#9e9aad;font-size:12px;display:flex;align-items:center;gap:4px">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>
              </div>
            </div>

            <!-- Edit mode: input -->
            <div id="pendingEditMode" style="display:none;margin-bottom:3px">
              <input type="text" id="pendingNameInput" class="edit-name-input" placeholder="Nombre del lugar"/>
              <button class="btn-save-name" onclick="saveEditedName()">Guardar nombre</button>
              <button class="btn-cancel-edit" onclick="cancelEditName()">Cancelar</button>
            </div>

            <div class="modal-address">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9e9aad" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span id="pendingModalAddress"></span>
            </div>

            <!-- Validated box -->
            <div id="pendingValidatedBox">
              <div class="val-title">BookSpot validado</div>
              <div class="val-sub">Ya aparece en el mapa para la comunidad</div>
            </div>

            <!-- Progress box -->
            <div id="pendingProgressBox" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:#d97706;text-transform:uppercase;margin-bottom:8px">
                Progreso de validaciones
              </div>
              <div class="progress-track">
                <div class="progress-fill" id="pendingProgressFill" style="width:0%"></div>
              </div>
              <div style="font-size:13px;font-weight:700;color:#3d405b;margin-top:4px" id="pendingProgressText"></div>
              <div style="font-size:12px;color:#9e9aad;margin-top:3px" id="pendingProgressSub"></div>
            </div>

            <div style="font-size:12px;color:#c9b5a3;margin-bottom:16px" id="pendingCreatedAt"></div>

            <!-- Inline delete confirmation -->
            <div id="pendingDeleteConfirm">
              <p id="pendingDeleteTitle">¿Eliminar esta propuesta?</p>
              <small id="pendingDeleteSub">Se liberará uno de tus cupos del mes. Esta acción no se puede deshacer.</small>
              <div class="confirm-row">
                <button class="btn-cancel-confirm" onclick="hideDeleteConfirm()">Cancelar</button>
                <button class="btn-confirm-delete" onclick="doDeletePending()">Eliminar</button>
              </div>
            </div>

            <button class="btn-danger-outline" onclick="showDeleteConfirm()">Eliminar propuesta</button>
            <button class="btn-close-gray" onclick="closePendingModal()">Cerrar</button>
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
          let currentPendingSpot = null;
          let routeLine = null;
          let currentMode = 'walk';
          let routeCar  = { distanceM: null, durationS: null, geometry: null };
          let routeWalk = { distanceM: null, durationS: null, geometry: null };
          let isPicking = false;
          let pickedMarker = null;
          let ownActiveIds = new Set();
          let allSpots = [];
          let filterSpot = true;
          let filterDrop = true;
          let filterDropdownOpen = false;

          const BACK_BTN_THRESHOLD_M = 300;

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
          document.addEventListener('click', function(e) {
            var wrap = document.getElementById('filterWrap');
            if (filterDropdownOpen && !wrap.contains(e.target)) {
              filterDropdownOpen = false;
              document.getElementById('filterDropdown').classList.remove('open');
            }
          });
          function updateFilterPill() {
            document.getElementById('filterPill').classList.toggle('has-inactive', !filterSpot || !filterDrop);
          }
          function toggleFilter(type) {
            if (type === 'spot') {
              if (filterSpot && !filterDrop) return;
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
            if (!allSpots || allSpots.length === 0) {
              document.getElementById('radiusText').textContent = 'Sin BookSpots cerca';
              return;
            }
            var filtered = allSpots.filter(function(spot) {
              var id = spot.id ?? spot.Id;
              var isBookdrop = spot.isBookdrop ?? spot.IsBookdrop ?? false;
              if (isBookdrop && !filterDrop) return false;
              if (!isBookdrop && !filterSpot) return false;
              if (id != null && ownActiveIds.has(id)) return false;
              return true;
            });
            filtered.forEach(function(spot) {
              var isBookdrop = spot.isBookdrop ?? spot.IsBookdrop ?? false;
              var m = L.marker(
                [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude],
                { icon: isBookdrop ? createBookdropIcon() : createSpotIcon() }
              ).on('click', function() { openModal(spot); });
              clusterGroup.addLayer(m);
            });
            updateRadiusBadge();
          }

          function updateLocationButtonVisibility() {
            var center = map.getCenter();
            var distToUser = map.distance([center.lat, center.lng], [userLat, userLng]);
            postToRN(JSON.stringify({ type: 'locationButtonVisible', visible: distToUser > BACK_BTN_THRESHOLD_M }));
          }

          function backToUserLocation() {
            map.setView([userLat, userLng], 17, { animate: true });
          }

          /* ── Icons ── */
          function teardropSVG(fillColor, iconPath) {
            return \`<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
              <ellipse cx="17" cy="44" rx="5.5" ry="2" fill="rgba(0,0,0,0.15)"/>
              <path d="M17 1 C8.716 1 2 7.716 2 16 C2 28.5 17 44 17 44 C17 44 32 28.5 32 16 C32 7.716 25.284 1 17 1Z"
                fill="\${fillColor}"/>
              <svg x="9" y="6" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                \${iconPath}
              </svg>
            </svg>\`;
          }

          const BOOK_ICON = \`
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          \`;
          const HOURGLASS_ICON = \`
            <path d="M5 22h14"/><path d="M5 2h14"/>
            <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/>
            <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
          \`;

          function createSpotIcon() {
            return L.divIcon({
              className: '',
              html: teardropSVG('#e07a5f', BOOK_ICON),
              iconSize: [34, 46], iconAnchor: [17, 44], popupAnchor: [0, -44],
            });
          }
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
              html: teardropSVG('#f59e0b', HOURGLASS_ICON),
              iconSize: [34, 46], iconAnchor: [17, 44], popupAnchor: [0, -44],
            });
          }
          function createOwnActiveIcon() {
            return L.divIcon({
              className: '',
              html: teardropSVG('#4caf50', BOOK_ICON),
              iconSize: [34, 46], iconAnchor: [17, 44], popupAnchor: [0, -44],
            });
          }
          function createPickedIcon() {
            return L.divIcon({
              className: '',
              html: teardropSVG('#f59e0b', BOOK_ICON),
              iconSize: [34, 46], iconAnchor: [17, 44], popupAnchor: [0, -44],
            });
          }
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

          const userMarker = L.marker([${lat}, ${lng}], { icon: createUserIcon() })
            .addTo(map).on('click', openUserModal);

          /* ── Active bookspots cluster ── */
          const clusterGroup = L.markerClusterGroup({
            maxClusterRadius: 48, spiderfyOnMaxZoom: true,
            showCoverageOnHover: false, zoomToBoundsOnClick: true,
          });
          map.addLayer(clusterGroup);

          /* ── Pending bookspots cluster (amber) ── */
          const pendingClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 48, spiderfyOnMaxZoom: true,
            showCoverageOnHover: false, zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
              var count = cluster.getChildCount();
              return L.divIcon({
                className: '',
                html: \`<div style="
                  width:40px;height:40px;border-radius:50%;
                  background:rgba(245,158,11,0.85);
                  border:3px solid rgba(245,158,11,0.3);
                  display:flex;align-items:center;justify-content:center;
                  color:white;font-weight:700;font-size:13px;
                  box-shadow:0 2px 6px rgba(0,0,0,0.2);
                ">\${count}<\/div>\`,
                iconSize: [40, 40], iconAnchor: [20, 20],
              });
            }
          });
          map.addLayer(pendingClusterGroup);

          /* ── Own validated bookspots cluster (green) ── */
          const ownActiveClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 48, spiderfyOnMaxZoom: true,
            showCoverageOnHover: false, zoomToBoundsOnClick: true,
            iconCreateFunction: function(cluster) {
              var count = cluster.getChildCount();
              return L.divIcon({
                className: '',
                html: \`<div style="
                  width:40px;height:40px;border-radius:50%;
                  background:rgba(76,175,80,0.85);
                  border:3px solid rgba(76,175,80,0.3);
                  display:flex;align-items:center;justify-content:center;
                  color:white;font-weight:700;font-size:13px;
                  box-shadow:0 2px 6px rgba(0,0,0,0.2);
                ">\${count}<\/div>\`,
                iconSize: [40, 40], iconAnchor: [20, 20],
              });
            }
          });
          map.addLayer(ownActiveClusterGroup);

          function getDistKm(s) {
            var d = s.distanceKm !== undefined ? s.distanceKm : s.DistanceKm;
            return typeof d === 'number' && isFinite(d) ? d : 0;
          }

          function updateRadiusBadge() {
            if (!allSpots || allSpots.length === 0) {
              document.getElementById('radiusText').textContent = 'Sin BookSpots cerca';
              return;
            }
            var bounds = map.getBounds();
            var visibleSpots = allSpots.filter(function(spot) {
              var lat = spot.latitude ?? spot.Latitude;
              var lng = spot.longitude ?? spot.Longitude;
              var isBookdrop = spot.isBookdrop ?? spot.IsBookdrop ?? false;
              var id = spot.id ?? spot.Id;
              return bounds.contains(L.latLng(lat, lng))
                && (isBookdrop ? filterDrop : filterSpot)
                && (id == null || !ownActiveIds.has(id));
            });
            if (visibleSpots.length === 0) {
              document.getElementById('radiusText').textContent = 'Sin BookSpots cerca';
              return;
            }
            var maxDist = Math.max.apply(null, visibleSpots.map(function(spot) {
              return (map.distance([userLat, userLng], [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude]) / 1000) * 1.3;
            }));
            document.getElementById('radiusText').textContent = 'BookSpots hasta ' + formatDistKm(maxDist) + ' de ti';
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

          /* ── User pending spots — now uses pendingClusterGroup so they cluster on zoom-out ── */
          function updateUserPendingSpots(spots) {
            pendingClusterGroup.clearLayers();
            if (!spots || spots.length === 0) return;
            spots.forEach(function(spot) {
              L.marker(
                [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude],
                { icon: createPendingIcon() }
              ).on('click', function() { openPendingModal(spot); })
              .addTo(pendingClusterGroup);
            });
          }

          function updateUserActiveSpots(spots) {
            ownActiveClusterGroup.clearLayers();
            ownActiveIds = new Set();
            if (spots && spots.length > 0) {
              spots.forEach(function(spot) {
                var id = spot.id ?? spot.Id;
                if (id != null) ownActiveIds.add(id);
                L.marker(
                  [spot.latitude ?? spot.Latitude, spot.longitude ?? spot.Longitude],
                  { icon: createOwnActiveIcon() }
                ).on('click', function() { openOwnActiveModal(spot); })
                .addTo(ownActiveClusterGroup);
              });
            }
            repaintSpots();
          }

          function openOwnActiveModal(spot) {
            currentPendingSpot = { ...spot, _isOwnActive: true };
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            hideTopBar();
            document.getElementById('pendingViewMode').style.display = 'block';
            document.getElementById('pendingEditMode').style.display = 'none';
            document.getElementById('pendingDeleteConfirm').classList.remove('visible');
            var badge = document.getElementById('pendingStatusBadge');
            badge.className = 'modal-type-badge validated';
            badge.textContent = '✓ Validado';
            document.getElementById('pendingEditBtn').style.display = 'none';
            document.getElementById('pendingValidatedBox').classList.add('visible');
            document.getElementById('pendingProgressBox').style.display = 'none';
            document.getElementById('pendingDeleteTitle').textContent = '¿Estás seguro de querer borrarlo?';
            document.getElementById('pendingDeleteSub').textContent =
              'En caso de eliminarlo, tendrá que volver a ser validado por la comunidad para reaparecer en el mapa.';
            document.getElementById('pendingModalTitle').textContent = spot.nombre ?? spot.Nombre ?? '';
            document.getElementById('pendingModalAddress').textContent = spot.addressText ?? spot.AddressText ?? '';
            var created = spot.createdAt ?? spot.CreatedAt ?? '';
            document.getElementById('pendingCreatedAt').textContent =
              created ? 'Propuesto el ' + new Date(created).toLocaleDateString('es-ES') : '';
            document.getElementById('pendingModalOverlay').classList.add('active');
          }

          function openPendingModal(spot) {
            currentPendingSpot = spot;
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            hideTopBar();
            var nombre = spot.nombre ?? spot.Nombre ?? '';
            var address = spot.addressText ?? spot.AddressText ?? '';
            var validation = spot.validationCount ?? 0;
            var required = spot.requiredValidations ?? 5;
            var remaining = required - validation;
            var pct = Math.min((validation / required) * 100, 100).toFixed(0);
            var created = spot.createdAt ?? spot.CreatedAt ?? '';
            var isValidated = validation >= required;
            document.getElementById('pendingViewMode').style.display = 'block';
            document.getElementById('pendingEditMode').style.display = 'none';
            document.getElementById('pendingDeleteConfirm').classList.remove('visible');
            var badge = document.getElementById('pendingStatusBadge');
            if (isValidated) {
              badge.className = 'modal-type-badge validated';
              badge.textContent = '✓ Validado';
            } else {
              badge.className = 'modal-type-badge pending';
              badge.textContent = 'Pendiente de validación';
            }
            document.getElementById('pendingEditBtn').style.display = isValidated ? 'none' : 'flex';
            document.getElementById('pendingValidatedBox').classList.toggle('visible', isValidated);
            document.getElementById('pendingProgressBox').style.display = isValidated ? 'none' : 'block';
            document.getElementById('pendingDeleteTitle').textContent = isValidated
              ? '¿Estás seguro de querer borrarlo?'
              : '¿Eliminar esta propuesta?';
            document.getElementById('pendingDeleteSub').textContent = isValidated
              ? 'En caso de eliminarlo, tendrá que volver a ser validado por la comunidad para reaparecer en el mapa.'
              : 'Se liberará uno de tus cupos del mes. Esta acción no se puede deshacer.';
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
            currentPendingSpot = null;
          }

          /* ── Edit name ── */
          function startEditName() {
            if (!currentPendingSpot) return;
            document.getElementById('pendingNameInput').value = currentPendingSpot.nombre ?? currentPendingSpot.Nombre ?? '';
            document.getElementById('pendingViewMode').style.display = 'none';
            document.getElementById('pendingEditMode').style.display = 'block';
            document.getElementById('pendingDeleteConfirm').classList.remove('visible');
            setTimeout(function() { document.getElementById('pendingNameInput').focus(); }, 100);
          }
          function cancelEditName() {
            document.getElementById('pendingEditMode').style.display = 'none';
            document.getElementById('pendingViewMode').style.display = 'block';
          }
          function saveEditedName() {
            if (!currentPendingSpot) return;
            var newName = document.getElementById('pendingNameInput').value.trim();
            if (!newName || newName.length < 3) return;
            currentPendingSpot.nombre = newName;
            document.getElementById('pendingModalTitle').textContent = newName;
            cancelEditName();
            postToRN(JSON.stringify({ type: 'editPendingSpotName', id: currentPendingSpot.id, nombre: newName }));
          }

          /* ── Delete ── */
          function showDeleteConfirm() {
            document.getElementById('pendingDeleteConfirm').classList.add('visible');
            document.getElementById('pendingEditMode').style.display = 'none';
            document.getElementById('pendingViewMode').style.display = 'block';
          }
          function hideDeleteConfirm() {
            document.getElementById('pendingDeleteConfirm').classList.remove('visible');
          }
          function doDeletePending() {
            if (!currentPendingSpot) return;
            postToRN(JSON.stringify({ type: 'deletePendingSpot', id: currentPendingSpot.id }));
            closePendingModal();
          }

          function showTooFarMessage() {
            allSpots = [];
            clusterGroup.clearLayers();
            document.getElementById('tooFarBanner').classList.add('visible');
            document.getElementById('radiusText').textContent = '';
          }

          /* ── Pick mode ── */
          function enablePickMode() {
            isPicking = true;
            document.getElementById('pickBanner').classList.add('visible');
            if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e) {} }
            pickedMarker = L.marker([userLat, userLng], {
              icon: createPickedIcon(), draggable: true, autoPan: true,
            }).addTo(map);
            pickedMarker.on('dragend', function(e) {
              var ll = e.target.getLatLng();
              postToRN(JSON.stringify({ type: 'pickLocation', lat: ll.lat, lng: ll.lng }));
              isPicking = false;
              document.getElementById('pickBanner').classList.remove('visible');
            });
            map.once('click', function(e) {
              if (!isPicking) return;
              var lat = e.latlng.lat, lng = e.latlng.lng;
              if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e2) {} pickedMarker = null; }
              pickedMarker = L.marker([lat, lng], { icon: createPickedIcon() }).addTo(map);
              postToRN(JSON.stringify({ type: 'pickLocation', lat, lng }));
              isPicking = false;
              document.getElementById('pickBanner').classList.remove('visible');
            });
          }
          function cancelPickMode() {
            isPicking = false;
            document.getElementById('pickBanner').classList.remove('visible');
            if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e) {} pickedMarker = null; }
            postToRN(JSON.stringify({ type: 'pickCancelled' }));
          }
          function disablePickMode() {
            isPicking = false;
            document.getElementById('pickBanner').classList.remove('visible');
            if (pickedMarker) { try { map.removeLayer(pickedMarker); } catch(e) {} pickedMarker = null; }
          }

          /* ── Swipe-down to close ── */
          function setupSwipeDown(modalEl, closeFn) {
            var startY = 0, isDragging = false;
            modalEl.addEventListener('touchstart', function(e) {
              startY = e.touches[0].clientY; isDragging = false; modalEl.style.transition = '';
            }, { passive: true });
            modalEl.addEventListener('touchmove', function(e) {
              var dy = e.touches[0].clientY - startY;
              if (dy > 8) { isDragging = true; modalEl.style.transform = 'translateY(' + Math.max(0, dy) + 'px)'; }
            }, { passive: true });
            modalEl.addEventListener('touchend', function(e) {
              var dy = e.changedTouches[0].clientY - startY;
              if (isDragging && dy > 80) {
                modalEl.style.transition = 'transform 0.2s ease';
                modalEl.style.transform = 'translateY(100vh)';
                setTimeout(function() { modalEl.style.transition = ''; modalEl.style.transform = ''; closeFn(); }, 210);
              } else {
                modalEl.style.transition = 'transform 0.25s ease'; modalEl.style.transform = '';
                setTimeout(function() { modalEl.style.transition = ''; }, 260);
              }
              isDragging = false;
            }, { passive: true });
          }
          (function() {
            var activeModal = document.querySelector('#modalOverlay .modal');
            var pendingModal = document.querySelector('#pendingModalOverlay .modal');
            var userModalEl = document.getElementById('userModal');
            if (activeModal) setupSwipeDown(activeModal, closeModal);
            if (pendingModal) setupSwipeDown(pendingModal, closePendingModal);
            if (userModalEl) setupSwipeDown(userModalEl, closeUserModal);
          })();

          /* ── View change ── */
          function emitViewChange() {
            var center = map.getCenter();
            var ne = map.getBounds().getNorthEast();
            var radiusKm = map.distance(center, ne) / 1000;
            postToRN(JSON.stringify({ type: 'viewChange', lat: center.lat, lng: center.lng, radiusKm }));
          }
          map.on('zoomend', function() { emitViewChange(); updateRadiusBadge(); updateLocationButtonVisibility(); });
          map.on('moveend', function() { emitViewChange(); updateRadiusBadge(); updateLocationButtonVisibility(); });

          /* ── Active spot modal ── */
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
            // ✅ getElementById now works correctly because id="modalTypeBadge" is clean
            var badge = document.getElementById('modalTypeBadge');
            badge.textContent = isBookdrop ? 'BookDrop' : 'BookSpot';
            badge.style.background = isBookdrop ? '#fff3eb' : '#fdf0ec';
            badge.style.color = isBookdrop ? '#f97316' : '#e07a5f';

            document.getElementById('btnWalk').classList.add('active');
            document.getElementById('btnCar').classList.remove('active');
            document.getElementById('modalTitle').textContent = spot.nombre ?? spot.Nombre;
            document.getElementById('modalAddress').textContent = spot.addressText ?? spot.AddressText;

            var creator = spot.creatorUsername ?? spot.CreatorUsername ?? null;
            var creatorEl = document.getElementById('modalCreator');
            if (creator) {
              document.getElementById('modalCreatorText').textContent = 'Añadido por ' + creator;
              creatorEl.style.display = 'flex';
            } else {
              creatorEl.style.display = 'none';
            }

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

          /* ── User location modal ── */
          async function openUserModal() {
            postToRN(JSON.stringify({ type: 'mapModalOpen' }));
            hideTopBar();
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
