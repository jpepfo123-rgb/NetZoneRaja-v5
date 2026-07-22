package com.netzone.crm.overlay

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import android.provider.Settings

/**
 * AfterCallActivity — dialog-style overlay shown after every call ends.
 *
 * This is the fallback for when the React Native app is in the background.
 * When the app is in the foreground, the JS-layer AfterCallModal handles it.
 *
 * Allows the agent to:
 *   - Add a remark (text note)
 *   - Select a category (quick-tap chips)
 *   - Save → POST to /api/calls with remark
 *   - Skip → dismiss without saving
 *
 * Uses SharedPreferences for auth token + server URL (set by PhoneStateModule).
 */
class AfterCallActivity : Activity() {

    private var phone     = ""
    private var duration  = 0
    private var callType  = "OUTGOING"

    private lateinit var remarkInput: EditText
    private var selectedCategory = "Follow-up"

    private val categories = listOf(
        "New Lead", "Interested", "Follow-up",
        "Not Interested", "Customer", "Closed"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        phone    = intent.getStringExtra("phone_number") ?: ""
        duration = intent.getIntExtra("duration",  0)
        callType = intent.getStringExtra("call_type") ?: "OUTGOING"
        buildUI()
    }

    // ── UI ─────────────────────────────────────────────────────────────────────

    private fun buildUI() {
        val dp = resources.displayMetrics.density

        val scroll = ScrollView(this)
        val root   = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(
                (24 * dp).toInt(), (24 * dp).toInt(),
                (24 * dp).toInt(), (24 * dp).toInt()
            )
        }
        scroll.addView(root)

        // Title row
        val titleRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (4 * dp).toInt() }
        }
        titleRow.addView(TextView(this).apply {
            text     = "Call Ended"
            textSize = 20f
            setTextColor(Color.parseColor("#1565C0"))
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        })
        titleRow.addView(Button(this).apply {
            text = "✕"
            textSize = 14f
            setBackgroundColor(Color.TRANSPARENT)
            setTextColor(Color.parseColor("#888888"))
            setPadding(0, 0, 0, 0)
            layoutParams = LinearLayout.LayoutParams(
                (40 * dp).toInt(), (40 * dp).toInt()
            )
            setOnClickListener { finish() }
        })
        root.addView(titleRow)

        // Call summary
        val typeLabel = when (callType.uppercase()) {
            "INCOMING" -> "Incoming"
            "MISSED"   -> "Missed"
            else       -> "Outgoing"
        }
        root.addView(TextView(this).apply {
            text     = "$typeLabel · $phone · ${formatDuration(duration)}"
            textSize = 13f
            setTextColor(Color.parseColor("#666666"))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (20 * dp).toInt() }
        })

        // Category chips
        root.addView(sectionLabel("Category", dp))
        root.addView(buildCategoryRow(dp))

        // Remark input
        root.addView(sectionLabel("Remark", dp))
        remarkInput = EditText(this).apply {
            hint    = "Enter call notes…"
            textSize = 14f
            minLines = 3
            gravity  = Gravity.TOP
            setBackgroundColor(Color.parseColor("#F5F7FA"))
            setPadding(
                (12 * dp).toInt(), (10 * dp).toInt(),
                (12 * dp).toInt(), (10 * dp).toInt()
            )
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (24 * dp).toInt() }
        }
        root.addView(remarkInput)

        // Buttons
        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.END
        }
        btnRow.addView(Button(this).apply {
            text = "Skip"
            textSize = 15f
            setBackgroundColor(Color.TRANSPARENT)
            setTextColor(Color.parseColor("#888888"))
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { rightMargin = (12 * dp).toInt() }
            setOnClickListener { finish() }
        })
        btnRow.addView(Button(this).apply {
            text = "Save"
            textSize = 15f
            setBackgroundColor(Color.parseColor("#1565C0"))
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            setPadding(
                (32 * dp).toInt(), (10 * dp).toInt(),
                (32 * dp).toInt(), (10 * dp).toInt()
            )
            setOnClickListener { saveAndFinish() }
        })
        root.addView(btnRow)

        setContentView(scroll)
    }

    private fun sectionLabel(text: String, dp: Float) = TextView(this).apply {
        this.text = text
        textSize  = 13f
        setTextColor(Color.parseColor("#333333"))
        typeface  = Typeface.DEFAULT_BOLD
        layoutParams = LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin    = (8 * dp).toInt()
            bottomMargin = (8 * dp).toInt()
        }
    }

    private fun buildCategoryRow(dp: Float): HorizontalScrollView {
        val scroll = HorizontalScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = (16 * dp).toInt() }
        }
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, (4 * dp).toInt(), 0, (4 * dp).toInt())
        }
        categories.forEach { cat ->
            row.addView(Button(this).apply {
                text = cat
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { rightMargin = (8 * dp).toInt() }
                updateChipStyle(this, cat == selectedCategory, dp)
                setOnClickListener {
                    selectedCategory = cat
                    (row.parent as? HorizontalScrollView)?.let {
                        // Re-render chips
                        for (i in 0 until row.childCount) {
                            val child = row.getChildAt(i) as? Button ?: continue
                            updateChipStyle(child, child.text == cat, dp)
                        }
                    }
                }
            })
        }
        scroll.addView(row)
        return scroll
    }

    private fun updateChipStyle(btn: Button, selected: Boolean, dp: Float) {
        btn.setBackgroundColor(
            if (selected) Color.parseColor("#1565C0") else Color.parseColor("#F0F0F0")
        )
        btn.setTextColor(
            if (selected) Color.WHITE else Color.parseColor("#444444")
        )
        btn.setPadding(
            (16 * dp).toInt(), (6 * dp).toInt(),
            (16 * dp).toInt(), (6 * dp).toInt()
        )
    }

    // ── Save ───────────────────────────────────────────────────────────────────

    private fun saveAndFinish() {
        val remark = remarkInput.text.toString().trim()
        Thread {
            runCatching { postCall(remark) }
        }.start()
        finish()
    }

    private fun postCall(remark: String) {
        val prefs   = getSharedPreferences("NetZoneCRM", MODE_PRIVATE)
        val token   = prefs.getString("auth_token", "").orEmpty()
        val baseUrl = prefs.getString("base_url",   "").orEmpty()
        if (token.isEmpty() || baseUrl.isEmpty()) return

        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
            ?: android.os.Build.MODEL

        val body = JSONObject().apply {
            put("type",             mapType())
            put("phone_number",     phone)
            put("customer_mobile",  phone)
            put("duration",         formatDuration(duration))
            put("duration_seconds", duration)
            put("category",         selectedCategory)
            put("device_id",        deviceId)
            if (remark.isNotEmpty()) put("remarks", remark)
        }

        val conn = URL("${baseUrl.trimEnd('/')}/api/calls")
            .openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput      = true
            conn.connectTimeout = 10_000
            conn.readTimeout    = 10_000
            conn.setRequestProperty("Content-Type",  "application/json; charset=utf-8")
            conn.setRequestProperty("Authorization", "Bearer $token")
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { w ->
                w.write(body.toString())
                w.flush()
            }
            conn.responseCode
        } finally {
            conn.disconnect()
        }
    }

    private fun mapType() = when (callType.uppercase()) {
        "INCOMING" -> "Incoming"
        "MISSED"   -> "Missed"
        else       -> "Outgoing"
    }

    private fun formatDuration(secs: Int): String {
        val m = secs / 60
        val s = secs % 60
        return "$m:${s.toString().padStart(2, '0')}"
    }
}
