package config

import (
	"log"
	"time"

	"github.com/couchbase/gocb/v2"
)

var (
	GlobalCluster *gocb.Cluster
	GlobalBucket  *gocb.Bucket
)

func ConnectCouchbase(cfg *Config) error {
	var err error
	GlobalCluster, err = gocb.Connect(cfg.CouchbaseConnectionString, gocb.ClusterOptions{
		Username: cfg.CouchbaseUsername,
		Password: cfg.CouchbasePassword,
	})
	if err != nil {
		return err
	}

	GlobalBucket = GlobalCluster.Bucket(cfg.CouchbaseBucket)

	err = GlobalBucket.WaitUntilReady(5*time.Second, nil)
	if err != nil {
		return err
	}

	log.Printf("Successfully connected to Couchbase cluster and opened bucket '%s'", cfg.CouchbaseBucket)
	return nil
}

func DisconnectCouchbase() {
	if GlobalCluster != nil {
		err := GlobalCluster.Close(nil)
		if err != nil {
			log.Printf("Failed to close Couchbase cluster connection: %v", err)
		} else {
			log.Println("Couchbase cluster connection closed.")
		}
	}
}
