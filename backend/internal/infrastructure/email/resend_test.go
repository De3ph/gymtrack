package email

import (
	"strings"
	"testing"
)

func TestBuildResetPasswordHTML(t *testing.T) {
	got := buildResetPasswordHTML(`https://gymtrack.app/reset-password?token=a&b="x"`)

	if strings.Contains(got, resetURLPlaceholder) {
		t.Error("template placeholder was not substituted")
	}
	if got := strings.Count(got, "https://gymtrack.app/reset-password"); got != 2 {
		t.Errorf("expected reset URL in button href and fallback text, found %d occurrences", got)
	}
	// html.EscapeString must neutralize quotes/ampersands before injection.
	if !strings.Contains(got, `href="https://gymtrack.app/reset-password?token=a&amp;b=&#34;x&#34;"`) {
		t.Error("URL not HTML-escaped in button href")
	}
	// Scoreboard register sanity: compiled template must keep its inlined styles.
	for _, want := range []string{
		"box-sizing:border-box",               // Button box-border
		"rgb(220,38,38)",                      // primary red-600
		"border-style:solid;border-width:1px", // hairline panel
	} {
		if !strings.Contains(got, want) {
			t.Errorf("compiled template missing %q", want)
		}
	}
}
