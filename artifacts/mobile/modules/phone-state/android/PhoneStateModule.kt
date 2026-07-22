package com.netzone.crm.phonestate

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * PhoneStateModule — React Native bridge for call monitoring.
 *
 * Exposes to JS:
 *   startCallMonitor()             — starts CallMonitorService foreground service
 *   stopCallMonitor()              — stops it
 *   cacheAuthToken(token, url)     — stores JWT + server URL for native HTTP calls
 *   cacheCustomerData(json)        — stores customer list for offline caller lookup
 *   openDialer(number)             — opens system dialer pre-filled
 *   makeCall(number)               — direct call (needs CALL_PHONE permission)
 *
 * Emits to JS (via NativeEventEmitter):
 *   onCallStateChanged → { state, phoneNumber?, duration?, callType?, callEnded }
 */
class PhoneStateModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    companion object {
        const val PREFS          = "NetZoneCRM"
        const val KEY_TOKEN      = "auth_token"
        const val KEY_BASE_URL   = "base_url"
        const val KEY_CUSTOMERS  = "customers_json"

        // Static reference so CallMonitorService (a plain Android Service, no RN bridge)
        // can emit events to the JS layer when the app is in the foreground.
        @Volatile private var instance: PhoneStateModule? = null

        /**
         * Called by CallMonitorService to push a call state event to React Native.
         * Safe to call from any thread; no-ops silently if the bridge is not ready.
         */
        fun emitEvent(
            state:    String,
            number:   String?  = null,
            duration: Int?     = null,
            callType: String?  = null,
        ) {
            val mod = instance ?: return
            try {
                val params = Arguments.createMap().apply {
                    putString ("state",     state)
                    putBoolean("callEnded", state == "IDLE")
                    number?.let   { putString("phoneNumber", it) }
                    duration?.let { putInt   ("duration",    it) }
                    callType?.let { putString("callType",    it) }
                }
                mod.ctx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("onCallStateChanged", params)
            } catch (_: Exception) {
                // Bridge not ready / app in background — ignore
            }
        }
    }

    init {
        instance = this
    }

    override fun getName(): String = "PhoneStateModule"

    // Required so NativeEventEmitter works on both old and new architectures
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}

    // ── Call monitor lifecycle ───────────────────────────────────────────────

    @ReactMethod
    fun startCallMonitor(promise: Promise) {
        try {
            val intent = Intent(ctx, CallMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent)
            } else {
                ctx.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopCallMonitor(promise: Promise) {
        try {
            ctx.stopService(Intent(ctx, CallMonitorService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ── Credential / data caching ────────────────────────────────────────────

    @ReactMethod
    fun cacheAuthToken(token: String, baseUrl: String, promise: Promise) {
        prefs().edit()
            .putString(KEY_TOKEN,    token)
            .putString(KEY_BASE_URL, baseUrl)
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun cacheCustomerData(json: String, promise: Promise) {
        prefs().edit().putString(KEY_CUSTOMERS, json).apply()
        promise.resolve(true)
    }

    // ── Dialer ───────────────────────────────────────────────────────────────

    @ReactMethod
    fun openDialer(number: String, promise: Promise) {
        try {
            ctx.startActivity(
                Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun makeCall(number: String, promise: Promise) {
        try {
            ctx.startActivity(
                Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    // ────────────────────────────────────────────────────────────────────────

    private fun prefs(): SharedPreferences =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
