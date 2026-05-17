package com.geoblock

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class BlockingModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "BlockingModule"

    @ReactMethod
    fun setBlockedApps(packages: ReadableArray) {
        val json = buildString {
            append("[")
            for (i in 0 until packages.size()) {
                if (i > 0) append(",")
                append("\"${packages.getString(i)}\"")
            }
            append("]")
        }
        reactContext.getSharedPreferences("GeoBlockPrefs", 0)
            .edit().putString("blocked_apps", json).apply()
    }

    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        val cn = "${reactContext.packageName}/${GeoBlockAccessibilityService::class.java.name}"
        val enabled = Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )?.split(":")?.any { it.equals(cn, ignoreCase = true) } ?: false
        promise.resolve(enabled)
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        reactContext.startActivity(
            Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        )
    }
}
