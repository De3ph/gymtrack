package cache

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
)

// metricValue reads the current float64 value of a prometheus Counter or Gauge
// (including GaugeFunc) via its dto.Metric payload. This avoids importing the
// prometheus testutil subpackage, which would pull an unrelated diff library
// (sergi/go-diff) into the module graph.
func metricValue(t *testing.T, metric prometheus.Metric) float64 {
	t.Helper()
	var pb dto.Metric
	if err := metric.Write(&pb); err != nil {
		t.Fatalf("read metric: %v", err)
	}
	if pb.Counter != nil {
		return pb.Counter.GetValue()
	}
	if pb.Gauge != nil {
		return pb.Gauge.GetValue()
	}
	t.Fatalf("metric is neither counter nor gauge")
	return 0
}

// simpleModel is a test model that gob can serialize (all exported fields).
type simpleModel struct {
	ID   int
	Name string
}

func newTestCache(t *testing.T) *GoCacheAdapter[simpleModel] {
	t.Helper()
	return NewGoCache[simpleModel](100*time.Millisecond, 50*time.Millisecond, 0, nil)
}

func TestCache_GetSet(t *testing.T) {
	c := newTestCache(t)
	val := simpleModel{ID: 1, Name: "test"}
	c.Set("key1", val)

	got, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, val, got)
}

func TestCache_Get_MissingKey(t *testing.T) {
	c := newTestCache(t)

	_, ok := c.Get("nonexistent")
	assert.False(t, ok)
}

func TestCache_TTL(t *testing.T) {
	c := NewGoCache[simpleModel](50*time.Millisecond, 50*time.Millisecond, 0, nil)

	c.Set("key1", simpleModel{ID: 1, Name: "ttl-test"})

	got, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, 1, got.ID)

	time.Sleep(120 * time.Millisecond)

	_, ok = c.Get("key1")
	assert.False(t, ok)
}

func TestCache_DeepCopy(t *testing.T) {
	c := newTestCache(t)

	original := simpleModel{ID: 1, Name: "original"}
	c.Set("key1", original)

	got, _ := c.Get("key1")
	got.Name = "mutated"

	got2, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, "original", got2.Name)
}

func TestCache_Invalidate(t *testing.T) {
	c := newTestCache(t)

	c.Set("key1", simpleModel{ID: 1})
	c.Invalidate("key1")

	_, ok := c.Get("key1")
	assert.False(t, ok)
}

func TestCache_InvalidatePrefix(t *testing.T) {
	c := newTestCache(t)

	c.Set("user:id:1", simpleModel{ID: 1})
	c.Set("user:id:2", simpleModel{ID: 2})
	c.Set("other:key", simpleModel{ID: 3})

	c.InvalidatePrefix("user:id")

	_, ok1 := c.Get("user:id:1")
	assert.False(t, ok1)
	_, ok2 := c.Get("user:id:2")
	assert.False(t, ok2)

	got, ok3 := c.Get("other:key")
	assert.True(t, ok3)
	assert.Equal(t, 3, got.ID)
}

func TestCache_Cleanup(t *testing.T) {
	c := NewGoCache[simpleModel](50*time.Millisecond, 50*time.Millisecond, 0, nil)

	c.Set("key1", simpleModel{ID: 1})

	got, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, 1, got.ID)

	time.Sleep(150 * time.Millisecond)

	_, ok = c.Get("key1")
	assert.False(t, ok)
}

func TestCache_Concurrent(t *testing.T) {
	c := newTestCache(t)

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			key := fmt.Sprintf("key%d", id)
			c.Set(key, simpleModel{ID: id})
			c.Get(key)
			c.Set(key, simpleModel{ID: id + 100})
			c.Get(key)
		}(i)
	}
	wg.Wait()
}

func TestCache_SetWithTTL(t *testing.T) {
	c := NewGoCache[simpleModel](time.Hour, time.Hour, 0, nil)

	c.SetWithTTL("key1", simpleModel{ID: 1}, 50*time.Millisecond)

	got, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, 1, got.ID)

	time.Sleep(100 * time.Millisecond)

	_, ok = c.Get("key1")
	assert.False(t, ok)
}

// gobUnencodable is a channel type, which encoding/gob cannot serialize at the
// top level. (gob supports complex numbers, but not channels or funcs.) It is
// used to verify that Set never stores a value whose deep copy fails and that
// Get returns a clean miss afterwards.
type gobUnencodable chan struct{}

func TestCache_DeepCopyError_NoStore(t *testing.T) {
	c := NewGoCache[gobUnencodable](100*time.Millisecond, 50*time.Millisecond, 0, nil)

	// gob cannot encode a channel, so the deep copy fails and Set is a no-op.
	c.Set("key", make(gobUnencodable))

	_, ok := c.Get("key")
	assert.False(t, ok, "Set of an unencodable value must not store anything")
}

func TestCache_Get_TypeAssertionMiss(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := NewCacheMetrics(reg, "test_ta")
	c := NewGoCache[simpleModel](time.Minute, time.Minute, 0, m)

	// Inject a value of the wrong concrete type directly into the underlying
	// cache, bypassing the typed Set path.
	c.inner.Set("bad", "not-a-simpleModel", time.Minute)

	_, ok := c.Get("bad")
	assert.False(t, ok)
	// A failed type assertion must count as a miss, never a hit.
	assert.Equal(t, 0.0, metricValue(t, m.Hits))
	assert.Equal(t, 1.0, metricValue(t, m.Misses))
}

func TestCache_Eviction_RespectsMaxEntries(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := NewCacheMetrics(reg, "test_evict")
	c := NewGoCache[simpleModel](time.Minute, time.Minute, 2, m) // cap = 2

	c.Set("k1", simpleModel{ID: 1})
	c.Set("k2", simpleModel{ID: 2})
	c.Set("k3", simpleModel{ID: 3}) // at capacity -> evicts one before storing

	assert.Equal(t, 2, c.inner.ItemCount(), "cache must not exceed maxEntries")
	assert.Equal(t, 1.0, metricValue(t, m.Evictions), "one eviction expected")
}

func TestCache_Eviction_ZeroIsUnbounded(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := NewCacheMetrics(reg, "test_unbounded")
	c := NewGoCache[simpleModel](time.Minute, time.Minute, 0, m) // unbounded

	for i := 0; i < 100; i++ {
		c.Set(fmt.Sprintf("k%d", i), simpleModel{ID: i})
	}

	assert.Equal(t, 100, c.inner.ItemCount(), "unbounded cache must keep all entries")
	assert.Equal(t, 0.0, metricValue(t, m.Evictions), "no evictions when unbounded")
}

func TestCacheMetrics_AtomicConcurrent(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := NewCacheMetrics(reg, "test_atomic")

	const goroutines = 50
	const hitsPer = 100
	const missesPer = 50

	var wg sync.WaitGroup
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for h := 0; h < hitsPer; h++ {
				m.RecordHit()
			}
			for mi := 0; mi < missesPer; mi++ {
				m.RecordMiss()
			}
		}()
	}
	wg.Wait()

	assert.Equal(t, float64(goroutines*hitsPer), metricValue(t, m.Hits))
	assert.Equal(t, float64(goroutines*missesPer), metricValue(t, m.Misses))
}

func TestCacheMetrics_HitRatio(t *testing.T) {
	reg := prometheus.NewRegistry()
	m := NewCacheMetrics(reg, "test_ratio")

	// Zero divisor: no hits or misses yet -> ratio must be 0.
	assert.Equal(t, 0.0, metricValue(t, m.HitRatio))

	m.RecordHit()
	m.RecordHit()
	m.RecordHit()
	m.RecordMiss()

	assert.Equal(t, 0.75, metricValue(t, m.HitRatio))
}
