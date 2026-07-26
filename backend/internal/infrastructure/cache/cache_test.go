package cache

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// simpleModel is a test model that gob can serialize (all exported fields).
type simpleModel struct {
	ID   int
	Name string
}

func newTestCache(t *testing.T) *GoCacheAdapter[simpleModel] {
	t.Helper()
	return NewGoCache[simpleModel](100*time.Millisecond, 50*time.Millisecond, nil)
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
	c := NewGoCache[simpleModel](50*time.Millisecond, 50*time.Millisecond, nil)

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
	c := NewGoCache[simpleModel](50*time.Millisecond, 50*time.Millisecond, nil)

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
	c := NewGoCache[simpleModel](time.Hour, time.Hour, nil)

	c.SetWithTTL("key1", simpleModel{ID: 1}, 50*time.Millisecond)

	got, ok := c.Get("key1")
	assert.True(t, ok)
	assert.Equal(t, 1, got.ID)

	time.Sleep(100 * time.Millisecond)

	_, ok = c.Get("key1")
	assert.False(t, ok)
}
