package com.netzone.crm.phonestate

import android.app.*
import android.content.*
import android.os.*
import android.telephony.TelephonyManager
import androidx.core.app.NotificationCompat

/**
 * CallMonitorService — foreground service that tracks call state in real time.
 *
 * Lifecycle:
 *   - Started by PhoneStateModule.startCallMonitor() from JS on app open
 *   - Also started by BootReceiver on device reboot
 *   - Also started by PhoneStateReceiver when the system broadcasts PHONE_STATE
 *     (covers the case where the app was killed between calls)
 *
 * Internally registers a dynamic BroadcastReceiver for:
 *   - android.telephony.action.PHONE_STATE_CHANGED  → RINGING / OFFHOOK / IDLE
 *   - android.intent.action.NEW_OUTGOING_CALL       → captures outgoing number
 *
 * State machine:
 *   IDLE → RINGING                         → Incoming call (number known)
 *   IDLE → OFFHOOK (no prior RINGING)      → Outgoing call (number from NEW_OUTGOING_CALL)
 *   RINGING → OFFHOOK                      → Incoming answered
 *   RINGING → IDLE                         → Missed call
 *   OFFHOOK → IDLE                         → Call ended
 *
 * On call end:
 *   1. Emits onCallStateChanged(IDLE, number, duration, type) to React Native (if bridge alive)
 *   2. Starts CallSyncService to POST the record to the API (independent of RN bridge)
 *   3. Launches AfterCallActivity overlay (only when app is in background)
 */
class CallMonitorService : Service() {

    companion object {
        private const val CHANNEL_ID = "netzone_call_monitor"
        private const val NOTIF_ID   = 1001
    }

    // ── State machine ──────────────────────────────────────────────────────────
    private var phoneState  = TelephonyManager.CALL_STATE_IDLE  // 0 IDLE / 1 RINGING / 2 OFFHOOK
    private var callNumber  = ""    // phone number of current call
    private var isIncoming  = false // true when the call started as RINGING
    private var callStartMs = 0L    // time the call was answered (OFFHOOK)
    private var outgoingNum = ""    // captured from NEW_OUTGOING_CALL intent

    // ── Dynamic receiver ───────────────────────────────────────────────────────
    private val callReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_NEW_OUTGOING_CALL -> {
                    outgoingNum = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER) ?: ""
                }
                TelephonyManager.ACTION_PHONE_STATE_CHANGED -> {
                    val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
                    val number   = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER) ?: ""
                    handlePhoneState(stateStr, number)
                }
            }
        }
    }

    // ── Service lifecycle ──────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification("Monitoring calls…"))

        val filter = IntentFilter().apply {
            addAction(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
            addAction(Intent.ACTION_NEW_OUTGOING_CALL)
            priority = IntentFilter.SYSTEM_HIGH_PRIORITY
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(callReceiver, filter, RECEIVER_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(callReceiver, filter)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        super.onDestroy()
        runCatching { unregisterReceiver(callReceiver) }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── State machine logic ────────────────────────────────────────────────────

    private fun handlePhoneState(stateStr: String, incomingNumber: String) {
        val prevState = phoneState
        phoneState = when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING  -> TelephonyManager.CALL_STATE_RINGING
            TelephonyManager.EXTRA_STATE_OFFHOOK  -> TelephonyManager.CALL_STATE_OFFHOOK
            else                                   -> TelephonyManager.CALL_STATE_IDLE
        }

        when {
            // ─── Incoming ringing ────────────────────────────────────────────
            phoneState == TelephonyManager.CALL_STATE_RINGING -> {
                isIncoming = true
                callNumber = incomingNumber
                PhoneStateModule.emitEvent("RINGING", callNumber, null, "INCOMING")

                // Show overlay when app is not in foreground
                startOverlayIfBackground(callNumber)
            }

            // ─── Call answered or outgoing dial started ────────────────────
            phoneState == TelephonyManager.CALL_STATE_OFFHOOK -> {
                callStartMs = System.currentTimeMillis()
                if (!isIncoming) {
                    // Outgoing: number comes from NEW_OUTGOING_CALL broadcast
                    callNumber = outgoingNum.ifEmpty { incomingNumber }
                    PhoneStateModule.emitEvent("OFFHOOK", callNumber, null, "OUTGOING")
                } else {
                    // Incoming answered
                    PhoneStateModule.emitEvent("OFFHOOK", callNumber, null, "INCOMING")
                }
                dismissIncomingOverlay()
            }

            // ─── Call ended ────────────────────────────────────────────────
            phoneState == TelephonyManager.CALL_STATE_IDLE &&
            prevState != TelephonyManager.CALL_STATE_IDLE -> {
                val durationSec = if (callStartMs > 0L)
                    ((System.currentTimeMillis() - callStartMs) / 1000L).toInt()
                else 0

                // Determine call type
                val callType = when {
                    prevState == TelephonyManager.CALL_STATE_RINGING -> "MISSED"  // rang but not answered
                    isIncoming                                        -> "INCOMING"
                    else                                              -> "OUTGOING"
                }

                val num = callNumber.ifEmpty { outgoingNum }

                // 1. Notify React Native
                PhoneStateModule.emitEvent("IDLE", num, durationSec, callType)

                // 2. Background HTTP sync (independent of RN bridge)
                startCallSync(num, durationSec, callType)

                // 3. After-call overlay for background state
                if (callType != "MISSED") {
                    startAfterCallOverlay(num, durationSec, callType)
                }

                // Reset state machine
                callNumber  = ""
                outgoingNum = ""
                isIncoming  = false
                callStartMs = 0L
            }
        }
    }

    // ── Overlay launchers ──────────────────────────────────────────────────────

    private fun startOverlayIfBackground(number: String) {
        try {
            startActivity(
                Intent(this, com.netzone.crm.overlay.IncomingCallActivity::class.java).apply {
                    putExtra("phone_number", number)
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK        or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP      or
                        Intent.FLAG_ACTIVITY_NO_HISTORY
                    )
                }
            )
        } catch (_: Exception) {}
    }

    private fun dismissIncomingOverlay() {
        sendBroadcast(Intent("com.netzone.crm.DISMISS_OVERLAY"))
    }

    private fun startAfterCallOverlay(number: String, duration: Int, callType: String) {
        try {
            startActivity(
                Intent(this, com.netzone.crm.overlay.AfterCallActivity::class.java).apply {
                    putExtra("phone_number", number)
                    putExtra("duration",     duration)
                    putExtra("call_type",    callType)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                }
            )
        } catch (_: Exception) {}
    }

    // ── Background sync ────────────────────────────────────────────────────────

    private fun startCallSync(number: String, duration: Int, callType: String) {
        try {
            startService(
                Intent(this, CallSyncService::class.java).apply {
                    putExtra("phone_number", number)
                    putExtra("duration",     duration)
                    putExtra("call_type",    callType)
                }
            )
        } catch (_: Exception) {}
    }

    // ── Notification helpers ───────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_ID,
                "Call Monitor",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Net Zone CRM — active call monitoring"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pi = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Net Zone CRM")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
