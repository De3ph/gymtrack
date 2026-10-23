// Command import-exercises bulk-imports the open, public-domain exercise
// dataset from https://github.com/wrkout/exercises.json into the GymTrack
// exercise catalog.
//
// The dataset's schema differs from GymTrack's, so every row passes through a
// mapping layer before it touches the database:
//
//   - equipment (string)     -> equipment_definitions.id (FK resolved by code; unknown values fall back to "other")
//   - primaryMuscles (array) -> muscle_groups.id         (the schema allows a single FK; the first muscle that
//     maps to one of the 7 coarse groups wins, else "full-body")
//   - instructions (array)   -> instructions (text)      (steps joined with newlines)
//   - force / level / mechanic / secondaryMuscles -> dropped (no matching columns)
//
// The rows carry no demonstration media (the public dataset ships none), so
// media_url stays NULL and the frontend renders its placeholder. All imported
// rows are marked is_verified and created_by stays NULL (admin-owned catalog).
//
// Name is the idempotency key (exercises_name_unique). By default existing rows
// are left untouched; pass -update to refresh catalog rows whose
// created_by IS NULL (custom user exercises are never overwritten).
//
// Usage:
//
//	go run cmd/import-exercises/main.go -fetch            # download from GitHub and import
//	go run cmd/import-exercises/main.go -file saved.json  # import a previously saved/aggregated file
//	go run cmd/import-exercises/main.go -fetch -dry-run   # mapping report only, no DB writes
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"go.uber.org/zap"

	logger "gymtrack-backend/internal/infrastructure/log"
)

const (
	repo          = "wrkout/exercises.json"
	fetchWorkers  = 16
	httpTimeout   = 30 * time.Second
	defaultRunDSN = "postgres://postgres:123456@localhost:5432/gymtrack?sslmode=disable"
)

// wrkoutExercise mirrors one exercises/<Name>/exercise.json document.
type wrkoutExercise struct {
	Name             string   `json:"name"`
	Force            string   `json:"force"`
	Level            string   `json:"level"`
	Mechanic         string   `json:"mechanic"`
	Equipment        string   `json:"equipment"`
	PrimaryMuscles   []string `json:"primaryMuscles"`
	SecondaryMuscles []string `json:"secondaryMuscles"`
	Instructions     []string `json:"instructions"`
	Category         string   `json:"category"`
}

// catalogRow is one mapped row ready for the exercises table.
type catalogRow struct {
	Name          string
	Category      string
	MuscleCode    string
	EquipmentCode string
	Instructions  string
}

// maxSampleNames caps the example rows printed per unknown value in the report.
const maxSampleNames = 3

// report accumulates mapping problems for the end-of-run summary.
type report struct {
	unknownEquipment   map[string]int // raw dataset value -> occurrences
	unknownMuscles     map[string]int
	sampleNames        map[string][]string // unknown value -> up to maxSampleNames exercises, for manual inspection
	duplicatesInSource int
	skippedInvalid     int
}

// countPair is a sorted map entry for the report printers.
type countPair struct {
	value string
	count int
}

type options struct {
	File   string
	Fetch  bool
	Out    string
	DSN    string
	Update bool
	DryRun bool
}

// exerciseJSONPath matches exercises/<Exercise_Name>/exercise.json inside the
// repo tree listing.
var exerciseJSONPath = regexp.MustCompile(`^exercises/.+/exercise\.json$`)

func main() {
	logger.InitConsole()
	defer logger.Sync()

	if err := run(); err != nil {
		zap.L().Fatal("import-exercises failed", zap.Error(err))
	}
}

func run() error {
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../.env")
	_ = godotenv.Load("../../.env")

	opts := parseFlags()

	// 1. Obtain the raw dataset (network or file).
	raw, err := loadSource(opts)
	if err != nil {
		return err
	}

	entries, err := parseAggregate(raw)
	if err != nil {
		return fmt.Errorf("parse dataset: %w", err)
	}
	zap.L().Info("Parsed dataset", zap.Int("entries", len(entries)))

	// 2. Map onto GymTrack's taxonomy.
	stat := newReport()
	rows := mapAll(entries, stat)
	printMappingSummary(rows, stat)

	if opts.DryRun {
		fmt.Println("\n✓ dry run: no database writes performed")
		return nil
	}

	// 3. Connect and import.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	pool, err := pgxpool.New(ctx, opts.DSN)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping: %w", err)
	}
	zap.L().Info("Connected to database")

	inserted, touched, skipped, err := importRows(ctx, pool, rows, opts.Update)
	if err != nil {
		return err
	}

	fmt.Println("\n✓ Import completed")
	fmt.Printf("  Dataset rows: %d\n", len(rows))
	fmt.Printf("  Inserted:     %d\n", inserted)
	fmt.Printf("  Refreshed:    %d (-update)\n", touched)
	fmt.Printf("  Untouched:    %d (existing name; rerun with -update to refresh)\n", skipped)
	return nil
}

func parseFlags() options {
	var opts options

	flag.StringVar(&opts.File, "file", "", "aggregate exercises.json file to import from (wrkout build:json output format)")
	flag.BoolVar(&opts.Fetch, "fetch", false, "download the dataset from GitHub")
	flag.StringVar(&opts.Out, "out", "", "when fetching, also save the aggregate JSON copy to this path")
	flag.StringVar(&opts.DSN, "dsn", "", "PostgreSQL DSN (falls back to POSTGRES_DSN)")
	flag.BoolVar(&opts.Update, "update", false, "refresh existing catalog rows (only where created_by IS NULL)")
	flag.BoolVar(&opts.DryRun, "dry-run", false, "parse and map only; report problems without writing to the database")
	flag.Parse()

	if opts.DSN == "" {
		opts.DSN = os.Getenv("POSTGRES_DSN")
	}
	if opts.DSN == "" && !opts.DryRun {
		// Same dev fallback cmd/seed uses, so a bare run works locally.
		opts.DSN = defaultRunDSN
	}
	return opts
}

// loadSource reads the dataset from -file, downloads it from GitHub when
// -fetch is passed, or reports a usage error when neither is available.
func loadSource(opts options) ([]byte, error) {
	switch {
	case opts.File != "":
		data, err := os.ReadFile(opts.File)
		if err != nil {
			return nil, fmt.Errorf("read -file: %w", err)
		}
		return data, nil

	case opts.Fetch:
		data, err := fetchAggregate()
		if err != nil {
			return nil, fmt.Errorf("fetch from GitHub: %w", err)
		}
		if opts.Out != "" {
			if err := os.WriteFile(opts.Out, data, 0o644); err != nil {
				return nil, fmt.Errorf("write -out: %w", err)
			}
			zap.L().Info("Saved aggregate copy", zap.String("path", opts.Out))
		}
		return data, nil

	default:
		return nil, fmt.Errorf("provide -file exercises.json or pass -fetch")
	}
}

// parseAggregate decodes the dataset in any of the shapes its build output may
// appear in: an array of exercise objects, an envelope {"exercises": [...]},
// or an object keyed by exercise name with each value an exercise object.
func parseAggregate(data []byte) ([]wrkoutExercise, error) {
	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return nil, fmt.Errorf("dataset is empty")
	}

	switch trimmed[0] {
	case '[':
		var entries []wrkoutExercise
		if err := json.Unmarshal(trimmed, &entries); err != nil {
			return nil, err
		}
		return entries, nil

	case '{':
		var envelope struct {
			Exercises []wrkoutExercise `json:"exercises"`
		}
		if err := json.Unmarshal(trimmed, &envelope); err == nil && len(envelope.Exercises) > 0 {
			return envelope.Exercises, nil
		}
		var keyed map[string]wrkoutExercise
		if err := json.Unmarshal(trimmed, &keyed); err != nil {
			return nil, fmt.Errorf("unrecognised dataset shape")
		}
		entries := make([]wrkoutExercise, 0, len(keyed))
		for name, ex := range keyed {
			if strings.TrimSpace(ex.Name) == "" {
				ex.Name = name
			}
			entries = append(entries, ex)
		}
		return entries, nil

	default:
		return nil, fmt.Errorf("unrecognised dataset shape")
	}
}

// ---------------------------------------------------------------------------
// GitHub fetching
// ---------------------------------------------------------------------------

// fetchAggregate lists exercises/<Name>/exercise.json files via the GitHub
// trees API and downloads each one from raw.githubusercontent.com with a
// bounded worker pool, returning the merged JSON document.
func fetchAggregate() ([]byte, error) {
	paths, err := listExercisePaths()
	if err != nil {
		return nil, err
	}
	zap.L().Info("Found exercise files on GitHub", zap.Int("count", len(paths)))

	client := &http.Client{Timeout: httpTimeout}
	results := make([]wrkoutExercise, len(paths))
	problems := make([]error, len(paths))

	sem := make(chan struct{}, fetchWorkers)
	var wg sync.WaitGroup
	for i, p := range paths {
		wg.Add(1)
		go func(idx int, path string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			url := "https://raw.githubusercontent.com/" + repo + "/HEAD/" + path
			resp, err := client.Get(url)
			if err != nil {
				problems[idx] = fmt.Errorf("get %s: %w", url, err)
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				problems[idx] = fmt.Errorf("get %s: status %d", url, resp.StatusCode)
				return
			}
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				problems[idx] = fmt.Errorf("read %s: %w", url, err)
				return
			}
			var ex wrkoutExercise
			if err := json.Unmarshal(body, &ex); err != nil {
				problems[idx] = fmt.Errorf("parse %s: %w", url, err)
				return
			}
			// Folder name carries the canonical name; fall back to it when the
			// document lacks the "name" field.
			if strings.TrimSpace(ex.Name) == "" {
				dir := strings.TrimPrefix(path, "exercises/")
				if slash := strings.Index(dir, "/"); slash >= 0 {
					dir = dir[:slash]
				}
				ex.Name = strings.ReplaceAll(dir, "_", " ")
			}
			results[idx] = ex
		}(i, p)
	}
	wg.Wait()

	for _, err := range problems {
		if err != nil {
			return nil, fmt.Errorf("download failed: %w", err)
		}
	}

	merged, err := json.Marshal(results)
	if err != nil {
		return nil, fmt.Errorf("merge results: %w", err)
	}
	return merged, nil
}

// listExercisePaths returns the repo paths whose file is one exercise
// document, resolved from the git tree API (a single rate-limited call —
// unauthenticated GitHub allows only 60/hour, which one import consumes).
func listExercisePaths() ([]string, error) {
	client := &http.Client{Timeout: httpTimeout}

	req, err := http.NewRequest(http.MethodGet,
		"https://api.github.com/repos/"+repo+"/git/trees/HEAD?recursive=1", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github trees API returned status %d", resp.StatusCode)
	}

	var tree struct {
		Tree []struct {
			Path string `json:"path"`
			Type string `json:"type"`
		} `json:"tree"`
		Truncated bool `json:"truncated"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tree); err != nil {
		return nil, err
	}
	if tree.Truncated {
		zap.L().Warn("GitHub tree listing was truncated; the dataset may be incomplete")
	}

	paths := make([]string, 0, 1024)
	for _, node := range tree.Tree {
		if node.Type == "blob" && exerciseJSONPath.MatchString(node.Path) {
			paths = append(paths, node.Path)
		}
	}
	if len(paths) == 0 {
		return nil, fmt.Errorf("no exercise files found in the repository tree")
	}
	return paths, nil
}

// ---------------------------------------------------------------------------
// Mapping onto GymTrack's taxonomy
// ---------------------------------------------------------------------------

// equipmentMap translates the dataset's equipment vocabulary onto the
// equipment_definitions codes seeded by migration 003. Unknown raw values map
// to defaultEquipmentCode and get reported so this table can be extended.
var equipmentMap = map[string]string{
	"barbell":          "barbell",
	"ez barbell":       "barbell",
	"e-z curl bar":     "barbell",
	"dumbbell":         "dumbbell",
	"machine":          "machine",
	"leverage machine": "machine",
	"cable":            "cable",
	"cables":           "cable",
	"bodyweight":       "bodyweight",
	"body weight":      "bodyweight",
	"body only":        "bodyweight",
	"none":             "bodyweight",
	"kettlebell":       "kettlebell",
	"kettlebells":      "kettlebell",
	"band":             "resistance-band",
	"bands":            "resistance-band",
	"resistance band":  "resistance-band",
	"resistance bands": "resistance-band",
	"other":            "other",
	"medicine ball":    "other",
	"exercise ball":    "other",
	"foam roll":        "other",
	"(empty)":          "bodyweight",
}

// muscleMap collapses the dataset's fine-grained muscles onto the 7 coarse
// muscle_groups codes. Unmapped values fall back to defaultMuscleCode.
var muscleMap = map[string]string{
	"chest":       "chest",
	"lats":        "back",
	"middle back": "back",
	"lower back":  "back",
	"traps":       "back",
	"neck":        "back",
	"shoulders":   "shoulders",
	"biceps":      "arms",
	"triceps":     "arms",
	"forearms":    "arms",
	"quadriceps":  "legs",
	"hamstrings":  "legs",
	"glutes":      "legs",
	"calves":      "legs",
	"adductors":   "legs",
	"abductors":   "legs",
	"abs":         "core",
	"abdominals":  "core",
}

const (
	defaultMuscleCode    = "full-body"
	defaultEquipmentCode = "other"
)

func newReport() *report {
	return &report{
		unknownEquipment: make(map[string]int),
		unknownMuscles:   make(map[string]int),
	}
}

// mapAll converts every dataset entry into a catalog row, deduplicating by
// name (the catalog's unique key) and recording mapping problems for the report.
func mapAll(entries []wrkoutExercise, stat *report) []catalogRow {
	rows := make([]catalogRow, 0, len(entries))
	seen := make(map[string]bool, len(entries))

	for _, entry := range entries {
		name := strings.TrimSpace(entry.Name)
		if name == "" {
			stat.skippedInvalid++
			continue
		}
		if seen[name] {
			stat.duplicatesInSource++
			continue
		}
		seen[name] = true

		category := strings.ToLower(strings.TrimSpace(entry.Category))
		if category == "" {
			category = "strength"
		}

		// Normalise the raw equipment value; missing equipment is reported as
		// "(empty)" so it has a stable name in the mapping table and report.
		rawEquipment := strings.TrimSpace(entry.Equipment)
		if rawEquipment == "" {
			rawEquipment = "(empty)"
		}
		equipmentCode, ok := equipmentMap[strings.ToLower(rawEquipment)]
		if !ok {
			stat.unknownEquipment[rawEquipment]++
			stat.addSample(rawEquipment, name)
			equipmentCode = defaultEquipmentCode
		}

		muscleCode, ok := pickMuscle(entry, stat)
		if !ok {
			// Fallback keeps the row (every exercise must land in a group);
			// sample the raw muscle so the mapping table can be extended.
			if len(entry.PrimaryMuscles) > 0 {
				stat.addSample(strings.TrimSpace(entry.PrimaryMuscles[0]), name)
			} else {
				stat.addSample("(no muscles)", name)
			}
			muscleCode = defaultMuscleCode
		}

		rows = append(rows, catalogRow{
			Name:          name,
			Category:      category,
			MuscleCode:    muscleCode,
			EquipmentCode: equipmentCode,
			Instructions:  strings.Join(nonEmpty(entry.Instructions), "\n"),
		})
	}
	return rows
}

// pickMuscle returns the first coarse group code the exercise's muscles map
// to. Primary muscles are preferred; secondary muscles are only consulted when
// no primary muscle maps (GymTrack stores a single muscle group per exercise).
// Unmapped muscle names are counted on the report in encounter order.
func pickMuscle(entry wrkoutExercise, stat *report) (string, bool) {
	for _, muscles := range [][]string{entry.PrimaryMuscles, entry.SecondaryMuscles} {
		for _, raw := range muscles {
			code, ok := muscleMap[strings.ToLower(strings.TrimSpace(raw))]
			if ok {
				return code, true
			}
			stat.unknownMuscles[strings.TrimSpace(raw)]++
		}
	}
	return "", false
}

func nonEmpty(values []string) []string {
	out := make([]string, 0, len(values))
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			out = append(out, v)
		}
	}
	return out
}

// addSample records an example exercise for the unknown value, capped so the
// report stays readable.
func (r *report) addSample(unknown, name string) {
	if r.sampleNames == nil {
		r.sampleNames = make(map[string][]string)
	}
	if samples := r.sampleNames[unknown]; len(samples) < maxSampleNames {
		r.sampleNames[unknown] = append(samples, name)
	}
}

// printMappingSummary writes the post-mapping report, including unknown raw
// values so the mapping tables above can be extended instead of guessing.
func printMappingSummary(rows []catalogRow, stat *report) {
	fmt.Printf("\nMapped %d rows", len(rows))
	if stat.skippedInvalid > 0 {
		fmt.Printf(" (skipped %d invalid)", stat.skippedInvalid)
	}
	if stat.duplicatesInSource > 0 {
		fmt.Printf(" (dropped %d duplicate names)", stat.duplicatesInSource)
	}
	fmt.Println()

	if len(stat.unknownEquipment) > 0 {
		fmt.Printf("  equipment values falling back to %s:\n", defaultEquipmentCode)
		for _, pair := range sortedCounts(stat.unknownEquipment) {
			fmt.Printf("    %q: %d\n", pair.value, pair.count)
		}
	}
	if len(stat.unknownMuscles) > 0 {
		fmt.Printf("  muscle values falling back to %s:\n", defaultMuscleCode)
		for _, pair := range sortedCounts(stat.unknownMuscles) {
			fmt.Printf("    %q: %d\n", pair.value, pair.count)
		}
	}

	if len(stat.sampleNames) > 0 {
		fmt.Println("  examples of fallback rows:")
		for _, value := range sortedKeys(stat.sampleNames) {
			fmt.Printf("    %q: %s\n", value, strings.Join(stat.sampleNames[value], ", "))
		}
	}

	// Per-group distribution to eyeball whether the mapping looks sane.
	byGroup := make(map[string]int)
	for _, row := range rows {
		byGroup[row.MuscleCode]++
	}
	fmt.Println("  muscle group distribution:")
	for _, pair := range sortedCounts(byGroup) {
		fmt.Printf("    %-12s %d\n", pair.value, pair.count)
	}
}

// importRows resolves FK ids by code (never by hard-coded id, so seeding order
// does not matter), then upserts every resolved row.
func importRows(ctx context.Context, pool *pgxpool.Pool, rows []catalogRow, update bool) (inserted, touched, skipped int, err error) {
	muscleIDs, err := loadLookup(ctx, pool, "muscle_groups")
	if err != nil {
		return 0, 0, 0, fmt.Errorf("load muscle_groups: %w", err)
	}
	equipmentIDs, err := loadLookup(ctx, pool, "equipment_definitions")
	if err != nil {
		return 0, 0, 0, fmt.Errorf("load equipment_definitions: %w", err)
	}

	// The fallback codes are hard requirements because unmapped values land on
	// them; fail fast on a database that was never seeded.
	if _, ok := muscleIDs[defaultMuscleCode]; !ok {
		return 0, 0, 0, fmt.Errorf("muscle_groups is missing the %q code; run migrations/cmd/seed first", defaultMuscleCode)
	}
	if _, ok := equipmentIDs[defaultEquipmentCode]; !ok {
		return 0, 0, 0, fmt.Errorf("equipment_definitions is missing the %q code; run migrations/cmd/seed first", defaultEquipmentCode)
	}

	conflictClause := "DO NOTHING"
	if update {
		// Refresh catalog rows only; custom exercises created by real users keep
		// their data even on a name collision.
		conflictClause = `DO UPDATE SET
			category = EXCLUDED.category,
			muscle_group_id = EXCLUDED.muscle_group_id,
			equipment_id = EXCLUDED.equipment_id,
			instructions = EXCLUDED.instructions,
			is_verified = EXCLUDED.is_verified
		WHERE exercises.created_by IS NULL`
	}

	query := `INSERT INTO exercises
		(name, category, muscle_group_id, equipment_id, instructions, is_verified, created_at)
		VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
		ON CONFLICT (name) ` + conflictClause

	for _, row := range rows {
		muscleID, ok := muscleIDs[row.MuscleCode]
		if !ok {
			return inserted, touched, skipped, fmt.Errorf("muscle group code %q missing in muscle_groups", row.MuscleCode)
		}
		equipmentID, ok := equipmentIDs[row.EquipmentCode]
		if !ok {
			return inserted, touched, skipped, fmt.Errorf("equipment code %q missing in equipment_definitions", row.EquipmentCode)
		}

		tag, err := pool.Exec(ctx, query, row.Name, row.Category, muscleID, equipmentID, row.Instructions)
		if err != nil {
			return inserted, touched, skipped, fmt.Errorf("insert exercise %q: %w", row.Name, err)
		}
		if tag.RowsAffected() == 0 {
			skipped++
		} else if update {
			// With DO UPDATE a new insert and a refresh are indistinguishable.
			touched++
		} else {
			inserted++
		}
	}
	return inserted, touched, skipped, nil
}

// loadLookup returns code -> id for a lookup table, normalising codes to
// lowercase so the mapping tables above do not depend on seed casing.
func loadLookup(ctx context.Context, pool *pgxpool.Pool, table string) (map[string]int, error) {
	rows, err := pool.Query(ctx, fmt.Sprintf("SELECT code, id FROM %s", table))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]int)
	for rows.Next() {
		var code string
		var id int
		if err := rows.Scan(&code, &id); err != nil {
			return nil, err
		}
		out[strings.ToLower(code)] = id
	}
	return out, rows.Err()
}

// sortedKeys returns map keys in deterministic (ascending) order.
func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

// sortedCounts orders count maps by descending count (then value) so the
// dominant problems appear first in the report.
func sortedCounts(counts map[string]int) []countPair {
	pairs := make([]countPair, 0, len(counts))
	for value, count := range counts {
		pairs = append(pairs, countPair{value, count})
	}
	sort.Slice(pairs, func(i, j int) bool {
		if pairs[i].count != pairs[j].count {
			return pairs[i].count > pairs[j].count
		}
		return pairs[i].value < pairs[j].value
	})
	return pairs
}
