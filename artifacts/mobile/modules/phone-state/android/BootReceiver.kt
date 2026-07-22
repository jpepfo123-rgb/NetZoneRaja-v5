package com.netzone.crm.phonestate

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * BootReceiver — restarts CallMonitorService after device reboot.
 *
 * Requires RECEIVE_BOOT_COMPLETED permission (declared in app.json).
 * Handles both standard boot and quick-boot (HTC/some OEMs).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            try {
                val serviceIntent = Intent(context, CallMonitorService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } catch (_: Exception) {}
        }
    }
}
