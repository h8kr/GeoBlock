package com.geoblock

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import org.json.JSONArray

class GeofenceTransitionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return

        val transition = event.geofenceTransition
        val ruleIds = event.triggeringGeofences?.map { it.requestId }?.toSet() ?: return

        val prefs = context.getSharedPreferences("GeoBlockPrefs", Context.MODE_PRIVATE)
        val rulesJson = prefs.getString("location_rules", "[]") ?: "[]"
        val rulePackages = getPackagesForRules(rulesJson, ruleIds)

        val currentActive = parsePackageSet(prefs.getString("geofence_blocked_apps", "[]") ?: "[]").toMutableSet()

        when (transition) {
            Geofence.GEOFENCE_TRANSITION_ENTER -> currentActive.addAll(rulePackages)
            Geofence.GEOFENCE_TRANSITION_EXIT  -> currentActive.removeAll(rulePackages)
        }

        prefs.edit().putString("geofence_blocked_apps", packagesToJson(currentActive)).apply()
    }

    private fun getPackagesForRules(rulesJson: String, ruleIds: Set<String>): Set<String> {
        val packages = mutableSetOf<String>()
        try {
            val arr = JSONArray(rulesJson)
            for (i in 0 until arr.length()) {
                val rule = arr.getJSONObject(i)
                if (rule.getString("id") in ruleIds) {
                    val pkgs = rule.optJSONArray("blockedPackages") ?: continue
                    for (j in 0 until pkgs.length()) packages.add(pkgs.getString(j))
                }
            }
        } catch (_: Exception) {}
        return packages
    }

    private fun parsePackageSet(json: String): Set<String> {
        val result = mutableSetOf<String>()
        try {
            val arr = JSONArray(json)
            for (i in 0 until arr.length()) result.add(arr.getString(i))
        } catch (_: Exception) {}
        return result
    }

    private fun packagesToJson(packages: Set<String>): String {
        val arr = JSONArray()
        packages.forEach { arr.put(it) }
        return arr.toString()
    }
}
