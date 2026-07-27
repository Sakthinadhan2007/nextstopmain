package com.example.erangu

import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val BASE_URL = "https://nextstopmain.onrender.com/"

    private val gson = GsonBuilder().create()

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val service: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(ApiService::class.java)
    }
}

interface ApiService {
    @POST("api/auth/sign-in")
    suspend fun signIn(@Body body: SignInRequest): SignInResponse

    @GET("api/routes")
    suspend fun getRoutes(@Query("userId") userId: Int): List<RouteResponse>

    @GET("api/stops")
    suspend fun getStops(@Query("routeId") routeId: Int): List<StopResponse>

    @GET("api/alerts")
    suspend fun getAlerts(@Query("userId") userId: Int): List<AlertResponse>

    @POST("api/alerts")
    suspend fun createAlert(@Body body: AlertRequest): AlertResponse

    @POST("api/proximity/{userId}")
    suspend fun proximity(@Path("userId") userId: Int, @Body body: ProximityRequest): ProximityResponse
}

data class SignInRequest(val email: String, val name: String)
data class SignInResponse(val id: Int, val email: String, val name: String)
data class RouteResponse(val id: Int, val name: String, val mode: String, val startLocation: String, val endLocation: String)
data class StopResponse(val id: Int, val routeId: Int, val label: String, val lat: Double, val lng: Double, val mode: String, val radiusMeters: Int)
data class AlertRequest(val userId: Int, val stopId: Int, val isActive: Boolean)
data class AlertResponse(val id: Int, val userId: Int, val stopId: Int, val isActive: Boolean)
data class ProximityRequest(val latitude: Double, val longitude: Double)
data class ProximityResponse(val nearest: List<StopResponse>, val triggered: List<StopResponse>)
