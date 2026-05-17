package com.geoblock

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.*
import com.google.android.gms.location.*
import org.json.JSONArray
import org.json.JSONObject

class GeofenceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
    private val geofencingClient = LocationServices.getGeofencingClient(reactContext)

    override fun getName() = "GeofenceModule"

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }
        fusedLocationClient.lastLocation
            .addOnSuccessListener { location ->
                if (location != null) {
                    promise.resolve(Arguments.createMap().apply {
                        putDouble("latitude", location.latitude)
                        putDouble("longitude", location.longitude)
                    })
                } else {
                    requestFreshLocation(promise)
                }
            }
            .addOnFailureListener { promise.reject("LOCATION_ERROR", it.message) }
    }

    private fun requestFreshLocation(promise: Promise) {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000)
            .setMaxUpdates(1)
            .build()
        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                fusedLocationClient.removeLocationUpdates(this)
                val loc = result.lastLocation
                if (loc != null) {
                    promise.resolve(Arguments.createMap().apply {
                        putDouble("latitude", loc.latitude)
                        putDouble("longitude", loc.longitude)
                    })
                } else {
                    promise.reject("LOCATION_UNAVAILABLE", "Could not get current location")
                }
            }
        }
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }
        fusedLocationClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
    }

    @ReactMethod
    fun updateGeofences(rulesJson: String, promise: Promise) {
        reactContext.getSharedPreferences("GeoBlockPrefs", 0)
            .edit().putString("location_rules", rulesJson).apply()

        val pendingIntent = getGeofencePendingIntent()
        geofencingClient.removeGeofences(pendingIntent).addOnCompleteListener {
            val geofences = buildGeofences(rulesJson)
            if (geofences.isEmpty()) {
                promise.resolve(null)
                return@addOnCompleteListener
            }
            if (!hasLocationPermission()) {
                promise.reject("PERMISSION_DENIED", "Location permission not granted")
                return@addOnCompleteListener
            }
            val request = GeofencingRequest.Builder()
                .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
                .addGeofences(geofences)
                .build()
            geofencingClient.addGeofences(request, pendingIntent)
                .addOnSuccessListener { promise.resolve(null) }
                .addOnFailureListener { promise.reject("GEOFENCE_ERROR", it.message) }
        }
    }

    private fun buildGeofences(rulesJson: String): List<Geofence> {
        val result = mutableListOf<Geofence>()
        try {
            val arr = JSONArray(rulesJson)
            for (i in 0 until arr.length()) {
                val rule = arr.getJSONObject(i)
                if (!rule.optBoolean("isActive", true)) continue
                val lat = rule.getDouble("latitude")
                val lng = rule.getDouble("longitude")
                if (lat == 0.0 && lng == 0.0) continue
                result.add(
                    Geofence.Builder()
                        .setRequestId(rule.getString("id"))
                        .setCircularRegion(lat, lng, rule.getDouble("radiusMeters").toFloat())
                        .setExpirationDuration(Geofence.NEVER_EXPIRE)
                        .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
                        .build()
                )
            }
        } catch (_: Exception) {}
        return result
    }

    private fun getGeofencePendingIntent(): PendingIntent {
        val intent = Intent(reactContext, GeofenceTransitionReceiver::class.java)
        return PendingIntent.getBroadcast(
            reactContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }

    private fun hasLocationPermission() =
        ActivityCompat.checkSelfPermission(reactContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
}
