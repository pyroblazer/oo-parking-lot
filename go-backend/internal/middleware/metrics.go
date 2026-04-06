// Package middleware provides HTTP middleware for the parking lot API.
// This file defines Prometheus metrics for parking operations and HTTP requests.
package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// ParkingOperationsTotal tracks the total number of parking operations
	// (park, unpark, etc.) partitioned by operation type and result.
	ParkingOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "parking_operations_total",
			Help: "Total number of parking operations partitioned by operation and result.",
		},
		[]string{"operation", "result"},
	)

	// HTTPRequestDurationSeconds tracks HTTP request latencies partitioned
	// by method, route, and HTTP status code.
	HTTPRequestDurationSeconds = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Histogram of HTTP request duration in seconds partitioned by method, route, and status.",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "route", "status"},
	)

	// ParkingSlotAllocationDurationSeconds tracks how long slot allocation
	// takes, partitioned by the slot type that was allocated.
	ParkingSlotAllocationDurationSeconds = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "parking_slot_allocation_duration_seconds",
			Help:    "Histogram of parking slot allocation duration in seconds partitioned by slot type.",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0},
		},
		[]string{"slot_type"},
	)
)

func init() {
	prometheus.MustRegister(ParkingOperationsTotal)
	prometheus.MustRegister(HTTPRequestDurationSeconds)
	prometheus.MustRegister(ParkingSlotAllocationDurationSeconds)
}

// MetricsMiddleware returns gorilla/mux compatible middleware that records
// HTTP request duration as a Prometheus histogram. It uses the mux route
// template (e.g. "/api/v1/sessions/{id}") as the label so that cardinality
// stays bounded.
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Wrap the response writer to capture the status code.
		recorder := &metricsResponseRecorder{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(recorder, r)

		duration := time.Since(start).Seconds()
		route := getRouteTemplate(r)

		HTTPRequestDurationSeconds.WithLabelValues(
			r.Method,
			route,
			strconv.Itoa(recorder.statusCode),
		).Observe(duration)
	})
}

// MetricsHandler returns an http.Handler that serves Prometheus metrics
// via promhttp.
func MetricsHandler() http.Handler {
	return promhttp.Handler()
}

// metricsResponseRecorder wraps http.ResponseWriter to capture the status code.
type metricsResponseRecorder struct {
	http.ResponseWriter
	statusCode int
}

// WriteHeader captures the status code and delegates to the wrapped ResponseWriter.
func (r *metricsResponseRecorder) WriteHeader(code int) {
	r.statusCode = code
	r.ResponseWriter.WriteHeader(code)
}

// getRouteTemplate extracts the gorilla/mux route template from the request
// context. Falls back to the URL path when the route is not available.
func getRouteTemplate(r *http.Request) string {
	route := mux.CurrentRoute(r)
	if route != nil {
		tpl, err := route.GetPathTemplate()
		if err == nil && tpl != "" {
			return tpl
		}
	}
	return r.URL.Path
}
