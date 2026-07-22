package com.netzone.crm.phonestate

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.provider.Settings
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * CallSyncService — background HTTP sync.
 *
 * Posts a call record to the API server after every call ends.
 * Runs entirely outside the React Native bridge so it works even when:
 *   - The app is in the background
 *   - The RN bridge is not initialised
 *
 * Auth token + server URL are read from SharedPreferences (written by
 * PhoneStateModule.cacheAuthToken() after login).
 *
 * Customer lookup is done against the cached customer JSON
 * (written by PhoneStateModule.cacheCustomerData()).
 *
 * Errors are silently swallowed — the call will be re-synced when the
 * app reopens via the JS offline queue.
 */
class CallSyncService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val phone    = intent?.getStringExtra("phone_number") ?: ""
        val duration = intent?.getIntExtra("duration", 0)     ?: 0
        val callType = intent?.getStringExtra("call_type")    ?: "OUTGOING"

        Thread {
            runCatching { doSync(phone, duration, callType) }
            stopSelf(startId)
        }.start()

        return START_NOT_STICKY
    }

    // ── Sync logic ─────────────────────────────────────────────────────────────

    private fun doSync(phone: String, duration: Int, callType: String) {
        val prefs   = getSharedPreferences(PhoneStateModule.PREFS, MODE_PRIVATE)
        val token   = prefs.getString(PhoneStateModule.KEY_TOKEN,    "").orEmpty()
        val baseUrl = prefs.getString(PhoneStateModule.KEY_BASE_URL, "").orEmpty()

        // Nothing to sync without credentials
        if (token.isEmpty() || baseUrl.isEmpty()) return

        val customersJson = prefs.getString(PhoneStateModule.KEY_CUSTOMERS, "[]").orEmpty()
        val (custId, custName) = resolveCustomer(customersJson, phone)

        // Device identifier — stable across app reinstalls
        val deviceId = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: android.os.Build.MODEL

        val body = JSONObject().apply {
            put("type",             mapCallType(callType))
            put("phone_number",     phone)
            put("customer_mobile",  phone)
            put("duration",         formatDuration(duration))
            put("duration_seconds", duration)
            put("device_id",        deviceId)
            if (custId.isNotEmpty())   put("customer_id",   custId)
            if (custName.isNotEmpty()) put("customer_name", custName)
        }

        post("${baseUrl.trimEnd('/')}/api/calls", body.toString(), token)
    }

    // ── HTTP helper ────────────────────────────────────────────────────────────

    private fun post(urlStr: String, json: String, token: String) {
        val conn = URL(urlStr).openConnection() as HttpURLConnection
        try {
            conn.requestMethod = "POST"
            conn.doOutput      = true
            conn.connectTimeout = 10_000
            conn.readTimeout    = 10_000
            conn.setRequestProperty("Content-Type",  "application/json; charset=utf-8")
            conn.setRequestProperty("Authorization", "Bearer $token")
            conn.setRequestProperty("Accept",        "application/json")

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { w ->
                w.write(json)
                w.flush()
            }
            // Trigger the request and read the response code (discarded)
            conn.responseCode
        } finally {
            conn.disconnect()
        }
    }

    // ── Customer lookup ────────────────────────────────────────────────────────

    /**
     * Searches the cached customer JSON array for a matching mobile or alternate number.
     * Phone number comparison uses suffix matching to handle country-code variations.
     */
    private fun resolveCustomer(json: String, phone: String): Pair<String, String> {
        return runCatching {
            val clean = phone.replace(Regex("[^0-9+]"), "")
            if (clean.isEmpty()) return Pair("", "")

            val arr = JSONArray(json)
            for (i in 0 until arr.length()) {
                val c      = arr.getJSONObject(i)
                val mobile = c.optString("mobile", "").replace(Regex("[^0-9+]"), "")
                val alt    = c.optString("alternate_number", "").replace(Regex("[^0-9+]"), "")

                val mobileMatch = mobile.isNotEmpty() &&
                        (clean.endsWith(mobile) || mobile.endsWith(clean))
                val altMatch = alt.isNotEmpty() &&
                        (clean.endsWith(alt) || alt.endsWith(clean))

                if (mobileMatch || altMatch) {
                    return Pair(c.optString("id", ""), c.optString("name", ""))
                }
            }
            Pair("", "")
        }.getOrDefault(Pair("", ""))
    }

    // ── Formatting ─────────────────────────────────────────────────────────────

    private fun mapCallType(raw: String): String = when (raw.uppercase()) {
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
