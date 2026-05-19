import React, {useState} from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView} from 'react-native';
import MapView, {Marker, Circle, PROVIDER_GOOGLE, MapPressEvent} from 'react-native-maps';

interface Props {
  visible: boolean;
  initialLat?: number;
  initialLng?: number;
  onConfirm: (lat: number, lng: number) => void;
  onCancel: () => void;
}

const DARK_MAP_STYLE = [
  {elementType: 'geometry', stylers: [{color: '#212121'}]},
  {elementType: 'labels.icon', stylers: [{visibility: 'off'}]},
  {elementType: 'labels.text.fill', stylers: [{color: '#757575'}]},
  {elementType: 'labels.text.stroke', stylers: [{color: '#212121'}]},
  {featureType: 'road', elementType: 'geometry', stylers: [{color: '#2c2c2c'}]},
  {featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{color: '#757575'}]},
  {featureType: 'water', elementType: 'geometry', stylers: [{color: '#000000'}]},
  {featureType: 'poi', stylers: [{visibility: 'off'}]},
];

export default function MapPicker({visible, initialLat, initialLng, onConfirm, onCancel}: Props) {
  const hasInitial = !!(initialLat && initialLng && !(initialLat === 0 && initialLng === 0));
  const defaultLat = hasInitial ? initialLat! : 40.7128;
  const defaultLng = hasInitial ? initialLng! : -74.006;

  const [selected, setSelected] = useState<{latitude: number; longitude: number} | null>(
    hasInitial ? {latitude: defaultLat, longitude: defaultLng} : null,
  );

  function handleMapPress(e: MapPressEvent) {
    setSelected(e.nativeEvent.coordinate);
  }

  function handleConfirm() {
    if (selected) {
      onConfirm(selected.latitude, selected.longitude);
    } else if (hasInitial) {
      onConfirm(defaultLat, defaultLng);
    }
  }

  const markerCoord = selected ?? (hasInitial ? {latitude: defaultLat, longitude: defaultLng} : null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Set Location</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn} disabled={!markerCoord}>
            <Text style={[styles.confirmText, !markerCoord && {opacity: 0.4}]}>Confirm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapWrapper}>
          {visible && (
            <MapView
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_GOOGLE}
              customMapStyle={DARK_MAP_STYLE}
              initialRegion={{
                latitude: defaultLat,
                longitude: defaultLng,
                latitudeDelta: hasInitial ? 0.01 : 0.05,
                longitudeDelta: hasInitial ? 0.01 : 0.05,
              }}
              onPress={handleMapPress}>
              {markerCoord && (
                <>
                  <Marker coordinate={markerCoord} pinColor="#4f46e5" />
                  <Circle
                    center={markerCoord}
                    radius={200}
                    strokeColor="#4f46e5"
                    fillColor="rgba(79,70,229,0.15)"
                    strokeWidth={2}
                  />
                </>
              )}
            </MapView>
          )}

          {!markerCoord && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>Tap anywhere to place a pin</Text>
            </View>
          )}
        </View>
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
  headerBtn: {padding: 4, minWidth: 60},
  title: {fontSize: 16, fontWeight: '700', color: '#fff'},
  cancelText: {fontSize: 15, color: '#888'},
  confirmText: {fontSize: 15, color: '#4f46e5', fontWeight: '700', textAlign: 'right'},
  mapWrapper: {flex: 1},
  hint: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    backgroundColor: 'rgba(15,15,15,0.85)',
    color: '#fff',
    fontSize: 13,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
