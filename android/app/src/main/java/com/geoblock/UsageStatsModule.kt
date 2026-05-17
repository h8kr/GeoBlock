package com.geoblock

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.Calendar

class UsageStatsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "UsageStatsModule"

    @ReactMethod
    fun hasUsagePermission(promise: Promise) {
        val appOps = reactContext.getSystemService(AppOpsManager::class.java)
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            android.os.Process.myUid(),
            reactContext.packageName,
        )
        promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    @ReactMethod
    fun openUsageSettings() {
        reactContext.startActivity(
            Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
        )
    }

    @ReactMethod
    fun getUsageStats(period: String, promise: Promise) {
        try {
            val usm = reactContext.getSystemService(UsageStatsManager::class.java)
            val now = System.currentTimeMillis()
            val startTime = if (period == "week") {
                Calendar.getInstance().apply {
                    set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0)
                }.timeInMillis
            } else {
                Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0)
                }.timeInMillis
            }

            val pm = reactContext.packageManager
            val result = Arguments.createArray()

            usm.queryUsageStats(UsageStatsManager.INTERVAL_BEST, startTime, now)
                .filter { it.totalTimeInForeground > 60_000 }
                .sortedByDescending { it.totalTimeInForeground }
                .take(20)
                .forEach { stat ->
                    try {
                        val info = pm.getApplicationInfo(stat.packageName, 0)
                        if (info.flags and ApplicationInfo.FLAG_SYSTEM != 0) return@forEach
                        result.pushMap(Arguments.createMap().apply {
                            putString("packageName", stat.packageName)
                            putString("appName", pm.getApplicationLabel(info).toString())
                            putInt("minutes", (stat.totalTimeInForeground / 60_000).toInt())
                        })
                    } catch (_: Exception) {}
                }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
