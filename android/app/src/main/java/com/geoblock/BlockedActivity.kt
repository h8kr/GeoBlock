package com.geoblock

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class BlockedActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val packageName = intent.getStringExtra("package_name") ?: ""
        val appName = try {
            packageManager.getApplicationLabel(
                packageManager.getApplicationInfo(packageName, 0)
            ).toString()
        } catch (e: Exception) {
            "That app"
        }

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0f0f0f"))
            setPadding(80, 80, 80, 80)
        }

        root.addView(TextView(this).apply {
            text = "🚫"
            textSize = 64f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 48)
        })

        root.addView(TextView(this).apply {
            text = "$appName is blocked"
            textSize = 22f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
            setPadding(0, 0, 0, 20)
        })

        root.addView(TextView(this).apply {
            text = "Go be productive.\nYou've got things to do."
            textSize = 15f
            setTextColor(Color.parseColor("#888888"))
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.5f)
            setPadding(0, 0, 0, 72)
        })

        root.addView(Button(this).apply {
            text = "Go Home"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#4f46e5"))
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(80, 0, 80, 0)
            setOnClickListener { goHome() }
        })

        setContentView(root)
    }

    @Suppress("OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        goHome()
    }

    private fun goHome() {
        startActivity(Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        })
        finish()
    }
}
