# City Explorer – React Native Map & Geofencing Application

## Assignment 4

### Submitted By
**Name:** Mansoor Ahmad  
**Registration No:** FA23-BSE-037  

---

# Project Overview

City Explorer is a React Native mobile application developed using **Expo** and **React Native Maps**.  
The application demonstrates real-time user location tracking, interactive maps, geofencing, custom markers, and location search functionality.

The project was created as part of Assignment 4 to explore advanced map components and location-based services in React Native.

---

# Features

- 📍 Real-time User Location Tracking
- 🗺 Interactive Map using React Native Maps
- 📌 Custom Markers for Places
- 🔵 Geofencing with Radius Detection
- 🔍 Worldwide Location Search
- 📏 Distance Calculation
- 📡 Nearby Places Detection
- 🛣 Route Polyline between User and Selected Place
- 🎨 Modern Animated UI
- 🌍 Multiple Map Types
  - Standard
  - Satellite
  - Hybrid

---

# Components Used

| Component | Purpose |
|---|---|
| MapView | Display map |
| Marker | Show locations |
| Circle | Geofence visualization |
| Polyline | Draw route lines |
| Callout | Show place details |
| Animated | UI animations |

---

# Technologies Used

- React Native
- Expo
- React Native Maps
- Expo Location
- OpenStreetMap API
- Ionicons

---

# Working

1. App requests location permission from user.
2. Current GPS location is fetched.
3. User location is displayed on the map.
4. Nearby places are shown using custom markers.
5. Geofencing detects nearby locations.
6. Search functionality allows worldwide place search.
7. Polyline draws route to selected place.
8. Detail panel displays place information and distance.

---

# Note

While running the project in Expo Snack Web Preview, the following warning may appear:

```bash
UIManager.hasViewManagerConfig is not a function
```

This occurs because `react-native-maps` has limited support in Snack Web mode.

However, the application works correctly on:

- Expo Go App
- Android Devices
- iOS Devices

All functionalities were successfully tested on Expo Go mobile application.

---

# Conclusion

This project successfully demonstrates the implementation of:
- Map integration
- Geolocation services
- Geofencing
- Search API integration
- Animated mobile UI

using React Native and Expo.

---
