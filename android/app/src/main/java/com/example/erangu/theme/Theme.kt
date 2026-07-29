package com.example.erangu.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

// ── ERANGU dark colour scheme (matching web CSS :root) ──────────────────────
private val DarkColorScheme = darkColorScheme(
    background = BgColor,
    onBackground = TextColor,
    surface = SurfaceColor,
    onSurface = TextColor,
    surfaceVariant = Surface2Color,
    onSurfaceVariant = MutedColor,
    primary = AccentColor,
    onPrimary = TextColor,
    secondary = MutedColor,
    onSecondary = TextColor,
    tertiary = GreenColor,
    onTertiary = TextColor,
    error = DangerColor,
    onError = TextColor,
)

private val LightColorScheme =
    lightColorScheme(
        background = BgColor,
        onBackground = TextColor,
        surface = SurfaceColor,
        onSurface = TextColor,
        surfaceVariant = Surface2Color,
        onSurfaceVariant = MutedColor,
        primary = AccentColor,
        onPrimary = TextColor,
        secondary = MutedColor,
        onSecondary = TextColor,
        tertiary = GreenColor,
        onTertiary = TextColor,
        error = DangerColor,
        onError = TextColor,
    )

@Composable
fun ERANGUTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit,
) {
    val colorScheme =
        when {
            dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
                val context = LocalContext.current
                if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
            }
            darkTheme -> DarkColorScheme
            else -> LightColorScheme
        }

    MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
