// Package tracing provides OpenTelemetry tracing setup for the backend.
// When OTEL_EXPORTER_OTLP_ENDPOINT is set, spans are exported via OTLP HTTP
// (port 4318 by default). When unset, the global no-op tracer provider stays
// active and tracing costs nothing.
package tracing

import (
	"context"
	"errors"
	"net/url"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
	"go.uber.org/zap"
)

// Init configures the global tracer provider and W3C propagator.
// Returns a shutdown function that flushes pending spans; call it on
// process shutdown. If endpoint is empty, tracing stays disabled (no-op)
// and the returned shutdown function does nothing.
//
// samplingRatio is the parent-based TraceIDRatio sampling ratio (0..1);
// values outside the range are clamped.
func Init(endpoint string, samplingRatio float64) (func(context.Context) error, error) {
	// W3C Trace Context propagation, always installed so trace_id from
	// incoming requests is extracted even when export is disabled.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	if endpoint == "" {
		zap.L().Info("tracing disabled: OTEL_EXPORTER_OTLP_ENDPOINT not set")
		return func(context.Context) error { return nil }, nil
	}

	exporter, err := newExporter(endpoint)
	if err != nil {
		return nil, err
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName("gymtrack-backend"),
		),
	)
	if err != nil {
		return nil, err
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(clamp01(samplingRatio)))),
	)
	otel.SetTracerProvider(tp)

	zap.L().Info("tracing enabled",
		zap.String("endpoint", endpoint),
		zap.Float64("sampling_ratio", clamp01(samplingRatio)),
	)

	return func(ctx context.Context) error {
		err := tp.Shutdown(ctx)
		if errors.Is(err, context.DeadlineExceeded) {
			zap.L().Warn("tracer shutdown timed out; pending spans may be lost")
			return nil
		}
		return err
	}, nil
}

// newExporter builds an OTLP HTTP exporter. Endpoints with an explicit
// http/https scheme use WithEndpointURL; schemeless values (e.g.
// "localhost:4318") are treated as host:port with insecure transport per
// the OTel spec. Anything unparseable is rejected at startup.
func newExporter(endpoint string) (*otlptrace.Exporter, error) {
	u, err := url.Parse(endpoint)
	if err != nil {
		return nil, err
	}

	var opts []otlptracehttp.Option
	switch u.Scheme {
	case "http", "https":
		opts = append(opts, otlptracehttp.WithEndpointURL(endpoint))
	default:
		opts = append(opts,
			otlptracehttp.WithEndpoint(endpoint),
			otlptracehttp.WithInsecure(),
		)
	}
	return otlptracehttp.New(context.Background(), opts...)
}

func clamp01(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}

