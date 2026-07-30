package cache

import (
	"sync/atomic"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// CacheMetrics tracks cache hit/miss/eviction counts and size for a single Cache[T] instance.
// Each domain gets its own CacheMetrics with a unique prefix.
type CacheMetrics struct {
	Hits      prometheus.Counter
	Misses    prometheus.Counter
	Evictions prometheus.Counter
	Size      prometheus.Gauge
	HitRatio  prometheus.GaugeFunc

	hits   atomic.Uint64
	misses atomic.Uint64
}

// NewCacheMetrics creates a CacheMetrics with the given registry and prefix.
// Metrics are named {prefix}_hits_total, {prefix}_misses_total, {prefix}_evictions_total, {prefix}_size_bytes.
func NewCacheMetrics(reg *prometheus.Registry, prefix string) *CacheMetrics {
	m := &CacheMetrics{}

	m.Hits = promauto.With(reg).NewCounter(prometheus.CounterOpts{
		Name: prefix + "_hits_total",
		Help: "Total number of cache hits",
	})
	m.Misses = promauto.With(reg).NewCounter(prometheus.CounterOpts{
		Name: prefix + "_misses_total",
		Help: "Total number of cache misses",
	})
	m.Evictions = promauto.With(reg).NewCounter(prometheus.CounterOpts{
		Name: prefix + "_evictions_total",
		Help: "Total number of cache evictions (random-2)",
	})
	m.Size = promauto.With(reg).NewGauge(prometheus.GaugeOpts{
		Name: prefix + "_size_bytes",
		Help: "Current number of entries in the cache",
	})
	m.HitRatio = promauto.With(reg).NewGaugeFunc(prometheus.GaugeOpts{
		Name: prefix + "_hit_ratio",
		Help: "Cache hit ratio (hits / total requests)",
	}, func() float64 {
		h := m.hits.Load()
		ms := m.misses.Load()
		total := h + ms
		if total == 0 {
			return 0
		}
		return float64(h) / float64(total)
	})

	return m
}

// RecordHit increments the hit counter atomically.
func (m *CacheMetrics) RecordHit() {
	m.hits.Add(1)
	m.Hits.Inc()
}

// RecordMiss increments the miss counter atomically.
func (m *CacheMetrics) RecordMiss() {
	m.misses.Add(1)
	m.Misses.Inc()
}

// RecordEviction increments the eviction counter. Called by the cache adapter
// when a random-2 eviction removes an entry to enforce the maxEntries bound.
func (m *CacheMetrics) RecordEviction() {
	m.Evictions.Inc()
}

// SetSize sets the size gauge to n.
func (m *CacheMetrics) SetSize(n int) {
	m.Size.Set(float64(n))
}
