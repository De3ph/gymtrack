package migrate

import (
	"embed"
	"io/fs"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// MigrationsFS returns an fs.FS rooted at the "migrations" directory so it can
// be passed directly to iofs.New.
func MigrationsFS() fs.FS {
	sub, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		panic(err)
	}
	return sub
}
