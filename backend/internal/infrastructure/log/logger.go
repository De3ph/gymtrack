package logger

import (
	"context"

	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// From returns a zap.Logger with trace_id and span_id fields injected from ctx.
// Use for request-scoped logging so Grafana can correlate logs with traces.
// Falls back to zap.L() when no valid span exists in ctx.
func From(ctx context.Context) *zap.Logger {
	span := trace.SpanFromContext(ctx)
	sc := span.SpanContext()
	if !sc.IsValid() {
		return zap.L()
	}
	return zap.L().With(
		zap.String("trace_id", sc.TraceID().String()),
		zap.String("span_id", sc.SpanID().String()),
	)
}

// Init replaces the global zap logger with a production JSON config (InfoLevel).
// Call before fx.New(). Also redirects gin.DefaultWriter/ErrorWriter to zap.
func Init() {
	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(zapcore.InfoLevel)
	zap.ReplaceGlobals(zap.Must(cfg.Build()))

	redirectGinOutput()
}

// InitConsole replaces the global zap logger with a development console config (InfoLevel).
// Use for CLI tools that need human-readable output.
func InitConsole() {
	cfg := zap.NewDevelopmentConfig()
	cfg.Level = zap.NewAtomicLevelAt(zapcore.InfoLevel)
	cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	zap.ReplaceGlobals(zap.Must(cfg.Build()))

	redirectGinOutput()
}

// Sync flushes any buffered log entries. Safe to call (no-op on failure).
func Sync() {
	_ = zap.L().Sync()
}

// ZapLogger adapts zap for fx's fxevent.Logger interface.
type ZapLogger struct {
	logger *zap.SugaredLogger
}

// NewZapLogger returns an fx-compatible logger backed by zap.
func NewZapLogger() *ZapLogger {
	return &ZapLogger{logger: zap.L().Sugar()}
}

// LogEvent writes an fx lifecycle event via zap.
func (l *ZapLogger) LogEvent(event fxevent.Event) {
	switch e := event.(type) {
	case *fxevent.OnStartExecuting:
		l.logger.Debugf("HOOK OnStart executing: %s (caller: %s)", e.FunctionName, e.CallerName)
	case *fxevent.OnStartExecuted:
		if e.Err != nil {
			l.logger.Errorf("HOOK OnStart executed: %s (caller: %s) error: %v", e.FunctionName, e.CallerName, e.Err)
		} else {
			l.logger.Debugf("HOOK OnStart executed: %s (caller: %s) runtime: %v", e.FunctionName, e.CallerName, e.Runtime)
		}
	case *fxevent.OnStopExecuting:
		l.logger.Debugf("HOOK OnStop executing: %s (caller: %s)", e.FunctionName, e.CallerName)
	case *fxevent.OnStopExecuted:
		if e.Err != nil {
			l.logger.Errorf("HOOK OnStop executed: %s (caller: %s) error: %v", e.FunctionName, e.CallerName, e.Err)
		} else {
			l.logger.Debugf("HOOK OnStop executed: %s (caller: %s) runtime: %v", e.FunctionName, e.CallerName, e.Runtime)
		}
	case *fxevent.Supplied:
		if e.Err != nil {
			l.logger.Errorf("SUPPLY %v error: %v", e.TypeName, e.Err)
		} else {
			l.logger.Debugf("SUPPLY %v", e.TypeName)
		}
	case *fxevent.Provided:
		if e.Err != nil {
			l.logger.Errorf("PROVIDE %v error: %v", e.ConstructorName, e.Err)
		} else {
			l.logger.Debugf("PROVIDE %v", e.ConstructorName)
		}
	case *fxevent.Invoking:
		l.logger.Debugf("INVOKE %s", e.FunctionName)
	case *fxevent.Invoked:
		if e.Err != nil {
			l.logger.Errorf("INVOKE %s error: %v", e.FunctionName, e.Err)
		} else {
			l.logger.Debugf("INVOKE %s", e.FunctionName)
		}
	case *fxevent.Stopping:
		l.logger.Infof("STOPPING (%s)", e.Signal)
	case *fxevent.Stopped:
		if e.Err != nil {
			l.logger.Errorf("STOP error: %v", e.Err)
		}
	case *fxevent.RollingBack:
		l.logger.Errorf("ROLLING BACK: %v", e.StartErr)
	case *fxevent.RolledBack:
		if e.Err != nil {
			l.logger.Errorf("ROLL BACK error: %v", e.Err)
		}
	case *fxevent.Started:
		if e.Err != nil {
			l.logger.Errorf("START error: %v", e.Err)
		} else {
			l.logger.Infof("STARTED")
		}
	case *fxevent.LoggerInitialized:
		if e.Err != nil {
			l.logger.Errorf("LOGGER INIT error: %v", e.Err)
		} else {
			l.logger.Debugf("LOGGER INITIALIZED: %v", e.ConstructorName)
		}
	default:
		l.logger.Debugf("fx event: %T", event)
	}
}

// redirectGinOutput sends gin's default log output through zap.
func redirectGinOutput() {
	gin.DefaultWriter = &zapWriter{level: zapcore.InfoLevel}
	gin.DefaultErrorWriter = &zapWriter{level: zapcore.ErrorLevel}
}

// zapWriter implements io.Writer, forwarding writes to zap at a fixed level.
type zapWriter struct {
	level zapcore.Level
}

func (w *zapWriter) Write(p []byte) (n int, err error) {
	msg := string(p)
	switch w.level {
	case zapcore.ErrorLevel:
		zap.L().Error(msg)
	default:
		zap.L().Info(msg)
	}
	return len(p), nil
}

