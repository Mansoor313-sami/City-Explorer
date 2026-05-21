import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Animated,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Circle, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

// ─── Constants ────────────────────────────────────────────────────────────────
const GEOFENCE_RADIUS = 300;

const POINTS_OF_INTEREST = [
  {
    id: 1,
    title: 'City Hospital',
    description: 'Emergency & General Care',
    type: 'hospital',
    color: '#FF4757',
    icon: 'medkit',
    latOffset: 0.004,
    lngOffset: 0.003,
  },
  {
    id: 2,
    title: 'Central Park',
    description: 'Green space & recreation',
    type: 'park',
    color: '#2ED573',
    icon: 'leaf',
    latOffset: -0.003,
    lngOffset: 0.005,
  },
  {
    id: 3,
    title: 'Grand Mosque',
    description: 'Historic place of worship',
    type: 'mosque',
    color: '#1E90FF',
    icon: 'moon',
    latOffset: 0.005,
    lngOffset: -0.004,
  },
  {
    id: 4,
    title: 'University Campus',
    description: 'Main academic block',
    type: 'university',
    color: '#FFA502',
    icon: 'school',
    latOffset: -0.005,
    lngOffset: -0.003,
  },
  {
    id: 5,
    title: 'Bus Terminal',
    description: 'Inter-city transport hub',
    type: 'transport',
    color: '#A29BFE',
    icon: 'bus',
    latOffset: 0.001,
    lngOffset: -0.006,
  },
  {
    id: 6,
    title: 'Food Street',
    description: 'Local cuisine & dining',
    type: 'food',
    color: '#FF6B81',
    icon: 'restaurant',
    latOffset: -0.002,
    lngOffset: 0.007,
  },
];

// ─── Distance helper ──────────────────────────────────────────────────────────
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Marker Pin Component ─────────────────────────────────────────────────────
function MarkerPin({ color, icon }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2.5,
          borderColor: '#fff',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}
      >
        <Ionicons name={icon} size={17} color="#fff" />
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 10,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [nearbyAlerts, setNearbyAlerts] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [markers, setMarkers] = useState([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.7, duration: 950, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 950, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Slide panel animation
  useEffect(() => {
    if (selectedPlace) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 250, useNativeDriver: true }).start();
    }
  }, [selectedPlace]);

  // Get location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please enable it in settings.');
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
      setLoading(false);

      const built = POINTS_OF_INTEREST.map((p) => ({
        ...p,
        latitude: loc.coords.latitude + p.latOffset,
        longitude: loc.coords.longitude + p.lngOffset,
      }));
      setMarkers(built);
      checkGeofences(loc.coords, built);
    })();
  }, []);

  function checkGeofences(coords, pts) {
    const alerts = pts.filter(
      (p) => getDistance(coords.latitude, coords.longitude, p.latitude, p.longitude) <= GEOFENCE_RADIUS * 4
    );
    setNearbyAlerts(alerts);
    if (alerts.length > 0) {
      Alert.alert(
        '📍 Nearby Places Detected',
        `You are close to:\n${alerts.map((a) => `• ${a.title}`).join('\n')}`,
        [{ text: 'Got it!' }]
      );
    }
  }

  function centerMap() {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        800
      );
    }
  }

  function toggleMapType() {
    setMapType((t) => (t === 'standard' ? 'satellite' : t === 'satellite' ? 'hybrid' : 'standard'));
  }

  // ── Search logic using Nominatim (OpenStreetMap) ──
  async function handleSearch(query) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      const res = await fetch(url, { headers: { 'User-Agent': 'CityExplorerApp/1.0' } });
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      setSearchResults([]);
    }
  }

  function selectSearchResult(item) {
    Keyboard.dismiss();
    setSearchQuery(item.display_name.split(',')[0]);
    setSearchResults([]);
    setSearchFocused(false);

    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    const marker = {
      id: 'search',
      title: item.display_name.split(',')[0],
      description: item.display_name,
      latitude: lat,
      longitude: lng,
      color: '#FFD700',
      icon: 'search',
      type: 'search result',
    };
    setSearchMarker(marker);
    setSelectedPlace(marker);

    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      900
    );
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMarker(null);
    setSearchFocused(false);
    setSelectedPlace(null);
    Keyboard.dismiss();
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <Ionicons name="navigate-circle" size={72} color="#1E90FF" />
        <Text style={s.loadingTitle}>City Explorer</Text>
        <Text style={s.loadingSub}>Fetching your location...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={s.loadingScreen}>
        <Ionicons name="warning" size={72} color="#FF4757" />
        <Text style={[s.loadingTitle, { color: '#FF4757' }]}>Permission Denied</Text>
        <Text style={s.loadingSub}>{errorMsg}</Text>
      </View>
    );
  }

  const region = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const mapTypeIcon = mapType === 'standard' ? 'map' : mapType === 'satellite' ? 'earth' : 'globe';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🗺 City Explorer</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {location.coords.latitude.toFixed(5)}°N {'  '}
            {location.coords.longitude.toFixed(5)}°E
          </Text>
        </View>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveTxt}>LIVE</Text>
        </View>
      </View>

      {/* ── Search Bar ── */}
      <View style={s.searchContainer}>
        <View style={s.searchBar}>
          <Ionicons name="search" size={18} color={searchFocused ? '#1E90FF' : '#5577AA'} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search any place worldwide..."
            placeholderTextColor="#4466AA"
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setSearchFocused(true)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={s.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#5577AA" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results dropdown */}
        {searchFocused && searchResults.length > 0 && (
          <View style={s.dropdown}>
            {searchResults.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.dropdownItem, idx < searchResults.length - 1 && s.dropdownDivider]}
                onPress={() => selectSearchResult(item)}
              >
                <Ionicons name="location" size={14} color="#A29BFE" style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.dropdownMain} numberOfLines={1}>
                    {item.display_name.split(',')[0]}
                  </Text>
                  <Text style={s.dropdownSub} numberOfLines={1}>
                    {item.display_name.split(',').slice(1, 3).join(',')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={region}
        mapType={mapType}
        showsCompass
        showsScale
        showsMyLocationButton={false}
        onPress={() => {
          setShowLegend(false);
          setSearchFocused(false);
          Keyboard.dismiss();
        }}
      >
        {/* Geofence around user */}
        <Circle
          center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
          radius={GEOFENCE_RADIUS}
          strokeColor="rgba(30,144,255,0.55)"
          fillColor="rgba(30,144,255,0.1)"
          strokeWidth={2}
        />

        {/* User location marker */}
        <Marker
          coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={s.userMarkerWrap}>
            <Animated.View style={[s.userPulse, { transform: [{ scale: pulseAnim }] }]} />
            <View style={s.userCore}>
              <Ionicons name="person" size={14} color="#fff" />
            </View>
          </View>
          <Callout>
            <View style={s.callout}>
              <Ionicons name="person-circle" size={24} color="#1E90FF" />
              <Text style={s.calloutTitle}>You are here</Text>
              <Text style={s.calloutDesc}>
                Accuracy: ±{location.coords.accuracy?.toFixed(0) ?? '?'} m
              </Text>
            </View>
          </Callout>
        </Marker>

        {/* POI Markers */}
        {markers.map((m) => {
          const dist = getDistance(
            location.coords.latitude,
            location.coords.longitude,
            m.latitude,
            m.longitude
          );
          const inFence = dist <= GEOFENCE_RADIUS * 4;
          return (
            <React.Fragment key={m.id}>
              <Circle
                center={{ latitude: m.latitude, longitude: m.longitude }}
                radius={90}
                strokeColor={m.color + '99'}
                fillColor={m.color + '20'}
                strokeWidth={1.5}
              />
              <Marker
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                onPress={() => { setSelectedPlace(m); setShowLegend(false); }}
              >
                <MarkerPin color={m.color} icon={m.icon} />
                <Callout onPress={() => setSelectedPlace(m)}>
                  <View style={s.callout}>
                    <Ionicons name={m.icon} size={20} color={m.color} />
                    <Text style={s.calloutTitle}>{m.title}</Text>
                    <Text style={s.calloutDesc}>{m.description}</Text>
                    <Text style={[s.calloutDist, { color: inFence ? '#2ED573' : '#999' }]}>
                      {inFence ? '🟢 Within zone' : `${(dist / 1000).toFixed(2)} km away`}
                    </Text>
                  </View>
                </Callout>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Search result marker */}
        {searchMarker && (
          <Marker
            coordinate={{ latitude: searchMarker.latitude, longitude: searchMarker.longitude }}
            onPress={() => setSelectedPlace(searchMarker)}
          >
            <MarkerPin color="#FFD700" icon="search" />
            <Callout>
              <View style={s.callout}>
                <Ionicons name="search" size={20} color="#FFD700" />
                <Text style={s.calloutTitle}>{searchMarker.title}</Text>
                <Text style={s.calloutDesc} numberOfLines={2}>{searchMarker.description}</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Polyline to selected place */}
        {selectedPlace && (
          <Polyline
            coordinates={[
              { latitude: location.coords.latitude, longitude: location.coords.longitude },
              { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude },
            ]}
            strokeColor={selectedPlace.color}
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      {/* ── Floating Controls (right side) ── */}
      <View style={s.controls}>
        <TouchableOpacity style={s.ctrlBtn} onPress={centerMap}>
          <Ionicons name="locate" size={20} color="#1E90FF" />
        </TouchableOpacity>
        <TouchableOpacity style={s.ctrlBtn} onPress={toggleMapType}>
          <Ionicons name={mapTypeIcon} size={20} color="#A29BFE" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ctrlBtn, showLegend && { borderColor: '#FFA502' }]}
          onPress={() => setShowLegend((v) => !v)}
        >
          <Ionicons name="list" size={20} color="#FFA502" />
        </TouchableOpacity>
      </View>

      {/* ── Map Type Badge (left side) ── */}
      <View style={s.mapTypeBadge}>
        <Text style={s.mapTypeTxt}>{mapType.toUpperCase()}</Text>
      </View>

      {/* ── Geofence Alert Strip ── */}
      {nearbyAlerts.length > 0 && !selectedPlace && (
        <View style={s.alertStrip}>
          <Ionicons name="radio" size={13} color="#2ED573" />
          <Text style={s.alertTxt} numberOfLines={1}>
            {nearbyAlerts.length} place{nearbyAlerts.length > 1 ? 's' : ''} nearby:{' '}
            {nearbyAlerts.map((a) => a.title).join(' · ')}
          </Text>
        </View>
      )}

      {/* ── Legend Panel ── */}
      {showLegend && (
        <View style={s.legend}>
          <Text style={s.legendHeader}>Map Legend</Text>
          {POINTS_OF_INTEREST.map((p) => (
            <View key={p.id} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: p.color }]}>
                <Ionicons name={p.icon} size={10} color="#fff" />
              </View>
              <Text style={s.legendTxt}>{p.title}</Text>
            </View>
          ))}
          <View style={[s.legendRow, { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A2E4A' }]}>
            <View style={[s.legendDot, { backgroundColor: '#1E90FF' }]}>
              <Ionicons name="person" size={10} color="#fff" />
            </View>
            <Text style={s.legendTxt}>Your Location</Text>
          </View>
          <View style={s.legendRow}>
            <View style={[s.legendDot, { backgroundColor: '#FFD700' }]}>
              <Ionicons name="search" size={10} color="#fff" />
            </View>
            <Text style={s.legendTxt}>Search Result</Text>
          </View>
        </View>
      )}

      {/* ── Detail Panel ── */}
      <Animated.View style={[s.detailPanel, { transform: [{ translateY: slideAnim }] }]}>
        {selectedPlace && (
          <>
            {/* Handle bar */}
            <View style={s.panelHandle} />

            <View style={s.detailHeader}>
              <View style={[s.detailIconBox, { backgroundColor: selectedPlace.color }]}>
                <Ionicons name={selectedPlace.icon} size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.detailTitle} numberOfLines={1}>{selectedPlace.title}</Text>
                <Text style={s.detailType}>{selectedPlace.type?.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="#8899BB" />
              </TouchableOpacity>
            </View>

            <Text style={s.detailDesc} numberOfLines={2}>{selectedPlace.description}</Text>

            {/* Stats row */}
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Ionicons name="navigate-outline" size={18} color={selectedPlace.color} />
                <Text style={s.statVal}>
                  {selectedPlace.id === 'search'
                    ? '–'
                    : `${(getDistance(location.coords.latitude, location.coords.longitude, selectedPlace.latitude, selectedPlace.longitude) / 1000).toFixed(2)} km`}
                </Text>
                <Text style={s.statLabel}>Distance</Text>
              </View>

              <View style={[s.statBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1A2E4A' }]}>
                <Ionicons name="radio-outline" size={18} color={selectedPlace.color} />
                <Text style={s.statVal}>
                  {selectedPlace.id === 'search'
                    ? 'N/A'
                    : getDistance(location.coords.latitude, location.coords.longitude, selectedPlace.latitude, selectedPlace.longitude) <= GEOFENCE_RADIUS * 4
                    ? 'Inside'
                    : 'Outside'}
                </Text>
                <Text style={s.statLabel}>Geofence</Text>
              </View>

              <View style={s.statBox}>
                <Ionicons name="location-outline" size={18} color={selectedPlace.color} />
                <Text style={s.statVal}>{selectedPlace.latitude.toFixed(3)}°</Text>
                <Text style={s.statLabel}>Latitude</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },

  // Loading
  loadingScreen: {
    flex: 1, backgroundColor: '#0A1628',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  loadingTitle: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  loadingSub: { fontSize: 14, color: '#5577AA', textAlign: 'center', paddingHorizontal: 30 },

  // Header
  header: {
    backgroundColor: '#0A1628',
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingBottom: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E4A',
  },
  headerTitle: { fontSize: 19, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  headerSub: {
    fontSize: 10,
    color: '#4466AA',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0C1F0E', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#2ED573', marginLeft: 10,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2ED573' },
  liveTxt: { color: '#2ED573', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Search
  searchContainer: {
    backgroundColor: '#0A1628',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E4A',
    zIndex: 100,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1E35',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A2E4A',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  clearBtn: { padding: 2 },
  dropdown: {
    backgroundColor: '#0F1E35',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1A2E4A',
    marginTop: 6,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E4A',
  },
  dropdownMain: { color: '#D0E0FF', fontSize: 13, fontWeight: '600' },
  dropdownSub: { color: '#5577AA', fontSize: 11, marginTop: 2 },

  // Map
  map: { flex: 1 },

  // User marker
  userMarkerWrap: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  userPulse: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(30,144,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(30,144,255,0.45)',
  },
  userCore: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#1E90FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    elevation: 8,
    shadowColor: '#1E90FF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8,
  },

  // Callout
  callout: { width: 175, padding: 10, alignItems: 'center', gap: 4 },
  calloutTitle: { fontWeight: '700', fontSize: 13, color: '#111', textAlign: 'center' },
  calloutDesc: { fontSize: 11, color: '#555', textAlign: 'center' },
  calloutDist: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Floating controls
  controls: {
    position: 'absolute',
    right: 14,
    top: '38%',
    gap: 10,
  },
  ctrlBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#0A1628',
    borderWidth: 1.5, borderColor: '#1A2E4A',
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4,
  },

  // Map type badge
  mapTypeBadge: {
    position: 'absolute',
    left: 14,
    top: '38%',
    backgroundColor: '#0A1628DD',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#1A2E4A',
  },
  mapTypeTxt: { color: '#A29BFE', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Alert strip
  alertStrip: {
    position: 'absolute',
    bottom: 20,
    left: 14, right: 14,
    backgroundColor: '#0C1F0E',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#2ED573',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    elevation: 4,
  },
  alertTxt: { color: '#2ED573', fontSize: 12, fontWeight: '600', flex: 1 },

  // Legend
  legend: {
    position: 'absolute',
    left: 14,
    top: '44%',
    backgroundColor: '#0C1827EE',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#1A2E4A',
    padding: 14,
    minWidth: 195,
    elevation: 6,
  },
  legendHeader: {
    color: '#fff', fontWeight: '800', fontSize: 12,
    marginBottom: 10, letterSpacing: 0.8,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  legendDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  legendTxt: { color: '#AABBD4', fontSize: 12, fontWeight: '500' },

  // Detail panel
  detailPanel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#0F1E35',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    borderTopWidth: 1, borderColor: '#1A2E4A',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 10,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4, shadowRadius: 10,
  },
  panelHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#1A2E4A',
    alignSelf: 'center', marginBottom: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIconBox: {
    width: 48, height: 48, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  detailTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  detailType: { fontSize: 10, color: '#4466AA', fontWeight: '700', letterSpacing: 2, marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#162032',
    alignItems: 'center', justifyContent: 'center',
  },
  detailDesc: { fontSize: 13, color: '#7799BB', lineHeight: 19, marginBottom: 14 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#162032',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#1A2E4A',
    overflow: 'hidden',
  },
  statBox: {
    flex: 1, paddingVertical: 12,
    alignItems: 'center', gap: 4,
  },
  statVal: { fontSize: 13, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: '#4466AA', fontWeight: '600', letterSpacing: 0.8 },
});