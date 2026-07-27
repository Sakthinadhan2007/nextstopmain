package com.example.erangu

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun ERANGUNavigation(activity: Activity) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var userId by remember { mutableStateOf<Int?>(null) }
    var routes by remember { mutableStateOf<List<RouteResponse>>(emptyList()) }
    var stops by remember { mutableStateOf<List<StopResponse>>(emptyList()) }
    var selectedStopId by remember { mutableStateOf<Int?>(null) }
    var status by remember { mutableStateOf("Sign in to load routes") }
    var isLoading by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("ERANGU Native App", style = MaterialTheme.typography.headlineMedium)
        Text(status, style = MaterialTheme.typography.bodyMedium)

        OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Name") }, modifier = Modifier.fillMaxWidth())

        Button(onClick = {
            scope.launch {
                isLoading = true
                status = "Signing in…"
                try {
                    val response = ApiClient.service.signIn(SignInRequest(email = email, name = name))
                    userId = response.id
                    status = "Signed in as ${response.name}"
                    val loadedRoutes = ApiClient.service.getRoutes(response.id)
                    routes = loadedRoutes
                    if (loadedRoutes.isNotEmpty()) {
                        val loadedStops = ApiClient.service.getStops(loadedRoutes.first().id)
                        stops = loadedStops
                        selectedStopId = loadedStops.firstOrNull()?.id
                    }
                } catch (e: Exception) {
                    status = "Sign-in failed: ${e.message ?: "unknown error"}"
                } finally {
                    isLoading = false
                }
            }
        }, enabled = !isLoading) {
            Text(if (isLoading) "Working…" else "Sign in")
        }

        if (routes.isNotEmpty()) {
            Text("Routes", style = MaterialTheme.typography.titleMedium)
            routes.forEach { route ->
                Button(onClick = {
                    scope.launch {
                        isLoading = true
                        status = "Loading stops for ${route.name}"
                        try {
                            val loadedStops = ApiClient.service.getStops(route.id)
                            stops = loadedStops
                            selectedStopId = loadedStops.firstOrNull()?.id
                            status = "Loaded ${loadedStops.size} stops"
                        } catch (e: Exception) {
                            status = "Failed to load stops: ${e.message ?: "unknown"}"
                        } finally {
                            isLoading = false
                        }
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                    Text(route.name)
                }
            }
        }

        if (stops.isNotEmpty()) {
            Text("Stops", style = MaterialTheme.typography.titleMedium)
            stops.forEach { stop ->
                Button(onClick = {
                    selectedStopId = stop.id
                    status = "Selected ${stop.label}"
                }, modifier = Modifier.fillMaxWidth()) {
                    Text(stop.label)
                }
            }
        }

        Button(onClick = {
            val intent = Intent(activity, LocationForegroundService::class.java)
            activity.startForegroundService(intent)
            status = "Tracking service started"
        }, enabled = userId != null && selectedStopId != null) {
            Text("Start tracking")
        }

        Button(onClick = {
            val intent = Intent(activity, LocationForegroundService::class.java)
            activity.stopService(intent)
            status = "Tracking service stopped"
        }) {
            Text("Stop tracking")
        }
    }
}
