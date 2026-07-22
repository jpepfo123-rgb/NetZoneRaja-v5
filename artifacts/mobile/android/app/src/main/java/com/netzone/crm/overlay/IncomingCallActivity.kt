package com.netzone.crm.overlay

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*
import org.json.JSONArray

/**
 * IncomingCallActivity — full-screen overlay shown during incoming calls.
 *
 * Displayed over the lock screen using FLAG_SHOW_WHEN_LOCKED + FLAG_TURN_SCREEN_ON.
 * Uses a pure programmatic layout (no XML resources needed).
 *
 * Shows:
 *   - Caller name (resolved from cached customer JSON in SharedPreferences)
 *   - Phone number
 *   - Customer category (if known)
 *   - "Dismiss" button
 *
 * Auto-dismisses when "com.netzone.crm.DISMISS_OVERLAY" broadcast is received
 * (sent by CallMonitorService when the call is answered or ends).
 */
class IncomingCallActivity : Activity() {

    private val dismissReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            if (intent.action == "com.netzone.crm.DISMISS_OVERLAY") {
                finish()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over lock screen and wake screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON   or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val phone = intent.getStringExtra("phone_number") ?: ""

        // Customer JSON: prefer explicit extra, fall back to SharedPreferences cache
        val customersJson = intent.getStringExtra("customer_json")
            ?: getSharedPreferences("NetZoneCRM", MODE_PRIVATE)
                .getString("customers_json", "[]")
            ?: "[]"

        val (customerName, category) = resolveCustomer(customersJson, phone)

        buildUI(phone, customerName, category)

        // Register dismiss listener
        val filter = IntentFilter("com.netzone.crm.DISMISS_OVERLAY")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(dismissReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(dismissReceiver, filter)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        runCatching { unregisterReceiver(dismissReceiver) }
    }

    // ── UI ─────────────────────────────────────────────────────────────────────

    private fun buildUI(phone: String, customerName: String, category: String) {
        val dp = resources.displayMetrics.density

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity     = Gravity.CENTER_VERTICAL or Gravity.CENTER_HORIZONTAL
            setBackgroundColor(Color.parseColor("#EE1565C0"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Phone icon placeholder (circle)
        root.addView(View(this).apply {
            setBackgroundColor(0x33FFFFFF)
            layoutParams = LinearLayout.LayoutParams(
                (72 * dp).toInt(), (72 * dp).toInt()
            ).apply {
                gravity      = Gravity.CENTER_HORIZONTAL
                bottomMargin = (20 * dp).toInt()
            }
            // round via outline
        })

        // Caller name (or phone if not in CRM)
        root.addView(TextView(this).apply {
            text      = if (customerName.isNotEmpty()) customerName else phone
            textSize  = 26f
            setTextColor(Color.WHITE)
            typeface  = Typeface.DEFAULT_BOLD
            gravity   = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (4 * dp).toInt() }
        })

        // Phone number (only if we have a name to show above)
        if (customerName.isNotEmpty()) {
            root.addView(TextView(this).apply {
                text     = phone
                textSize = 18f
                setTextColor(0xCCFFFFFF.toInt())
                gravity  = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = (8 * dp).toInt() }
            })
        }

        // Category badge
        if (category.isNotEmpty()) {
            root.addView(TextView(this).apply {
                text      = category
                textSize  = 13f
                setTextColor(0xFFFFAA00.toInt())
                gravity   = Gravity.CENTER
                setPadding(
                    (16 * dp).toInt(), (6 * dp).toInt(),
                    (16 * dp).toInt(), (6 * dp).toInt()
                )
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity      = Gravity.CENTER_HORIZONTAL
                    bottomMargin = (8 * dp).toInt()
                }
            })
        }

        // "Incoming Call" label
        root.addView(TextView(this).apply {
            text     = "Incoming Call"
            textSize = 15f
            setTextColor(0xAAFFFFFF.toInt())
            gravity  = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (36 * dp).toInt() }
        })

        // Dismiss button
        root.addView(Button(this).apply {
            text = "Dismiss"
            textSize = 16f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#CC3D5AFE"))
            setPadding(
                (40 * dp).toInt(), (14 * dp).toInt(),
                (40 * dp).toInt(), (14 * dp).toInt()
            )
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { gravity = Gravity.CENTER_HORIZONTAL }
            setOnClickListener { finish() }
        })

        setContentView(root)
    }

    // ── Customer lookup ────────────────────────────────────────────────────────

    private fun resolveCustomer(json: String, phone: String): Pair<String, String> {
        return runCatching {
            val clean = phone.replace(Regex("[^0-9+]"), "")
            val arr   = JSONArray(json)
            for (i in 0 until arr.length()) {
                val c      = arr.getJSONObject(i)
                val mobile = c.optString("mobile", "").replace(Regex("[^0-9+]"), "")
                val alt    = c.optString("alternate_number", "").replace(Regex("[^0-9+]"), "")

                val match = (mobile.isNotEmpty() && (clean.endsWith(mobile) || mobile.endsWith(clean))) ||
                            (alt.isNotEmpty() && (clean.endsWith(alt) || alt.endsWith(clean)))

                if (match) {
                    return Pair(
                        c.optString("name",     ""),
                        c.optString("category", "")
                    )
                }
            }
            Pair("", "")
        }.getOrDefault(Pair("", ""))
    }
}
