package com.example.erangu

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch

// ── Colour tokens (dark theme matching the web app) ───────────────────────────
private val BgColor       = Color(0xFF0D0E11)
private val SurfaceColor  = Color(0xFF15161A)
private val Surface2Color = Color(0xFF1E1F24)
private val LineColor     = Color(0xFF2B2C34)
private val TextColor     = Color(0xFFF3F4F6)
private val MutedColor    = Color(0xFF9CA3AF)
private val AccentColor   = Color(0xFF2563EB)
private val DangerColor   = Color(0xFFDC2626)
private val GreenColor    = Color(0xFF16A34A)

private val MODES = listOf("bus", "train", "metro", "custom")
private val MODE_LABELS = mapOf("bus" to "Bus", "train" to "Train", "metro" to "Metro", "custom" to "Custom")

@Composable
fun ERANGUNavigation(activity: Activity) {
    val scope   = rememberCoroutineScope()
    val context = LocalContext.current

    // ── Auth state ──────────────────────────────────────────────────────────
    var email     by remember { mutableStateOf("") }
    var name      by remember { mutableStateOf("") }
    var userId    by remember { mutableStateOf<Int?>(null) }
    var userName  by remember { mutableStateOf("") }
    var isSignedIn by remember { mutableStateOf(false) }

    // ── Data state ──────────────────────────────────────────────────────────
    var routes    by remember { mutableStateOf<List<RouteResponse>>(emptyList()) }
    var stops     by remember { mutableStateOf<List<StopResponse>>(emptyList()) }
    var selectedRoute   by remember { mutableStateOf<RouteResponse?>(null) }
    var selectedStop    by remember { mutableStateOf<StopResponse?>(null) }
    var selectedMode    by remember { mutableStateOf("bus") }
    var isTracking      by remember { mutableStateOf(false) }
    var status          by remember { mutableStateOf("Sign in to start tracking") }
    var isLoading       by remember { mutableStateOf(false) }

    // ── Screen ──────────────────────────────────────────────────────────────
    var screen by remember { mutableStateOf("home") } // home | signin | mode

    // ── Permissions ─────────────────────────────────────────────────────────
    val locationGranted = remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        )
    }
    val permLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { perms ->
        locationGranted.value = perms[Manifest.permission.ACCESS_FINE_LOCATION] == true
        if (locationGranted.value) status = "Location granted. Pick a route and destination."
        else status = "Location permission denied. Grant it in Settings."
    }
    val notifGranted = remember {
        mutableStateOf(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU)
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            else true
        )
    }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        notifGranted.value = granted
    }

    fun requestPermissions() {
        permLauncher.launch(
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    fun signIn() {
        scope.launch {
            isLoading = true
            status = "Signing in…"
            try {
                val resp = ApiClient.service.signIn(SignInRequest(email = email.trim(), name = name.trim()))
                userId = resp.id
                userName = resp.name
                isSignedIn = true
                status = "Signed in. Loading routes…"
                val allRoutes = ApiClient.service.getRoutes(resp.id)
                routes = allRoutes
                status = "Loaded ${allRoutes.size} routes. Pick a mode below."
                screen = "home"
                requestPermissions()
            } catch (e: Exception) {
                status = "Sign-in failed: ${e.message ?: "network error"}"
            } finally {
                isLoading = false
            }
        }
    }

    fun loadStops(route: RouteResponse) {
        scope.launch {
            isLoading = true
            status = "Loading stops for ${route.name}…"
            try {
                stops = ApiClient.service.getStops(route.id)
                selectedStop = null
                status = "Pick your destination stop."
            } catch (e: Exception) {
                status = "Failed: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun startTracking() {
        val stop = selectedStop ?: return
        if (!locationGranted.value) { requestPermissions(); return }
        val intent = LocationForegroundService.startIntent(
            context, stop.label, stop.latitude, stop.longitude, stop.radiusMeters
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        isTracking = true
        status = "Tracking active — you'll be alerted near ${stop.label}"
    }

    fun stopTracking() {
        context.startService(LocationForegroundService.stopIntent(context))
        isTracking = false
        status = "Tracking stopped."
    }

    // ── Root container ───────────────────────────────────────────────────────
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
    ) {
        // Top navigation bar
        TopBar(
            isSignedIn = isSignedIn,
            userName = userName,
            selectedMode = selectedMode,
            onModeClick = { mode ->
                selectedMode = mode
                screen = "mode"
                val modeRoutes = routes.filter { it.mode == mode }
                if (modeRoutes.isNotEmpty() && selectedRoute?.mode != mode) {
                    selectedRoute = modeRoutes.first()
                    loadStops(modeRoutes.first())
                }
            },
            onHomeClick = { screen = "home" },
            onRoutesClick = { screen = "routes" },
            onSignInClick = { screen = "signin" },
            onSignOutClick = {
                isSignedIn = false; userId = null; userName = ""; routes = emptyList()
                stops = emptyList(); selectedRoute = null; selectedStop = null
                screen = "home"; status = "Signed out."
            }
        )

        // Status bar
        StatusBar(status = status, isTracking = isTracking)

        // Screen content
        Box(modifier = Modifier.weight(1f)) {
            when (screen) {
                "routes" -> RoutesScreen(
                    routes = routes,
                    stopsByRoute = stops.groupBy { it.routeId },
                    onRouteClick = { route ->
                        selectedMode = route.mode
                        selectedRoute = route
                        loadStops(route)
                        screen = "mode"
                    }
                )
                "home"   -> HomeScreen(
                    isSignedIn = isSignedIn,
                    routes = routes,
                    onModeClick = { mode ->
                        selectedMode = mode
                        screen = "mode"
                        val modeRoutes = routes.filter { it.mode == mode }
                        if (modeRoutes.isNotEmpty()) {
                            selectedRoute = modeRoutes.first()
                            loadStops(modeRoutes.first())
                        }
                    },
                    onSignInClick = { screen = "signin" }
                )
                "signin" -> SignInScreen(
                    email = email, name = name, isLoading = isLoading,
                    onEmailChange = { email = it },
                    onNameChange  = { name = it },
                    onSignIn = { signIn() }
                )
                "mode"   -> ModeScreen(
                    mode = selectedMode,
                    routes = routes.filter { it.mode == selectedMode },
                    stops = stops,
                    selectedRoute = selectedRoute,
                    selectedStop = selectedStop,
                    isTracking = isTracking,
                    isLoading = isLoading,
                    locationGranted = locationGranted.value,
                    onRouteSelect = { route ->
                        selectedRoute = route
                        loadStops(route)
                    },
                    onStopSelect  = { stop  -> selectedStop = stop },
                    onStartTracking = { startTracking() },
                    onStopTracking  = { stopTracking() },
                    onGrantLocation = { requestPermissions() },
                    onOpenBgSettings = {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.fromParts("package", context.packageName, null))
                        context.startActivity(intent)
                    }
                )
            }
        }
    }
}

// ── Top Navigation Bar ────────────────────────────────────────────────────────

@Composable
private fun TopBar(
    isSignedIn: Boolean,
    userName: String,
    selectedMode: String,
    onModeClick: (String) -> Unit,
    onHomeClick: () -> Unit,
    onRoutesClick: () -> Unit,
    onSignInClick: () -> Unit,
    onSignOutClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF15161A))
            .border(width = 1.dp, color = LineColor, shape = RoundedCornerShape(0.dp))
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            "ERANGU",
            color = TextColor,
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            modifier = Modifier.clickable { onHomeClick() }
        )
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.horizontalScroll(rememberScrollState())
        ) {
            MODES.forEach { mode ->
                val active = selectedMode == mode
                Text(
                    MODE_LABELS[mode] ?: mode,
                    color = if (active) TextColor else MutedColor,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .background(
                            if (active) AccentColor.copy(alpha = 0.2f) else Color.Transparent,
                            RoundedCornerShape(6.dp)
                        )
                        .border(1.dp, if (active) AccentColor else LineColor, RoundedCornerShape(6.dp))
                        .clickable { onModeClick(mode) }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                )
            }
            Text(
                "Routes",
                color = MutedColor,
                fontWeight = FontWeight.Normal,
                fontSize = 13.sp,
                modifier = Modifier
                    .border(1.dp, LineColor, RoundedCornerShape(6.dp))
                    .clickable { onRoutesClick() }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            )
            Text(
                if (isSignedIn) "Sign Out" else "Sign In",
                color = MutedColor,
                fontSize = 13.sp,
                modifier = Modifier
                    .border(1.dp, LineColor, RoundedCornerShape(6.dp))
                    .clickable { if (isSignedIn) onSignOutClick() else onSignInClick() }
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            )
        }
    }
}

// ── Status Bar ────────────────────────────────────────────────────────────────

@Composable
private fun StatusBar(status: String, isTracking: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF18191E))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        if (isTracking) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(GreenColor, RoundedCornerShape(50))
            )
        }
        Text(status, color = MutedColor, fontSize = 12.sp, maxLines = 2)
    }
}

// ── Home Screen ───────────────────────────────────────────────────────────────

@Composable
private fun HomeScreen(
    isSignedIn: Boolean,
    routes: List<RouteResponse>,
    onModeClick: (String) -> Unit,
    onSignInClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Spacer(Modifier.height(4.dp))
        Text("ERANGU Chennai", color = TextColor, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(
            "Location-aware stop alarm for Chennai commuters. GPS tracks your journey in the background and alerts you near your stop.",
            color = MutedColor, fontSize = 13.sp, lineHeight = 20.sp
        )

        if (!isSignedIn) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Surface2Color),
                shape = RoundedCornerShape(10.dp)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Get Started", color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    Text("Sign in to load Chennai routes and arm stop alerts.", color = MutedColor, fontSize = 13.sp)
                    Button(
                        onClick = onSignInClick,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = AccentColor)
                    ) { Text("Sign In", color = TextColor) }
                }
            }
        }

        MODES.forEach { mode ->
            val count = routes.count { it.mode == mode }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onModeClick(mode) },
                colors = CardDefaults.cardColors(containerColor = Surface2Color),
                shape = RoundedCornerShape(10.dp)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(MODE_LABELS[mode] ?: mode, color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text(
                            if (isSignedIn) "$count route(s)" else "Sign in to load routes",
                            color = MutedColor, fontSize = 12.sp
                        )
                    }
                    Text("Explore →", color = AccentColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        Text("How it works", color = TextColor, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        listOf(
            "01" to "Sign in and pick a mode (Bus / Train / Metro)",
            "02" to "Select your route and destination stop",
            "03" to "Tap Arm Alert — GPS tracks in the background",
            "04" to "Alarm + vibration fires when you reach the stop"
        ).forEach { (num, text) ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface2Color, RoundedCornerShape(8.dp))
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top
            ) {
                Text(num, color = AccentColor.copy(alpha = 0.6f), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, modifier = Modifier.width(30.dp))
                Text(text, color = MutedColor, fontSize = 13.sp, lineHeight = 19.sp)
            }
        }
    }
}

// ── Sign In Screen ────────────────────────────────────────────────────────────

@Composable
private fun SignInScreen(
    email: String, name: String, isLoading: Boolean,
    onEmailChange: (String) -> Unit,
    onNameChange: (String) -> Unit,
    onSignIn: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(20.dp))
        Text("Sign In", color = TextColor, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("Use your email to sign in or create an account automatically.", color = MutedColor, fontSize = 13.sp, textAlign = TextAlign.Center)
        OutlinedTextField(
            value = email, onValueChange = onEmailChange,
            label = { Text("Email", color = MutedColor) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextColor, unfocusedTextColor = TextColor,
                focusedBorderColor = AccentColor, unfocusedBorderColor = LineColor,
                cursorColor = AccentColor
            )
        )
        OutlinedTextField(
            value = name, onValueChange = onNameChange,
            label = { Text("Name (optional)", color = MutedColor) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextColor, unfocusedTextColor = TextColor,
                focusedBorderColor = AccentColor, unfocusedBorderColor = LineColor,
                cursorColor = AccentColor
            )
        )
        Button(
            onClick = onSignIn,
            enabled = email.isNotBlank() && !isLoading,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = AccentColor)
        ) {
            Text(if (isLoading) "Signing in…" else "Sign In", color = TextColor)
        }
    }
}

// ── Mode Screen ───────────────────────────────────────────────────────────────

@Composable
private fun ModeScreen(
    mode: String,
    routes: List<RouteResponse>,
    stops: List<StopResponse>,
    selectedRoute: RouteResponse?,
    selectedStop: StopResponse?,
    isTracking: Boolean,
    isLoading: Boolean,
    locationGranted: Boolean,
    onRouteSelect: (RouteResponse) -> Unit,
    onStopSelect: (StopResponse) -> Unit,
    onStartTracking: () -> Unit,
    onStopTracking: () -> Unit,
    onGrantLocation: () -> Unit,
    onOpenBgSettings: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(
                "${MODE_LABELS[mode] ?: mode} Routes",
                color = TextColor, fontWeight = FontWeight.Bold, fontSize = 18.sp
            )
        }

        // Location permission banner
        if (!locationGranted) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF7C2D12)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Location Permission Required", color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("Grant location so ERANGU can track your position.", color = Color(0xFFFFD6A5), fontSize = 12.sp)
                        Button(onClick = onGrantLocation, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEA580C))) {
                            Text("Grant Location", color = TextColor, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Background location tip
        if (locationGranted) {
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF1A2E1A)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        Modifier.padding(10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("For screen-off tracking:", color = GreenColor, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                            Text("Set Location → Allow all the time in Settings", color = MutedColor, fontSize = 11.sp)
                        }
                        Text("Settings →", color = GreenColor, fontSize = 11.sp,
                            modifier = Modifier.clickable { onOpenBgSettings() })
                    }
                }
            }
        }

        // Route picker
        if (routes.isNotEmpty()) {
            item { Text("Select Route", color = MutedColor, fontSize = 12.sp, fontWeight = FontWeight.Medium) }
            items(routes) { route ->
                val isSelected = selectedRoute?.id == route.id
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isSelected) AccentColor.copy(alpha = 0.15f) else Surface2Color,
                            RoundedCornerShape(8.dp)
                        )
                        .border(1.dp, if (isSelected) AccentColor else LineColor, RoundedCornerShape(8.dp))
                        .clickable { onRouteSelect(route) }
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(route.name, color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Text("${route.startLocation} → ${route.endLocation}", color = MutedColor, fontSize = 12.sp)
                    }
                    if (isSelected) Text("✓", color = AccentColor, fontWeight = FontWeight.Bold)
                }
            }
        } else if (!isLoading) {
            item {
                Text(
                    "No routes found for this mode. Sign in to load routes.",
                    color = MutedColor, fontSize = 13.sp,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }
        }

        // Stop picker
        if (stops.isNotEmpty() && selectedRoute != null) {
            item { Spacer(Modifier.height(4.dp)) }
            item { Text("Select Destination Stop", color = MutedColor, fontSize = 12.sp, fontWeight = FontWeight.Medium) }
            items(stops) { stop ->
                val isSelected = selectedStop?.id == stop.id
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isSelected) GreenColor.copy(alpha = 0.12f) else SurfaceColor,
                            RoundedCornerShape(8.dp)
                        )
                        .border(1.dp, if (isSelected) GreenColor else LineColor, RoundedCornerShape(8.dp))
                        .clickable { onStopSelect(stop) }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(stop.label, color = TextColor, fontSize = 13.sp)
                    if (isSelected) Text("✓", color = GreenColor, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Loading spinner
        if (isLoading) {
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                    CircularProgressIndicator(color = AccentColor, modifier = Modifier.size(28.dp))
                }
            }
        }

        // Tracking controls
        item { Spacer(Modifier.height(8.dp)) }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { if (isTracking) onStopTracking() else onStartTracking() },
                    enabled = selectedStop != null || isTracking,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isTracking) DangerColor else AccentColor
                    )
                ) {
                    Text(
                        if (isTracking) "Stop Tracking" else "Arm Wake-Up Alert",
                        color = TextColor, fontWeight = FontWeight.SemiBold
                    )
                }

                if (isTracking && selectedStop != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1A2E1A)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            Modifier.padding(12.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(Modifier.size(10.dp).background(GreenColor, RoundedCornerShape(50)))
                            Text(
                                "Tracking active — alarm will fire near ${selectedStop.label}. Screen can be locked.",
                                color = Color(0xFFBBF7D0), fontSize = 12.sp, lineHeight = 18.sp
                            )
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

// ── Routes Screen ─────────────────────────────────────────────────────────────

@Composable
private fun RoutesScreen(
    routes: List<RouteResponse>,
    stopsByRoute: Map<Int, List<StopResponse>>,
    onRouteClick: (RouteResponse) -> Unit
) {
    val displayModes = listOf("train", "metro", "bus")
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(BgColor)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("Chennai Transit Routes", color = TextColor, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Text(
                "Browse all train, metro, and bus routes. Tap any route to select it and arm a wake-up alert.",
                color = MutedColor, fontSize = 13.sp, lineHeight = 19.sp
            )
        }

        items(displayModes) { mode ->
            val modeRoutes = routes.filter { it.mode == mode }
            val totalStops = modeRoutes.sumOf { stopsByRoute[it.id]?.size ?: 0 }
            item {
                Text(
                    MODE_LABELS[mode] ?: mode,
                    color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 15.sp
                )
                Text(
                    "${modeRoutes.size} route(s) | $totalStops stop(s)",
                    color = MutedColor, fontSize = 12.sp
                )
            }
            if (modeRoutes.isEmpty()) {
                item {
                    Text(
                        "No routes loaded. Sign in to load routes.",
                        color = MutedColor, fontSize = 13.sp,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
            } else {
                items(modeRoutes) { route ->
                    val routeStops = stopsByRoute[route.id]?.sortedBy { it.sortOrder } ?: emptyList()
                    val previewStops = routeStops.take(6).joinToString(" • ") { it.label }
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onRouteClick(route) },
                        colors = CardDefaults.cardColors(containerColor = Surface2Color),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(route.name, color = TextColor, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                                Text(
                                    "${routeStops.size} stops",
                                    color = MutedColor, fontSize = 11.sp,
                                    modifier = Modifier
                                        .background(LineColor, RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Text(
                                "${route.startLocation} → ${route.endLocation}",
                                color = MutedColor, fontSize = 12.sp
                            )
                            if (previewStops.isNotEmpty()) {
                                Text(
                                    previewStops + if (routeStops.size > 6) " • +${routeStops.size - 6} more" else "",
                                    color = MutedColor, fontSize = 11.sp, lineHeight = 16.sp
                                )
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(4.dp)) }
        }
    }
}
