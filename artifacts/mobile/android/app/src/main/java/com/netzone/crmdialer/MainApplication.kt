package com.netzone.crmdialer

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

/**
 * MainApplication — registers all React Native packages including our three
 * custom native modules:
 *
 *   CallLogPackage    — reads Android call log (CallLogModule)
 *   PhoneStatePackage — monitors call state + caches credentials (PhoneStateModule)
 *   OverlayPackage    — manages SYSTEM_ALERT_WINDOW overlays (OverlayModule)
 *
 * This file is copied by the withKotlinSources Expo plugin into
 *   android/app/src/main/java/com/netzone/crmdialer/MainApplication.kt
 * during `expo prebuild`, replacing the Expo-generated stub.
 */
class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        ReactNativeHostWrapper(
            this,
            object : DefaultReactNativeHost(this) {

                override fun getPackages(): List<ReactPackage> =
                    PackageList(this).packages.apply {
                        // ── Custom native modules ─────────────────────────
                        add(com.netzone.crm.calllog.CallLogPackage())
                        add(com.netzone.crm.phonestate.PhoneStatePackage())
                        add(com.netzone.crm.overlay.OverlayPackage())
                    }

                override fun getJSMainModuleName(): String =
                    ".expo/.virtual-metro-entry"

                override fun getUseDeveloperSupport(): Boolean =
                    BuildConfig.DEBUG

                override val isNewArchEnabled: Boolean
                    get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

                override val isHermesEnabled: Boolean
                    get() = BuildConfig.IS_HERMES_ENABLED
            }
        )

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // Loads the native entry point for the New Architecture.
            load()
        }
        ApplicationLifecycleDispatcher.onApplicationCreate(this)
    }
}
