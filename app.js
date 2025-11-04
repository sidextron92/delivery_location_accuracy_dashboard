// Global state
let ordersData = [];
let aggregatedUserData = []; // Aggregated data by user ID
let darkstoresData = [];
let map = null;
let markersLayer = null;
let selectedUserId = null;
let currentTileLayer = null;
let orderMarkers = {}; // Store markers by order ID for hover functionality
let sortDirection = 'desc'; // Default sort direction

// Map tile layer configurations
const mapStyles = {
    osm: {
        name: 'OpenStreetMap (Default)',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    },
    minimal: {
        name: 'Minimal (No POIs)',
        url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    },
    light: {
        name: 'Light Mode',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    },
    streets: {
        name: 'Streets Only',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
    }
};

// Custom marker icons
const orderIcon = L.divIcon({
    className: 'custom-marker order-icon',
    html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3498db" width="32" height="32"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const orderIconHighlight = L.divIcon({
    className: 'custom-marker order-icon-highlight',
    html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3498db" width="48" height="48"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
});

const darkstoreIcon = L.divIcon({
    className: 'custom-marker darkstore-icon',
    html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e74c3c" width="36" height="36"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

// Initialize the map
function initMap(styleKey = 'osm') {
    if (map) {
        map.remove();
    }

    // Initialize map centered on India (you can change this default)
    map = L.map('map').setView([20.5937, 78.9629], 5);

    // Add the selected tile layer
    const style = mapStyles[styleKey];
    currentTileLayer = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// Change map style
function changeMapStyle(styleKey) {
    if (!map) return;

    // Store current view
    const center = map.getCenter();
    const zoom = map.getZoom();

    // Remove current tile layer
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    // Add new tile layer
    const style = mapStyles[styleKey];
    currentTileLayer = L.tileLayer(style.url, {
        attribution: style.attribution,
        maxZoom: style.maxZoom
    }).addTo(map);

    // Restore view
    map.setView(center, zoom);
}

// Search location on map
let searchMarker = null;

function searchLocation() {
    const searchInput = document.getElementById('mapSearch');
    const query = searchInput.value.trim();

    if (!query) {
        alert('Please enter a location to search');
        return;
    }

    // Check if input is coordinates (lat,long format)
    const coordsMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);

        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            showLocationOnMap(lat, lng, 'Searched Coordinates');
            return;
        }
    }

    // Use Nominatim geocoding service for place names
    const searchBtn = document.getElementById('searchBtn');
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                const displayName = data[0].display_name;
                showLocationOnMap(lat, lng, displayName);
            } else {
                alert('Location not found. Try searching for a city name or coordinates (e.g., 28.6139, 77.2090)');
            }
        })
        .catch(error => {
            console.error('Search error:', error);
            alert('Error searching location. Please try again.');
        })
        .finally(() => {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>';
        });
}

function showLocationOnMap(lat, lng, name) {
    if (!map) return;

    // Remove previous search marker if exists
    if (searchMarker) {
        map.removeLayer(searchMarker);
    }

    // Create a custom icon for search result
    const searchIcon = L.divIcon({
        className: 'custom-marker search-marker',
        html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" width="36" height="36"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });

    // Add search marker
    searchMarker = L.marker([lat, lng], { icon: searchIcon }).addTo(map);
    searchMarker.bindPopup(`<div class="popup-content"><h3>Search Result</h3><p>${name}</p></div>`).openPopup();

    // Zoom to location
    map.setView([lat, lng], 13);
}

// Parse CSV or JSON file
function parseFile(file, callback) {
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'json') {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                callback(data);
            } catch (error) {
                alert('Error parsing JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    } else if (fileExtension === 'csv') {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                callback(results.data);
            },
            error: function(error) {
                alert('Error parsing CSV file: ' + error.message);
            }
        });
    } else {
        alert('Unsupported file format. Please upload CSV or JSON file.');
    }
}

// Parse LatLong string to coordinates
function parseLatLong(latLongStr) {
    if (!latLongStr) return null;

    // Handle different formats: "lat,long" or "lat, long" or comma-separated
    const cleaned = latLongStr.toString().trim();
    const parts = cleaned.split(',').map(p => p.trim());

    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

    return { lat, lng };
}

// Normalize data keys (handle different naming conventions)
function normalizeOrderData(data) {
    return data.map(row => {
        const normalized = {};

        // Map exact column names from the data
        for (let key in row) {
            const trimmedKey = key.trim();
            const lowerKey = key.toLowerCase().replace(/[_\s]/g, '');

            // Map to standardized field names
            if (trimmedKey === 'Userid' || lowerKey.includes('userid')) {
                normalized.userId = row[key];
            } else if (trimmedKey === 'Order id' || lowerKey.includes('orderid')) {
                normalized.orderId = row[key];
            } else if (trimmedKey === 'O date' || lowerKey === 'odate') {
                normalized.orderDate = row[key];
            } else if (trimmedKey === 'Delivery lat long' || lowerKey === 'deliverylatlong') {
                normalized.latLong = row[key];
            } else if (trimmedKey === 'Dsid' || lowerKey === 'dsid') {
                normalized.dsId = row[key];
            } else if (trimmedKey === 'Del company address' || lowerKey === 'delcompanyaddress') {
                normalized.address1 = row[key];
            } else if (trimmedKey === 'Del company address 2' || lowerKey === 'delcompanyaddress2') {
                normalized.address2 = row[key];
            } else if (trimmedKey === 'Del landmark' || lowerKey === 'dellandmark') {
                normalized.landmark = row[key];
            } else if (trimmedKey === 'Del pincode' || lowerKey === 'delpincode') {
                normalized.pincode = row[key];
            } else if (trimmedKey === 'Del city' || lowerKey === 'delcity') {
                normalized.city = row[key];
            } else if (trimmedKey === 'Del state' || lowerKey === 'delstate') {
                normalized.state = row[key];
            } else {
                // Keep any other fields as-is
                normalized[key] = row[key];
            }
        }

        return normalized;
    }).filter(row => row.userId && row.orderId && row.latLong);
}

// Normalize darkstore data
function normalizeDarkstoreData(data) {
    return data.map(row => {
        const normalized = {};

        for (let key in row) {
            const trimmedKey = key.trim();
            const lowerKey = key.toLowerCase().replace(/[_\s]/g, '');

            // Map exact column names: dsid and DarkStoreLatLong
            if (trimmedKey === 'dsid' || trimmedKey === 'Dsid' || lowerKey === 'dsid') {
                normalized.dsId = row[key];
            } else if (trimmedKey === 'DarkStoreLatLong' || lowerKey === 'darkstorelatlong') {
                normalized.latLong = row[key];
            } else if (lowerKey.includes('name')) {
                normalized.name = row[key];
            } else {
                normalized[key] = row[key];
            }
        }

        return normalized;
    }).filter(row => row.dsId && row.latLong);
}

// Aggregate orders by user ID
function aggregateOrdersByUser() {
    const userMap = {};

    ordersData.forEach(order => {
        if (!userMap[order.userId]) {
            userMap[order.userId] = {
                userId: order.userId,
                orders: [],
                orderCount: 0,
                lastOrderDate: order.orderDate || '',
                city: order.city || '',
                dsId: order.dsId || ''
            };
        }

        userMap[order.userId].orders.push(order);
        userMap[order.userId].orderCount++;

        // Update last order date (find the most recent)
        if (order.orderDate && order.orderDate > userMap[order.userId].lastOrderDate) {
            userMap[order.userId].lastOrderDate = order.orderDate;
        }

        // Update city and dsId (use the most recent order's data)
        if (order.orderDate === userMap[order.userId].lastOrderDate) {
            userMap[order.userId].city = order.city || '';
            userMap[order.userId].dsId = order.dsId || '';
        }
    });

    return Object.values(userMap);
}

// Load orders data
function loadOrdersData(data) {
    ordersData = normalizeOrderData(data);

    if (ordersData.length === 0) {
        alert('No valid order data found. Please check your file format.');
        return;
    }

    aggregatedUserData = aggregateOrdersByUser();
    populateOrdersTable(aggregatedUserData);
    populateCityFilter();
    console.log(`Loaded ${ordersData.length} orders from ${aggregatedUserData.length} unique users`);
}

// Load darkstores data
function loadDarkstoresData(data) {
    darkstoresData = normalizeDarkstoreData(data);

    if (darkstoresData.length === 0) {
        alert('No valid darkstore data found. Please check your file format.');
        return;
    }

    console.log(`Loaded ${darkstoresData.length} darkstores`);

    // Refresh map if a user is selected
    if (selectedUserId) {
        plotUserOrders(selectedUserId);
    }
}

// Populate orders table with aggregated user data
function populateOrdersTable(data) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No users found</td></tr>';
        return;
    }

    data.forEach(user => {
        const row = document.createElement('tr');
        row.dataset.userId = user.userId;
        row.innerHTML = `
            <td>${user.userId}</td>
            <td><strong>${user.orderCount}</strong></td>
            <td>${user.lastOrderDate || 'N/A'}</td>
            <td>${user.city || 'N/A'}</td>
            <td>${user.dsId || 'N/A'}</td>
        `;

        row.addEventListener('click', function() {
            handleRowClick(user.userId);
        });

        tbody.appendChild(row);
    });
}

// Handle row click
function handleRowClick(userId) {
    selectedUserId = userId;

    // Update selected row styling
    document.querySelectorAll('#ordersTable tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
    document.querySelector(`#ordersTable tbody tr[data-user-id="${userId}"]`)?.classList.add('selected');

    // Close the drawer
    closeDrawer();

    // Plot user orders on map
    plotUserOrders(userId);

    // Update details table
    updateDetailsTable(userId);
}

// Plot user orders on map
function plotUserOrders(userId) {
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();
    orderMarkers = {}; // Clear marker references

    // Filter orders for selected user
    const userOrders = ordersData.filter(order => order.userId === userId);

    if (userOrders.length === 0) return;

    const bounds = [];

    // Plot order markers (blue pins)
    userOrders.forEach(order => {
        const coords = parseLatLong(order.latLong);
        if (!coords) return;

        const marker = L.marker([coords.lat, coords.lng], {
            icon: orderIcon,
            zIndexOffset: 100
        });

        // Build address string
        let addressParts = [];
        if (order.address1) addressParts.push(order.address1);
        if (order.address2) addressParts.push(order.address2);
        if (order.landmark) addressParts.push(order.landmark);
        const fullAddress = addressParts.join(', ') || 'N/A';

        const popupContent = `
            <div class="popup-content">
                <h3>Order Details</h3>
                <p><strong>Order ID:</strong> ${order.orderId}</p>
                <p><strong>User ID:</strong> ${order.userId}</p>
                <p><strong>Order Date:</strong> ${order.orderDate || 'N/A'}</p>
                <p><strong>Address:</strong> ${fullAddress}</p>
                <p><strong>City:</strong> ${order.city || 'N/A'}</p>
                <p><strong>State:</strong> ${order.state || 'N/A'}</p>
                <p><strong>Pincode:</strong> ${order.pincode || 'N/A'}</p>
                <p><strong>DS ID:</strong> ${order.dsId || 'N/A'}</p>
                <p><strong>Coordinates:</strong> ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</p>
            </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(markersLayer);
        bounds.push([coords.lat, coords.lng]);

        // Store marker reference by order ID
        orderMarkers[order.orderId] = marker;
    });

    // Plot darkstore markers (red) for this user's orders
    const userDsIds = [...new Set(userOrders.map(o => o.dsId).filter(Boolean))];

    darkstoresData.forEach(ds => {
        if (userDsIds.includes(ds.dsId)) {
            const coords = parseLatLong(ds.latLong);
            if (!coords) return;

            const marker = L.marker([coords.lat, coords.lng], {
                icon: darkstoreIcon,
                zIndexOffset: 200
            });

            const popupContent = `
                <div class="popup-content">
                    <h3>Darkstore</h3>
                    <p><strong>DS ID:</strong> ${ds.dsId}</p>
                    ${ds.name ? `<p><strong>Name:</strong> ${ds.name}</p>` : ''}
                    <p><strong>Coordinates:</strong> ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}</p>
                </div>
            `;

            marker.bindPopup(popupContent);
            marker.addTo(markersLayer);
            bounds.push([coords.lat, coords.lng]);
        }
    });

    // Fit map to bounds
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Format date to DD-MM-YYYY
function formatDate(dateString) {
    if (!dateString) return 'N/A';

    // Try to parse the date
    let date;
    if (dateString.includes('-')) {
        const parts = dateString.split('-');
        // Check if it's YYYY-MM-DD format
        if (parts[0].length === 4) {
            date = new Date(dateString);
        } else {
            // Assume DD-MM-YYYY format, return as is
            return dateString;
        }
    } else if (dateString.includes('/')) {
        date = new Date(dateString);
    } else {
        return dateString;
    }

    // Format to DD-MM-YYYY
    if (date && !isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }

    return dateString;
}

// Update details table
function updateDetailsTable(userId) {
    const userOrders = ordersData.filter(order => order.userId === userId);

    // Sort orders by date descending (most recent first)
    userOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate || '1970-01-01');
        const dateB = new Date(b.orderDate || '1970-01-01');
        return dateB - dateA; // Descending order
    });

    // Update user info
    const userInfo = document.getElementById('userInfo');
    userInfo.innerHTML = `
        <p><strong>Selected User ID:</strong> ${userId} | <strong>Total Orders:</strong> ${userOrders.length}</p>
    `;

    // Update details table
    const tbody = document.getElementById('detailsTableBody');
    tbody.innerHTML = '';

    if (userOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No orders found for this user</td></tr>';
        return;
    }

    userOrders.forEach(order => {
        const coords = parseLatLong(order.latLong);

        // Build address string (with landmark below)
        let addressParts = [];
        if (order.address1) addressParts.push(order.address1);
        if (order.address2) addressParts.push(order.address2);
        const fullAddress = addressParts.join(', ') || '';

        // Create address with landmark on new line
        let addressHTML = fullAddress || 'N/A';
        if (order.landmark) {
            if (fullAddress) {
                addressHTML = `${fullAddress}<br><small style="color: #6b7280;">${order.landmark}</small>`;
            } else {
                addressHTML = `<small style="color: #6b7280;">${order.landmark}</small>`;
            }
        }

        const row = document.createElement('tr');
        row.dataset.orderId = order.orderId;
        row.innerHTML = `
            <td>${formatDate(order.orderDate)}</td>
            <td class="address-cell">${addressHTML}</td>
            <td>${order.city || 'N/A'}</td>
            <td>${order.pincode || 'N/A'}</td>
            <td>${coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Invalid'}</td>
        `;

        // Add hover event listeners
        row.addEventListener('mouseenter', function() {
            highlightMarker(order.orderId, true);
            row.classList.add('row-highlight');
        });

        row.addEventListener('mouseleave', function() {
            highlightMarker(order.orderId, false);
            row.classList.remove('row-highlight');
        });

        tbody.appendChild(row);
    });
}

// Highlight marker on map
function highlightMarker(orderId, highlight) {
    const marker = orderMarkers[orderId];
    if (!marker) return;

    if (highlight) {
        // Change to highlighted icon and bring to front
        marker.setIcon(orderIconHighlight);
        marker.setZIndexOffset(1000);

        // Open popup if not already open
        if (!marker.isPopupOpen()) {
            marker.openPopup();
        }
    } else {
        // Change back to normal icon
        marker.setIcon(orderIcon);
        marker.setZIndexOffset(100);

        // Close popup
        marker.closePopup();
    }
}

// Search functionality
function handleSearch(searchTerm) {
    applyFiltersAndSort();
}

// Drawer functions
function openDrawer() {
    const drawer = document.getElementById('sideDrawer');
    drawer.classList.add('open');
    document.getElementById('drawerOverlay').classList.add('active');
}

function closeDrawer() {
    document.getElementById('sideDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('active');
}

// Drawer resize functionality
let isResizing = false;
let startX = 0;
let startWidth = 0;

function initDrawerResize() {
    const drawer = document.getElementById('sideDrawer');
    const resizeHandle = document.getElementById('resizeHandle');

    // Load saved width from localStorage
    const savedWidth = localStorage.getItem('drawerWidth');
    if (savedWidth) {
        drawer.style.width = savedWidth + 'px';
        // Don't set left position here - let CSS handle it
        // Only update the negative left value for when drawer is closed
        const currentLeft = drawer.style.left || '-400px';
        if (!drawer.classList.contains('open')) {
            drawer.style.left = '-' + savedWidth + 'px';
        }
    }

    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = drawer.offsetWidth;

        drawer.classList.add('resizing');
        resizeHandle.classList.add('active');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;

        const width = startWidth + (e.clientX - startX);
        const minWidth = 300;
        const maxWidth = 800;

        if (width >= minWidth && width <= maxWidth) {
            drawer.style.width = width + 'px';

            // Update left position when drawer is closed
            if (!drawer.classList.contains('open')) {
                drawer.style.left = '-' + width + 'px';
            }
        }
    });

    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            drawer.classList.remove('resizing');
            resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            // Save width to localStorage
            localStorage.setItem('drawerWidth', drawer.offsetWidth);
        }
    });
}

// Toggle sort direction
function toggleSortDirection() {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    const btn = document.getElementById('sortDirection');
    if (sortDirection === 'asc') {
        btn.classList.add('asc');
    } else {
        btn.classList.remove('asc');
    }
    applyFiltersAndSort();
}

// Filter and sort functionality
function applyFiltersAndSort() {
    let filtered = [...aggregatedUserData];

    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(user => {
            return user.userId.toString().toLowerCase().includes(searchTerm);
        });
    }

    // Apply city filter
    const cityFilter = document.getElementById('cityFilter').value;
    if (cityFilter) {
        filtered = filtered.filter(user => user.city === cityFilter);
    }

    // Apply order count filter
    const orderCountFilter = document.getElementById('orderCountFilter').value;
    if (orderCountFilter) {
        const minCount = parseInt(orderCountFilter);
        filtered = filtered.filter(user => user.orderCount >= minCount);
    }

    // Apply sorting
    const sortBy = document.getElementById('sortBy').value;
    filtered.sort((a, b) => {
        let comparison = 0;

        if (sortBy === 'userId') {
            comparison = a.userId.toString().localeCompare(b.userId.toString());
        } else if (sortBy === 'orderCount') {
            comparison = a.orderCount - b.orderCount;
        } else if (sortBy === 'lastOrderDate') {
            comparison = (a.lastOrderDate || '').localeCompare(b.lastOrderDate || '');
        } else if (sortBy === 'city') {
            comparison = (a.city || '').localeCompare(b.city || '');
        }

        // Apply sort direction
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    populateOrdersTable(filtered);
}

// Populate city filter dropdown
function populateCityFilter() {
    const cities = [...new Set(ordersData.map(order => order.city).filter(Boolean))].sort();
    const cityFilter = document.getElementById('cityFilter');

    // Clear existing options except "All Cities"
    cityFilter.innerHTML = '<option value="">All Cities</option>';

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
}

// Event listeners
document.getElementById('ordersFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        parseFile(file, loadOrdersData);
    }
});

document.getElementById('darkstoresFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        parseFile(file, loadDarkstoresData);
    }
});

document.getElementById('searchInput').addEventListener('input', function(e) {
    handleSearch(e.target.value);
});

document.getElementById('cityFilter').addEventListener('change', function(e) {
    applyFiltersAndSort();
});

document.getElementById('orderCountFilter').addEventListener('change', function(e) {
    applyFiltersAndSort();
});

document.getElementById('sortBy').addEventListener('change', function(e) {
    applyFiltersAndSort();
});

document.getElementById('sortDirection').addEventListener('click', toggleSortDirection);

document.getElementById('mapStyle').addEventListener('change', function(e) {
    changeMapStyle(e.target.value);
});

// Map search listeners
document.getElementById('searchBtn').addEventListener('click', searchLocation);
document.getElementById('mapSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchLocation();
    }
});

// Drawer toggle listeners
document.getElementById('openDrawer').addEventListener('click', openDrawer);
document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeDrawer);

// Initialize map and drawer resize on page load
window.addEventListener('load', function() {
    initMap('osm'); // Start with OpenStreetMap
    initDrawerResize(); // Initialize drawer resize functionality
});
