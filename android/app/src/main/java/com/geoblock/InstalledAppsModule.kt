package com.geoblock

import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import com.facebook.react.bridge.*

class InstalledAppsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "InstalledAppsModule"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactContext.packageManager
            val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val result = Arguments.createArray()
            apps.forEach { app ->
                if (app.flags and ApplicationInfo.FLAG_SYSTEM != 0) return@forEach
                if (app.packageName == reactContext.packageName) return@forEach
                result.pushMap(Arguments.createMap().apply {
                    putString("id", app.packageName)
                    putString("packageName", app.packageName)
                    putString("appName", pm.getApplicationLabel(app).toString())
                })
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
