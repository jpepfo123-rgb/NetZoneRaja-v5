package com.netzone.crm.calllog

import android.Manifest
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*

/**
 * CallLogModule — reads the Android system call log.
 * Requires READ_CALL_LOG permission.
 *
 * JS usage:
 *   const entries = await NativeModules.CallLogModule.getCallLog(100)
 *   // entries: [{ id, number, cachedName, type, duration, date }, ...]
 *   //   type: 1=Incoming, 2=Outgoing, 3=Missed
 */
class CallLogModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "CallLogModule"

    /**
     * Fetch up to [limit] call log entries, newest first.
     * Returns a JS array of maps.
     */
    @ReactMethod
    fun getCallLog(limit: Int, promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_CALL_LOG
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_CALL_LOG permission not granted")
                return
            }

            val projection = arrayOf(
                CallLog.Calls._ID,
                CallLog.Calls.NUMBER,
                CallLog.Calls.CACHED_NAME,
                CallLog.Calls.TYPE,
                CallLog.Calls.DURATION,
                CallLog.Calls.DATE
            )

            val cursor = reactContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                projection,
                null,
                null,
                "${CallLog.Calls.DATE} DESC"
            )

            val result = WritableNativeArray()

            if (cursor == null) {
                promise.resolve(result)
                return
            }

            cursor.use { c ->
                val idIdx   = c.getColumnIndexOrThrow(CallLog.Calls._ID)
                val numIdx  = c.getColumnIndexOrThrow(CallLog.Calls.NUMBER)
                val nameIdx = c.getColumnIndexOrThrow(CallLog.Calls.CACHED_NAME)
                val typeIdx = c.getColumnIndexOrThrow(CallLog.Calls.TYPE)
                val durIdx  = c.getColumnIndexOrThrow(CallLog.Calls.DURATION)
                val dateIdx = c.getColumnIndexOrThrow(CallLog.Calls.DATE)

                var count = 0
                while (c.moveToNext() && count < limit) {
                    val entry = WritableNativeMap()
                    entry.putString("id",         c.getString(idIdx)    ?: "")
                    entry.putString("number",     c.getString(numIdx)   ?: "")
                    entry.putString("cachedName", c.getString(nameIdx)  ?: "")
                    entry.putInt   ("type",       c.getInt(typeIdx))
                    entry.putString("duration",   c.getString(durIdx)   ?: "0")
                    entry.putString("date",       c.getString(dateIdx)  ?: "0")
                    result.pushMap(entry)
                    count++
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Failed to read call log")
        }
    }
}
