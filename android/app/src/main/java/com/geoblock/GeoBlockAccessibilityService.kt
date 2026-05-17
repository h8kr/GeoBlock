package com.geoblock

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent

class GeoBlockAccessibilityService : AccessibilityService() {

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val packageName = event.packageName?.toString() ?: return
        if (packageName == applicationContext.packageName) return

        val prefs = getSharedPreferences("GeoBlockPrefs", MODE_PRIVATE)
        val blockedJson = prefs.getString("blocked_apps", "") ?: return
        if (blockedJson.contains("\"$packageName\"")) {
            startActivity(
                Intent(this, BlockedActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("package_name", packageName)
                }
            )
        }
    }

    override fun onInterrupt() {}
}
