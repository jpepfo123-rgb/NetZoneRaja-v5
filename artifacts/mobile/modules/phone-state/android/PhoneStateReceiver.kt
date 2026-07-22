package com.netzone.crm.phonestate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * PhoneStateReceiver — static BroadcastReceiver registered in AndroidManifest.
 *
 * Ensures CallMonitorService is running when a phone call event arrives,
 * even if the app was killed. The service then handles the full state machine.
 *
 * Listens for:
 *   - android.intent.action.PHONE_STATE       (incoming/ended)
 *   - android.intent.action.NEW_OUTGOING_CALL (outgoing number)
 */
class PhoneStateReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            "android.intent.action.PHONE_STATE",
            "android.intent.action.NEW_OUTGOING_CALL" -> ensureServiceRunning(context)
        }
    }

    private fun ensureServiceRunning(context: Context) {
        try {
            val intent = Intent(context, CallMonitorService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (_: Exception) {}
    }
}
