package com.geoblock

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import org.json.JSONArray
import java.util.Calendar

class GeoBlockAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return
        if (packageName == applicationContext.packageName) return

        val prefs = getSharedPreferences("GeoBlockPrefs", MODE_PRIVATE)
        val blockedJson = prefs.getString("blocked_apps", "") ?: ""
        val geofenceJson = prefs.getString("geofence_blocked_apps", "") ?: ""

        val directlyBlocked = blockedJson.contains("\"$packageName\"")
        val geofenceBlocked = geofenceJson.contains("\"$packageName\"") && isWithinSchedule(packageName, prefs)

        if (directlyBlocked || geofenceBlocked) {
            startActivity(
                Intent(this, BlockedActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("package_name", packageName)
                }
            )
        }
    }

    private fun isWithinSchedule(packageName: String, prefs: android.content.SharedPreferences): Boolean {
        val rulesJson = prefs.getString("location_rules", "[]") ?: "[]"
        return try {
            val arr = JSONArray(rulesJson)
            for (i in 0 until arr.length()) {
                val rule = arr.getJSONObject(i)
                val pkgs = rule.optJSONArray("blockedPackages") ?: continue
                var found = false
                for (j in 0 until pkgs.length()) {
                    if (pkgs.getString(j) == packageName) { found = true; break }
                }
                if (!found) continue

                val schedule = rule.optJSONObject("schedule") ?: return true // no schedule = always block

                val cal = Calendar.getInstance()
                val currentDay = cal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun
                val currentMins = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

                val days = schedule.getJSONArray("days")
                val daySet = mutableSetOf<Int>()
                for (d in 0 until days.length()) daySet.add(days.getInt(d))
                if (currentDay !in daySet) return false

                val start = schedule.getString("startTime").split(":")
                val end = schedule.getString("endTime").split(":")
                val startMins = start[0].toInt() * 60 + start[1].toInt()
                val endMins = end[0].toInt() * 60 + end[1].toInt()

                return currentMins in startMins..endMins
            }
            true
        } catch (_: Exception) {
            true
        }
    }

    override fun onInterrupt() {}
}
