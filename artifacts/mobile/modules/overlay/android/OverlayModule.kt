package com.netzone.crm.overlay

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

/**
 * OverlayModule — React Native bridge for SYSTEM_ALERT_WINDOW (overlay) features.
 *
 * Exposes:
 *   canDrawOverlays()                              → boolean
 *   requestOverlayPermission()                     → opens system settings
 *   showIncomingCallOverlay(phone, customerJson)   → starts IncomingCallActivity
 *   showAfterCallPopup(phone, duration, callType)  → starts AfterCallActivity
 *   dismissOverlay()                               → broadcasts dismiss intent
 */
class OverlayModule(private val ctx: ReactApplicationContext) :
    ReactContextBaseJavaModule(ctx) {

    override fun getName(): String = "OverlayModule"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(ctx)
        } else {
            true // Pre-M: permission always granted
        }
        promise.resolve(granted)
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                ctx.startActivity(
                    Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:${ctx.packageName}")
                    ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun showIncomingCallOverlay(phoneNumber: String, customerJson: String, promise: Promise) {
        try {
            ctx.startActivity(
                Intent(ctx, IncomingCallActivity::class.java).apply {
                    putExtra("phone_number",  phoneNumber)
                    putExtra("customer_json", customerJson)
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK   or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_NO_HISTORY
                    )
                }
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun showAfterCallPopup(phoneNumber: String, duration: Int, callType: String, promise: Promise) {
        try {
            ctx.startActivity(
                Intent(ctx, AfterCallActivity::class.java).apply {
                    putExtra("phone_number", phoneNumber)
                    putExtra("duration",     duration)
                    putExtra("call_type",    callType)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun dismissOverlay(promise: Promise) {
        try {
            ctx.sendBroadcast(Intent("com.netzone.crm.DISMISS_OVERLAY"))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
