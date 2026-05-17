import React, {useRef} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {WebView} from 'react-native-webview';

interface Props {
  visible: boolean;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

export default function MapPicker({visible, initialLat, initialLng, onConfirm, onCancel}: Props) {
  const selected = useRef<{lat: number; lng: number} | null>(null);

  const hasInitial = initialLat && initialLng && !(initialLat === 0 && initialLng === 0);
  const startLat = hasInitial ? initialLat : 40.7128;
  const startLng = hasInitial ? initialLng : -74.006;
  const zoom = hasInitial ? 15 : 12;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f0f; }
    #map { width: 100vw; height: 100vh; }
    #hint {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(15,15,15,0.85); color: #fff; padding: 8px 18px;
      border-radius: 20px; font-size: 13px; font-family: sans-serif;
      pointer-events: none; white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="hint">Tap anywhere to place a pin</div>
  <script>
    var map = L.map('map').setView([${startLat}, ${startLng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var marker = ${hasInitial
      ? `L.marker([${startLat}, ${startLng}]).addTo(map);`
      : 'null;'
    }

    map.on('click', function(e) {
      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }
      document.getElementById('hint').textContent = e.latlng.lat.toFixed(5) + ', ' + e.latlng.lng.toFixed(5);
      window.ReactNativeWebView.postMessage(JSON.stringify({lat: e.latlng.lat, lng: e.latlng.lng}));
    });
  </script>
</body>
</html>`;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Set Location</Text>
          <TouchableOpacity
            onPress={() => {
              if (selected.current) {
                onConfirm(selected.current.lat, selected.current.lng);
              } else if (hasInitial) {
                onConfirm(startLat!, startLng!);
              }
            }}
            style={styles.headerBtn}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{html}}
          style={styles.map}
          onMessage={e => {
            const data = JSON.parse(e.nativeEvent.data);
            selected.current = {lat: data.lat, lng: data.lng};
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0f0f0f'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1c1c1c',
  },
  headerBtn: {padding: 4},
  title: {fontSize: 16, fontWeight: '700', color: '#fff'},
  cancelText: {fontSize: 15, color: '#888'},
  confirmText: {fontSize: 15, color: '#4f46e5', fontWeight: '700'},
  map: {flex: 1},
});
