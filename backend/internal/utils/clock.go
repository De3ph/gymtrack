package utils

import "time"

type Clock interface {
	Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time {
	return time.Now()
}

type FakeClock struct {
	currentTime time.Time
}

func NewFakeClock(t time.Time) *FakeClock {
	return &FakeClock{currentTime: t}
}

func (c *FakeClock) Now() time.Time {
	return c.currentTime
}

func (c *FakeClock) Set(t time.Time) {
	c.currentTime = t
}

func (c *FakeClock) Add(d time.Duration) {
	c.currentTime = c.currentTime.Add(d)
}